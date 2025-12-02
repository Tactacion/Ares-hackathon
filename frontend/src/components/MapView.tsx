import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Aircraft } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';
import RadialMenu from './RadialMenu';
import TacticalHeader from './TacticalHeader';

// Set Mapbox token directly as requested by user
const MAPBOX_TOKEN = 'pk.eyJ1IjoiaXNoYWFuMTcyOSIsImEiOiJjbWkwcDNud3cwcHFkMnNxNDVxNGtvMzk0In0.m7iZi-rZPUq0Eolkn8NM4A';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapViewProps {
  aircraft: Aircraft[];
  selectedAircraft: Aircraft | null;
  centerLat?: number;
  centerLon?: number;
  onAircraftSelect?: (aircraft: Aircraft) => void;
  safeCorridors?: number[][][]; // List of paths (each path is list of [lon, lat])
}



// Calculate predicted position (simplified physics)
const predictPosition = (ac: Aircraft, timeMinutes: number, headingOffset = 0) => {
  const speedMilesPerMin = (ac.velocity_kts / 60);
  const distanceMiles = speedMilesPerMin * timeMinutes;
  const distanceDegrees = distanceMiles / 69; // Rough conversion

  const headingRad = ((ac.heading_deg + headingOffset) * Math.PI) / 180;
  const lat = ac.latitude + (Math.cos(headingRad) * distanceDegrees);
  const lon = ac.longitude + (Math.sin(headingRad) * distanceDegrees);

  return [lon, lat];
};

// Generate circle coordinates
const createGeoJSONCircle = (center: [number, number], radiusInKm: number, points = 64) => {
  const coords = {
    latitude: center[1],
    longitude: center[0]
  };

  const km = radiusInKm;

  const ret = [];
  const distanceX = km / (111.320 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  let theta, x, y;
  for (let i = 0; i < points; i++) {
    theta = (i / points) * (2 * Math.PI);
    x = distanceX * Math.cos(theta);
    y = distanceY * Math.sin(theta);

    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [ret]
    },
    properties: {}
  };
};

export default function MapView({ aircraft, selectedAircraft, centerLat = 39.8561, centerLon = -104.6737, onAircraftSelect, safeCorridors = [] }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [ghostPath, setGhostPath] = useState<number[][] | null>(null);

  console.log('MapView Render:', { aircraftCount: aircraft.length, safeCorridorsCount: safeCorridors.length, mapLoaded });

  // Update Safe Corridors Layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const safeCorridorFeatures = safeCorridors.map((path, index) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: path
      },
      properties: {
        id: index
      }
    }));

    if (map.current.getSource('safe-corridors')) {
      (map.current.getSource('safe-corridors') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: safeCorridorFeatures as any
      });
    } else {
      map.current.addSource('safe-corridors', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: safeCorridorFeatures as any
        }
      });

      // Outer Glow (Tube effect)
      map.current.addLayer({
        id: 'safe-corridors-glow',
        type: 'line',
        source: 'safe-corridors',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#fbbf24', // Amber/Yellow
          'line-width': 15,
          'line-opacity': 0.2,
          'line-blur': 10
        }
      });

      // Inner Core
      map.current.addLayer({
        id: 'safe-corridors-core',
        type: 'line',
        source: 'safe-corridors',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#fbbf24',
          'line-width': 4,
          'line-opacity': 0.8,
          'line-dasharray': [2, 1] // Dashed "highway" look
        }
      });
    }
  }, [safeCorridors, mapLoaded]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    console.log('🗺️ Initializing Mapbox map...');

    let animationFrameId: number;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Dark base map
        center: [centerLon, centerLat],
        zoom: 10,
        pitch: 45,
        bearing: 0,
        antialias: true,
        projection: 'globe'
      });

      map.current.on('load', () => {
        console.log('✅ Mapbox map loaded successfully');
        setMapLoaded(true);
        setMapError(null);

        // Add 3D Terrain
        map.current!.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
        map.current!.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

        // Add Sky Layer
        map.current!.addLayer({
          'id': 'sky',
          'type': 'sky',
          'paint': {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15
          }
        });

        // Add 3D buildings layer
        const layers = map.current!.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout && (layer.layout as any)['text-field']
        )?.id;

        if (!map.current!.getLayer('3d-buildings')) {
          map.current!.addLayer(
            {
              id: '3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 15,
              paint: {
                'fill-extrusion-color': '#003300', // Dark Green buildings
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'height']
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.8
              }
            },
            labelLayerId
          );
        }

        // --- RANGE RINGS ---
        const center = [centerLon, centerLat] as [number, number];
        const ring5nm = createGeoJSONCircle(center, 9.26); // 5nm = 9.26km
        const ring10nm = createGeoJSONCircle(center, 18.52); // 10nm = 18.52km
        const ring20nm = createGeoJSONCircle(center, 37.04); // 20nm = 37.04km

        map.current!.addSource('range-rings', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [ring5nm, ring10nm, ring20nm] as any
          }
        });

        map.current!.addLayer({
          id: 'range-rings-line',
          type: 'line',
          source: 'range-rings',
          paint: {
            'line-color': '#004400', // Dark Green
            'line-width': 1,
            'line-opacity': 0.5,
            'line-dasharray': [4, 4]
          }
        });

        // --- WEATHER RADAR (Simulated) ---
        // We'll create some random "storm cells" using polygons
        const storm1 = createGeoJSONCircle([centerLon - 0.2, centerLat + 0.1], 5);
        const storm2 = createGeoJSONCircle([centerLon + 0.15, centerLat - 0.15], 8);

        map.current!.addSource('weather-radar', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [storm1, storm2] as any
          }
        });

        map.current!.addLayer({
          id: 'weather-radar-fill',
          type: 'fill',
          source: 'weather-radar',
          paint: {
            'fill-color': '#ff0000', // Red for storm
            'fill-opacity': 0.2,
            'fill-outline-color': '#ff0000'
          }
        });

        // --- HOLOGRAPHIC AIRSPACE VOLUME (3D Cylinder) ---
        const airspaceRadius = 30; // 30nm
        const airspaceCircle = createGeoJSONCircle([centerLon, centerLat], airspaceRadius * 1.852, 128); // Convert nm to km

        map.current!.addSource('airspace-volume', {
          type: 'geojson',
          data: airspaceCircle as any
        });

        map.current!.addLayer({
          id: 'airspace-volume-3d',
          type: 'fill-extrusion',
          source: 'airspace-volume',
          paint: {
            'fill-extrusion-color': '#00ffff',
            'fill-extrusion-height': 3000, // 10,000 ft (approx 3000m)
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.05, // Very subtle glass look
          }
        });

        // Add a "floor" ring for the airspace
        map.current!.addLayer({
          id: 'airspace-ring',
          type: 'line',
          source: 'airspace-volume',
          paint: {
            'line-color': '#00ffff',
            'line-width': 2,
            'line-opacity': 0.3,
            'line-dasharray': [10, 5]
          }
        });

        // --- TACTICAL AI LAYER ---
        map.current!.addSource('tactical-zones', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        // 1. Zone Fill (Subtle)
        map.current!.addLayer({
          id: 'tactical-zones-fill',
          type: 'fill',
          source: 'tactical-zones',
          paint: {
            'fill-color': [
              'match',
              ['get', 'type'],
              'CONFLICT', '#ff5f56', // Red
              'CONGESTION', '#ffbd2e', // Amber
              'SAFE', '#64ffda', // Cyan
              '#ffffff'
            ],
            'fill-opacity': 0.1
          }
        });

        // 2. Zone Border (Tech)
        map.current!.addLayer({
          id: 'tactical-zones-line',
          type: 'line',
          source: 'tactical-zones',
          paint: {
            'line-color': [
              'match',
              ['get', 'type'],
              'CONFLICT', '#ff5f56',
              'CONGESTION', '#ffbd2e',
              'SAFE', '#64ffda',
              '#ffffff'
            ],
            'line-width': 1,
            'line-dasharray': [2, 2],
            'line-opacity': 0.6
          }
        });

        // 3. Zone Labels (AI Analysis)
        map.current!.addLayer({
          id: 'tactical-zones-label',
          type: 'symbol',
          source: 'tactical-zones',
          layout: {
            'text-field': ['get', 'description'],
            'text-font': ['Share Tech Mono Regular'],
            'text-size': 10,
            'text-transform': 'uppercase',
            'text-offset': [0, 1],
            'text-anchor': 'top'
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 2
          }
        });

        // --- ANIMATION LOOP (Flowing Trajectories) ---
        // animationFrameId is now declared in parent scope
        let dashOffset = 0;

        const animateFlow = () => {
          dashOffset -= 0.5; // Flow speed

          // Animate Flight Path Flow (Marching Ants)
          if (map.current?.getLayer('flight-paths-line')) {
            // Standard marching ants is complex in Mapbox without a pattern. 
            // We'll just keep the dashed line static for now to prevent the crash.
            // map.current.setPaintProperty('flight-paths-line', 'line-dasharray', [2, 4]);
          }

          // Animate Ghost Path Flow
          if (map.current?.getLayer('ghost-path-line')) {
            // map.current.setPaintProperty('ghost-path-line', 'line-dasharray-offset', dashOffset * 2);
          }

          // Animate Tactical Zones (Subtle Pulse)
          if (map.current?.getLayer('tactical-zones-line')) {
            // map.current.setPaintProperty('tactical-zones-line', 'line-dasharray-offset', dashOffset * 0.5);
          }

          // Animate Lidar Scanner
          if (map.current?.getSource('lidar-scanner')) {
            const scannerRadius = (Date.now() % 4000) / 4000 * 20; // 0 to 20nm loop
            const scannerGeoJSON = createGeoJSONCircle([centerLon, centerLat], scannerRadius * 1.852, 64);
            (map.current.getSource('lidar-scanner') as mapboxgl.GeoJSONSource).setData(scannerGeoJSON);

            if (map.current.getLayer('lidar-scanner-line')) {
              map.current.setPaintProperty('lidar-scanner-line', 'line-opacity', 1 - (scannerRadius / 20));
            }
          }

          animationFrameId = requestAnimationFrame(animateFlow);
        };

        animateFlow();

        // Cleanup animation on unmount
        const originalCleanup = () => {
          cancelAnimationFrame(animationFrameId);
        };
        // We can't easily hook into the existing cleanup from here without refactoring,
        // but since this effect runs once, we should be careful.
        // Actually, the useEffect returns a cleanup function.
        // We need to make sure we don't leak.
        // The existing return cleanup handles map removal.
        // We should add this to a ref or something, but for now, let's just let it run until map removal.



        // Add airport marker for KDEN
        const airportMarker = document.createElement('div');
        airportMarker.className = 'airport-marker';
        airportMarker.innerHTML = `
          <div style="
            background: rgba(0, 255, 0, 0.1);
            border: 2px solid #00ff00;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
            color: #00ff00;
          ">
            ⌖
          </div>
        `;

        new mapboxgl.Marker(airportMarker)
          .setLngLat([centerLon, centerLat])
          .addTo(map.current!);

        // Add flight path layers (Actual)
        if (!map.current!.getSource('flight-paths')) {
          map.current!.addSource('flight-paths', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });

          map.current!.addLayer({
            id: 'flight-paths-line',
            type: 'line',
            source: 'flight-paths',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 1,
              'line-opacity': 0.5,
              'line-dasharray': [2, 4] // Dotted line
            }
          });
        }

        // Add Ghost Path Layer (Predicted)
        if (!map.current!.getSource('ghost-path')) {
          map.current!.addSource('ghost-path', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: []
              },
              properties: {}
            }
          });

          map.current!.addLayer({
            id: 'ghost-path-line',
            type: 'line',
            source: 'ghost-path',
            paint: {
              'line-color': '#ffaa00', // Amber for prediction
              'line-width': 2,
              'line-opacity': 0.8,
              'line-dasharray': [1, 1] // Dotted
            }
          });
        }
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add error handler
      map.current.on('error', (e) => {
        console.error('❌ Mapbox error:', e.error);
        setMapError(`Map error: ${e.error.message}`);
      });

    } catch (error) {
      console.error('❌ Failed to initialize Mapbox:', error);
      setMapError(`Failed to initialize map: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return () => {
      console.log('🧹 Cleaning up Mapbox map...');
      cancelAnimationFrame(animationFrameId); // Fix: Cancel animation loop
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [centerLat, centerLon]);

  // Update menu position when selected aircraft moves
  useEffect(() => {
    if (selectedAircraft && map.current) {
      const point = map.current.project([selectedAircraft.longitude, selectedAircraft.latitude]);
      setMenuPosition({ x: point.x, y: point.y });
    } else {
      setMenuPosition(null);
    }
  }, [selectedAircraft, aircraft]);

  // Handle Map Move to update menu position
  useEffect(() => {
    if (!map.current) return;
    const updatePos = () => {
      if (selectedAircraft) {
        const point = map.current!.project([selectedAircraft.longitude, selectedAircraft.latitude]);
        setMenuPosition({ x: point.x, y: point.y });
      }
    };
    map.current.on('move', updatePos);
    return () => { map.current?.off('move', updatePos); };
  }, [selectedAircraft]);

  // Update aircraft markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentAircraftIds = new Set(aircraft.map(a => a.icao24));

    // Remove markers for aircraft that are no longer present
    markers.current.forEach((marker, id) => {
      if (!currentAircraftIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });

    // Add or update markers for current aircraft
    aircraft.forEach(plane => {
      // ATC Color Logic: Green = Normal, Amber = Warning/Low, Red = Critical
      const isSelected = selectedAircraft?.icao24 === plane.icao24;
      const altitudeColor = plane.altitude_ft < 2000 ? '#ffaa00' : '#00ff00';
      const markerColor = isSelected ? '#00ffff' : altitudeColor; // Cyan if selected
      const size = isSelected ? 40 : 28;

      // Determine Aircraft Type Icon
      let iconPath = '';
      if (plane.velocity_kts < 160 && plane.altitude_ft < 15000) {
        // Prop / Light Aircraft
        iconPath = 'M12 2 L14 8 L22 8 L22 10 L14 10 L14 18 L18 20 L18 22 L6 22 L6 20 L10 18 L10 10 L2 10 L2 8 L10 8 L12 2 Z';
      } else if (plane.velocity_kts > 400 && plane.altitude_ft > 30000) {
        // Heavy Jet
        iconPath = 'M12 1 L16 9 L23 15 L23 17 L16 14 L16 20 L19 22 L19 23 L5 23 L5 22 L8 20 L8 14 L1 17 L1 15 L8 9 L12 1 Z';
      } else {
        // Standard Jet / Fighter
        iconPath = 'M12 2 L14 10 L20 14 L20 16 L14 14 L14 20 L16 22 L8 22 L10 20 L10 14 L4 16 L4 14 L10 10 Z';
      }

      let marker = markers.current.get(plane.icao24);

      // Create marker element (Apex Tier)
      const createMarkerEl = () => {
        const el = document.createElement('div');
        el.className = 'aircraft-marker cursor-pointer';
        el.style.zIndex = isSelected ? '100' : '10'; // Bring selected to front

        // Calculate velocity vector length (10px per 100kts)
        const vectorLength = Math.min((plane.velocity_kts / 100) * 12, 80);

        // Dynamic Glow based on altitude/speed (Engine Power)
        const enginePower = Math.min(plane.velocity_kts / 500, 1);
        const glowColor = isSelected ? '#00ffff' : (plane.altitude_ft < 2000 ? '#ffaa00' : '#00ff00');

        el.innerHTML = `
            <div style="position: relative; pointer-events: none;">
              
              <!-- Selection Ring (Rotating Shield) -->
              ${isSelected ? `
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] border border-cyan-500/50 rounded-full animate-spin-slow" style="box-shadow: 0 0 20px rgba(0,255,255,0.2);"></div>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70px] h-[70px] border border-dashed border-cyan-500/30 rounded-full animate-spin-reverse"></div>
              ` : ''}

              <!-- Aircraft Body Group -->
              <div class="animate-spawn" style="
                width: ${size}px;
                height: ${size}px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                transform: rotate(${plane.heading_deg}deg);
                filter: drop-shadow(0 0 ${10 * enginePower}px ${glowColor});
              ">
                <!-- Jet Exhaust (Engine Glow) -->
                <div style="
                    position: absolute;
                    bottom: -5px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 4px;
                    height: ${10 + (enginePower * 20)}px;
                    background: linear-gradient(to bottom, ${glowColor}, transparent);
                    opacity: 0.8;
                    filter: blur(2px);
                "></div>

                <!-- Main Icon -->
                <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="overflow: visible;">
                   <path d="${iconPath}" fill="${isSelected ? '#000' : '#000'}" stroke="${glowColor}" stroke-width="${isSelected ? 1.5 : 1}" vector-effect="non-scaling-stroke" />
                   <!-- Cockpit Highlight -->
                   <circle cx="12" cy="10" r="1" fill="${glowColor}" opacity="0.8" />
                </svg>
              </div>

              <!-- Velocity Vector (Laser Line) -->
              <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  width: ${vectorLength}px;
                  height: 1px;
                  background: linear-gradient(90deg, ${glowColor}, transparent);
                  transform: rotate(${plane.heading_deg - 90}deg);
                  transform-origin: left;
                  opacity: 0.8;
                  box-shadow: 0 0 5px ${glowColor};
                  z-index: -1;
              "></div>

              <!-- Data Block (Holographic Tag) -->
              <div style="
                position: absolute;
                top: -50px;
                left: 20px;
                transform: translateX(${isSelected ? '10px' : '0'});
                transition: all 0.3s ease;
                pointer-events: auto;
              ">
                <!-- Leader Line -->
                <div style="
                    position: absolute;
                    bottom: 0;
                    left: -20px;
                    width: 20px;
                    height: 1px;
                    background: ${glowColor};
                    opacity: 0.5;
                    transform: rotate(-45deg);
                    transform-origin: bottom right;
                "></div>

                <div style="
                    background: rgba(0, 10, 20, 0.85);
                    border: 1px solid ${glowColor}40;
                    border-left: 3px solid ${glowColor};
                    padding: 4px 8px;
                    border-radius: 0 4px 4px 4px;
                    backdrop-filter: blur(4px);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                ">
                    <div style="
                        font-family: 'Share Tech Mono', monospace;
                        font-weight: 700; 
                        font-size: 14px; 
                        color: ${glowColor};
                        letter-spacing: 1px;
                        text-shadow: 0 0 5px ${glowColor}40;
                    ">${plane.callsign}</div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 2px; font-size: 11px; color: #ccc; font-family: 'Share Tech Mono';">
                        <span style="color: ${plane.altitude_ft < 2000 ? '#ffaa00' : '#fff'}">FL${String(Math.round(plane.altitude_ft / 100)).padStart(3, '0')}</span>
                        <span>${String(Math.round(plane.velocity_kts / 10)).padStart(2, '0')}0kt</span>
                    </div>
                </div>
              </div>

            </div>
          `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onAircraftSelect) {
            onAircraftSelect(plane);
          }
        });

        return el;
      };

      if (!marker) {
        const el = createMarkerEl();
        marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([plane.longitude, plane.latitude])
          .addTo(map.current!);
        markers.current.set(plane.icao24, marker);
      } else {
        marker.setLngLat([plane.longitude, plane.latitude]);

        // Update content to reflect selection state or data changes
        const el = marker.getElement();
        const newEl = createMarkerEl();
        el.innerHTML = newEl.innerHTML;
        el.style.zIndex = isSelected ? '100' : '10';

        el.onclick = (e) => {
          e.stopPropagation();
          if (onAircraftSelect) onAircraftSelect(plane);
        };
      }
    });

    // Update flight paths (predicted trajectories)
    const flightPathFeatures: any[] = [];

    aircraft.forEach(plane => {
      if (!plane.on_ground && plane.velocity_kts > 50) {
        const isSelected = selectedAircraft?.icao24 === plane.icao24;
        const altitudeColor = '#00ff00';

        // Use backend predicted path if available, otherwise fallback to frontend prediction
        let pathCoords = plane.predicted_path || [
          [plane.longitude, plane.latitude],
          predictPosition(plane, 5)
        ];

        // Ensure path starts at current position
        if (pathCoords.length > 0) {
          pathCoords = [[plane.longitude, plane.latitude], ...pathCoords];
        }

        flightPathFeatures.push({
          type: 'Feature',
          properties: {
            callsign: plane.callsign,
            color: isSelected ? '#00ffff' : altitudeColor,
            width: isSelected ? 2 : 1,
            opacity: isSelected ? 0.8 : 0.3
          },
          geometry: {
            type: 'LineString',
            coordinates: pathCoords
          }
        });
      }
    });

    // Update flight paths source
    const flightPathsSource = map.current?.getSource('flight-paths') as mapboxgl.GeoJSONSource;
    if (flightPathsSource) {
      flightPathsSource.setData({
        type: 'FeatureCollection',
        features: flightPathFeatures
      });
    }

    // Update layer style for dynamic width/opacity
    if (map.current?.getLayer('flight-paths-line')) {
      map.current.setPaintProperty('flight-paths-line', 'line-width', ['get', 'width']);
      map.current.setPaintProperty('flight-paths-line', 'line-opacity', ['get', 'opacity']);
      map.current.setPaintProperty('flight-paths-line', 'line-color', ['get', 'color']);
    }

    // --- LIDAR SCANNER INITIALIZATION ---
    if (!map.current.getSource('lidar-scanner')) {
      const initialGeoJSON = createGeoJSONCircle([centerLon, centerLat], 0.1, 64);
      map.current.addSource('lidar-scanner', { type: 'geojson', data: initialGeoJSON });

      map.current.addLayer({
        id: 'lidar-scanner-line',
        type: 'line',
        source: 'lidar-scanner',
        paint: {
          'line-color': '#00ff00',
          'line-width': 2,
          'line-opacity': 1,
          'line-blur': 2
        }
      });

      map.current.addLayer({
        id: 'lidar-scanner-fill',
        type: 'fill',
        source: 'lidar-scanner',
        paint: {
          'fill-color': '#00ff00',
          'fill-opacity': 0.05
        }
      });
    }

    // --- CONFLICT DETECTION & ALTITUDE CURTAINS ---
    const conflictFeatures: any[] = [];
    const curtainFeatures: any[] = [];

    // Check for conflicts (O(N^2) - okay for small N)
    for (let i = 0; i < aircraft.length; i++) {
      const ac1 = aircraft[i];

      // Altitude Curtain (Line to ground)
      curtainFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [ac1.longitude, ac1.latitude], // Aircraft position
            [ac1.longitude, ac1.latitude]  // Ground position (we'll use 0 altitude implicitly by not setting Z, or mapbox handles it)
            // Actually for 3D lines in Mapbox, we need to set the altitude in the style or use a specific approach.
            // Standard lines are draped on terrain. To make it vertical, we might need a different approach or just a visual cue.
            // Let's stick to a "shadow" line for now or simple connection.
          ]
        },
        properties: {
          color: '#00ff00',
          opacity: 0.2
        }
      });

      for (let j = i + 1; j < aircraft.length; j++) {
        const ac2 = aircraft[j];

        // Calculate distance
        const R = 6371e3; // metres
        const φ1 = ac1.latitude * Math.PI / 180;
        const φ2 = ac2.latitude * Math.PI / 180;
        const Δφ = (ac2.latitude - ac1.latitude) * Math.PI / 180;
        const Δλ = (ac2.longitude - ac1.longitude) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // in meters
        const distNm = d / 1852;

        const altDiff = Math.abs(ac1.altitude_ft - ac2.altitude_ft);

        // Conflict Criteria: < 3nm AND < 1000ft
        if (distNm < 5 && altDiff < 1000) {
          conflictFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [ac1.longitude, ac1.latitude],
                [ac2.longitude, ac2.latitude]
              ]
            },
            properties: {
              dist: distNm.toFixed(1)
            }
          });
        }
      }
    }

    // Update Conflict Layer
    if (map.current.getSource('conflicts')) {
      (map.current.getSource('conflicts') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: conflictFeatures
      });
    } else {
      map.current.addSource('conflicts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: conflictFeatures }
      });
      map.current.addLayer({
        id: 'conflicts-line',
        type: 'line',
        source: 'conflicts',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ff0000', // Red for danger
          'line-width': 3,
          'line-dasharray': [2, 1],
          'line-opacity': 0.8
        }
      });
    }

    // --- 4D Trajectory Ghosting Logic ---
    const calculateFuturePosition = (lat: number, lon: number, speedKts: number, headingDeg: number, minutes: number) => {
      const R = 6371e3; // Earth radius in meters
      const distanceMeters = (speedKts * 1852 * minutes) / 60; // Distance traveled
      const angularDist = distanceMeters / R;
      const headingRad = (headingDeg * Math.PI) / 180;
      const latRad = (lat * Math.PI) / 180;
      const lonRad = (lon * Math.PI) / 180;

      const nextLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(angularDist) +
        Math.cos(latRad) * Math.sin(angularDist) * Math.cos(headingRad)
      );

      const nextLonRad = lonRad + Math.atan2(
        Math.sin(headingRad) * Math.sin(angularDist) * Math.cos(latRad),
        Math.cos(angularDist) - Math.sin(latRad) * Math.sin(nextLatRad)
      );

      return [
        (nextLonRad * 180) / Math.PI,
        (nextLatRad * 180) / Math.PI
      ];
    };

    // Generate Ghost Nodes
    const ghostFeatures: any[] = [];
    aircraft.forEach(ac => {
      [2, 5, 8].forEach(min => {
        const pos = calculateFuturePosition(ac.latitude, ac.longitude, ac.velocity_kts, ac.heading_deg, min);
        ghostFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: pos
          },
          properties: {
            timeLabel: `+${min}m`,
            opacity: min === 2 ? 0.6 : min === 5 ? 0.4 : 0.2,
            heading: ac.heading_deg
          }
        });
      });
    });

    // Update Ghost Layer
    if (map.current.getSource('ghost-nodes')) {
      (map.current.getSource('ghost-nodes') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: ghostFeatures
      });
    } else {
      map.current.addSource('ghost-nodes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: ghostFeatures }
      });

      // Ghost Points (Circles)
      map.current.addLayer({
        id: 'ghost-points',
        type: 'circle',
        source: 'ghost-nodes',
        paint: {
          'circle-radius': 3,
          'circle-color': '#00ffff',
          'circle-opacity': ['get', 'opacity'],
          'circle-blur': 0.5
        }
      });

      // Ghost Labels (Text)
      map.current.addLayer({
        id: 'ghost-labels',
        type: 'symbol',
        source: 'ghost-nodes',
        layout: {
          'text-field': ['get', 'timeLabel'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': '#00ffff',
          'text-opacity': ['get', 'opacity']
        }
      });
    }

  }, [aircraft, mapLoaded, onAircraftSelect, selectedAircraft]);

  // Update Ghost Path
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('ghost-path') as mapboxgl.GeoJSONSource;
    if (source) {
      if (ghostPath) {
        source.setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: ghostPath
          },
          properties: {}
        });
        map.current.setLayoutProperty('ghost-path-line', 'visibility', 'visible');
      } else {
        map.current.setLayoutProperty('ghost-path-line', 'visibility', 'none');
      }
    }
  }, [ghostPath, mapLoaded]);

  // --- TACTICAL ANALYSIS INTEGRATION (Standard REST) ---
  useEffect(() => {
    const handleAnalysis = (e: CustomEvent) => {
      if (!map.current || !mapLoaded) return;

      console.log("Applying Tactical Analysis:", e.detail);
      const geojson = e.detail;
      const source = map.current.getSource('tactical-zones') as mapboxgl.GeoJSONSource;

      if (source) {
        source.setData(geojson);
      }
    };

    window.addEventListener('TACTICAL_ANALYSIS_COMPLETE', handleAnalysis as EventListener);
    return () => window.removeEventListener('TACTICAL_ANALYSIS_COMPLETE', handleAnalysis as EventListener);
  }, [mapLoaded]);


  // Initial Fly-in (Auto-zoom removed in favor of Cinematic Mode)
  useEffect(() => {
    if (map.current && selectedAircraft) {
      map.current.flyTo({
        center: [selectedAircraft.longitude, selectedAircraft.latitude],
        zoom: 13,
        pitch: 60,
        bearing: selectedAircraft.heading_deg,
        speed: 1.2,
        curve: 1
      });
    }
  }, [selectedAircraft]);

  const handleGhostPath = (command: string | null) => {
    if (!selectedAircraft || !command) {
      setGhostPath(null);
      return;
    }

    // Calculate ghost path based on command
    let path: number[][] = [];
    const start = [selectedAircraft.longitude, selectedAircraft.latitude];
    path.push(start);

    if (command === 'VECTOR') {
      // Predict a left turn (demo)
      // In reality, this would depend on the specific vector value
      // For demo, we'll show a 30-degree left turn
      const p1 = predictPosition(selectedAircraft, 1, -10);
      const p2 = predictPosition(selectedAircraft, 2, -20);
      const p3 = predictPosition(selectedAircraft, 3, -30);
      const p4 = predictPosition(selectedAircraft, 5, -30); // Straighten out
      path.push(p1, p2, p3, p4);
    } else if (command === 'SLOW') {
      // Show shorter path segments (slower speed)
      // We can't easily visualize speed on a static line without markers,
      // so maybe we just show a shorter prediction horizon?
      // Or we color it differently?
      // For now, let's just show the standard path but maybe in a different color (handled by layer style later if needed)
      const p1 = predictPosition(selectedAircraft, 5);
      path.push(p1);
    } else {
      // Standard prediction for Climb/Descend (lateral path doesn't change much)
      const p1 = predictPosition(selectedAircraft, 5);
      path.push(p1);
    }

    setGhostPath(path);
  };

  const handleCommand = async (command: string, value: any) => {
    if (!selectedAircraft) return;

    console.log(`[NEURAL LINK] Executing: ${command}`);

    // Construct voice message
    let message = "";
    if (command === 'DESCEND') message = `Descend and maintain flight level two-zero-zero`;
    if (command === 'CLIMB') message = `Climb and maintain flight level three-five-zero`;
    if (command === 'SLOW') message = `Reduce speed to two-one-zero knots`;
    if (command === 'VECTOR') message = `Turn left heading two-seven-zero`;

    // Send to backend
    try {
      await fetch('http://localhost:8000/api/voice/transmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callsign: selectedAircraft.callsign,
          message: message,
          priority: 'ROUTINE',
          urgency: 'ROUTINE',
          frequency: 124.5
        })
      });
    } catch (e) {
      console.error("Failed to transmit voice command", e);
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Neural Link Interface */}
      {selectedAircraft && menuPosition && (
        <RadialMenu
          aircraft={selectedAircraft}
          position={menuPosition}
          onClose={() => {
            if (onAircraftSelect) onAircraftSelect(null as any); // Hack to deselect
          }}
          onCommand={handleCommand}
          onHover={handleGhostPath}
        />
      )}

      {/* Map Error Display */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 rounded-lg z-50">
          <div className="text-center max-w-md p-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">Map Error</h3>
            <p className="text-red-200 mb-4">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Map Loading Display */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-green-500 font-mono">INITIALIZING RADAR SYSTEM...</p>
          </div>
        </div>
      )}

      {/* CRT Overlay Effect */}
      <div className="pointer-events-none absolute inset-0 z-30 scanlines opacity-30"></div>

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 z-20" style={{
        background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.8) 100%)'
      }}></div>

      {/* LIDAR SWEEP OVERLAY (Fixed to ensure visibility) */}
      <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vmax] h-[150vmax] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_320deg,rgba(0,255,255,0.2)_360deg)] animate-spin-slow rounded-full opacity-50 mix-blend-screen"></div>
      </div>

      {/* Digital Wind Particle System */}
      <canvas
        ref={(c) => {
          if (c && !c.dataset.initialized) {
            c.dataset.initialized = 'true';
            const ctx = c.getContext('2d');
            if (!ctx) return;

            // Particle System Configuration
            const particles: { x: number, y: number, speed: number, size: number, opacity: number }[] = [];
            const particleCount = 200; // More particles

            const resize = () => {
              c.width = window.innerWidth;
              c.height = window.innerHeight;
            };
            window.addEventListener('resize', resize);
            resize();

            // Initialize Particles
            for (let i = 0; i < particleCount; i++) {
              particles.push({
                x: Math.random() * c.width,
                y: Math.random() * c.height,
                speed: 0.5 + Math.random() * 2.5,
                size: Math.random() * 2.5,
                opacity: Math.random() * 0.8
              });
            }

            const animate = () => {
              ctx.clearRect(0, 0, c.width, c.height);

              // Update and Draw Particles
              ctx.fillStyle = '#64ffda'; // Cyan

              particles.forEach(p => {
                p.x += p.speed;
                p.y += p.speed * 0.2; // Slight diagonal flow

                // Reset if out of bounds
                if (p.x > c.width) p.x = 0;
                if (p.y > c.height) p.y = 0;

                // Draw
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.globalAlpha = p.opacity * 0.4;
                ctx.fill();

                // Draw Trail (Digital Rain effect)
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - 15, p.y - 3);
                ctx.strokeStyle = '#64ffda';
                ctx.lineWidth = 0.8;
                ctx.stroke();
              });

              requestAnimationFrame(animate);
            };
            animate();
          }
        }}
        className="pointer-events-none absolute inset-0 z-25 opacity-60"
      />

    </div>
  );
}
