import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Aircraft } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox token from environment with validation
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_token_here') {
  console.error('⚠️ MAPBOX TOKEN NOT SET! Please set VITE_MAPBOX_TOKEN in frontend/.env');
  console.info('Get your token at: https://account.mapbox.com/access-tokens/');
}

mapboxgl.accessToken = MAPBOX_TOKEN || '';

interface MapViewProps {
  aircraft: Aircraft[];
  centerLat?: number;
  centerLon?: number;
}

// Calculate predicted position (simplified physics)
const predictPosition = (ac: Aircraft, timeMinutes: number) => {
  const speedMilesPerMin = (ac.velocity_kts / 60);
  const distanceMiles = speedMilesPerMin * timeMinutes;
  const distanceDegrees = distanceMiles / 69; // Rough conversion

  const headingRad = (ac.heading_deg * Math.PI) / 180;
  const lat = ac.latitude + (Math.cos(headingRad) * distanceDegrees);
  const lon = ac.longitude + (Math.sin(headingRad) * distanceDegrees);

  return [lon, lat];
};

export default function MapView({ aircraft, centerLat = 39.8561, centerLon = -104.6737 }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Check for token before initializing
    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox token not configured. Please set VITE_MAPBOX_TOKEN in frontend/.env');
      return;
    }

    console.log('🗺️ Initializing Mapbox map...');

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [centerLon, centerLat],
        zoom: 9,
        pitch: 45,
        bearing: 0,
        antialias: true
      });

      map.current.on('load', () => {
        console.log('✅ Mapbox map loaded successfully');
        setMapLoaded(true);
        setMapError(null);

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
              'fill-extrusion-color': '#1e3a8a',
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
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );
      }

      // Add airport marker for KDEN
      const airportMarker = document.createElement('div');
      airportMarker.className = 'airport-marker';
      airportMarker.innerHTML = `
        <div style="
          background: rgba(59, 130, 246, 0.2);
          border: 2px solid #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        ">
          🛫
        </div>
      `;

      new mapboxgl.Marker(airportMarker)
        .setLngLat([centerLon, centerLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            '<div style="color: black; font-weight: bold;">Denver International Airport (KDEN)</div>'
          )
        )
        .addTo(map.current!);

      // Add radius circle
      if (!map.current!.getSource('radius')) {
        map.current!.addSource('radius', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [centerLon, centerLat]
            }
          }
        });

        map.current!.addLayer({
          id: 'radius-circle',
          type: 'circle',
          source: 'radius',
          paint: {
            'circle-radius': {
              stops: [
                [0, 0],
                [20, map.current!.getCanvas().width]
              ],
              base: 2
            },
            'circle-color': '#3b82f6',
            'circle-opacity': 0.1,
            'circle-stroke-color': '#3b82f6',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 0.3
          }
        });
      }

      // Add flight path layers
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
            'line-width': 2,
            'line-opacity': 0.6,
            'line-dasharray': [2, 2]
          }
        });
      }

      // Add conflict zones layer
      if (!map.current!.getSource('conflict-zones')) {
        map.current!.addSource('conflict-zones', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        map.current!.addLayer({
          id: 'conflict-zones-fill',
          type: 'fill',
          source: 'conflict-zones',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.15
          }
        });

        map.current!.addLayer({
          id: 'conflict-zones-outline',
          type: 'line',
          source: 'conflict-zones',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.8,
            'line-dasharray': [3, 3]
          }
        });
      }
    });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

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
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [centerLat, centerLon]);

  // Update aircraft markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentAircraftIds = new Set(aircraft.map(a => a.icao24));

    // Log aircraft updates (throttled to avoid spam)
    if (aircraft.length > 0 && Math.random() < 0.1) { // Log ~10% of updates
      console.log(`✈️ Updating ${aircraft.length} aircraft on map`);
    }

    // Remove markers for aircraft that are no longer present
    markers.current.forEach((marker, id) => {
      if (!currentAircraftIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });

    // Add or update markers for current aircraft
    aircraft.forEach(plane => {
      const altitudeColor = plane.altitude_ft > 15000 ? '#10b981' : plane.altitude_ft > 5000 ? '#3b82f6' : '#f59e0b';
      const size = plane.on_ground ? 24 : 36;

      let marker = markers.current.get(plane.icao24);

      if (!marker) {
        // Create new marker with SVG plane icon
        const el = document.createElement('div');
        el.className = 'aircraft-marker';
        el.innerHTML = `
          <div style="
            position: relative;
            width: ${size}px;
            height: ${size}px;
          ">
            ${plane.on_ground ? `
              <div style="
                background: ${altitudeColor};
                border: 2px solid white;
                border-radius: 50%;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${size * 0.6}px;
                box-shadow: 0 0 10px ${altitudeColor};
              ">🛬</div>
            ` : `
              <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: drop-shadow(0 0 6px ${altitudeColor});">
                <g transform="rotate(${plane.heading_deg} 12 12)">
                  <path d="M12 2 L4 20 L7 20 L10 14 L14 14 L17 20 L20 20 Z"
                        fill="${altitudeColor}"
                        stroke="white"
                        stroke-width="1.2"/>
                  <circle cx="12" cy="8" r="1.5" fill="white" opacity="0.8"/>
                </g>
              </svg>
            `}
            <div style="
              position: absolute;
              top: ${size + 2}px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.9);
              color: ${altitudeColor};
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 11px;
              white-space: nowrap;
              font-weight: bold;
              border: 1px solid ${altitudeColor};
              box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            ">
              ${plane.callsign}
              <span style="color: white; margin-left: 4px; font-size: 9px;">
                FL${Math.round(plane.altitude_ft / 100)}
              </span>
            </div>
          </div>
        `;

        marker = new mapboxgl.Marker(el)
          .setLngLat([plane.longitude, plane.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div style="color: black; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${altitudeColor};">${plane.callsign}</h3>
                <table style="width: 100%; font-size: 12px;">
                  <tr><td><strong>Altitude:</strong></td><td>${Math.round(plane.altitude_ft).toLocaleString()} ft</td></tr>
                  <tr><td><strong>Speed:</strong></td><td>${Math.round(plane.velocity_kts)} kts</td></tr>
                  <tr><td><strong>Heading:</strong></td><td>${Math.round(plane.heading_deg)}°</td></tr>
                  <tr><td><strong>V/S:</strong></td><td>${plane.vertical_rate_fpm > 0 ? '↗' : plane.vertical_rate_fpm < 0 ? '↘' : '→'} ${Math.abs(Math.round(plane.vertical_rate_fpm))} fpm</td></tr>
                  <tr><td><strong>Status:</strong></td><td>${plane.on_ground ? '🛬 On Ground' : '✈️ Airborne'}</td></tr>
                </table>
              </div>
            `)
          )
          .addTo(map.current!);

        markers.current.set(plane.icao24, marker);
      } else {
        // Update existing marker position
        marker.setLngLat([plane.longitude, plane.latitude]);

        // Update marker appearance (recreate to update heading rotation)
        const el = marker.getElement();
        el.innerHTML = `
          <div style="
            position: relative;
            width: ${size}px;
            height: ${size}px;
          ">
            ${plane.on_ground ? `
              <div style="
                background: ${altitudeColor};
                border: 2px solid white;
                border-radius: 50%;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${size * 0.6}px;
                box-shadow: 0 0 10px ${altitudeColor};
              ">🛬</div>
            ` : `
              <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: drop-shadow(0 0 6px ${altitudeColor});">
                <g transform="rotate(${plane.heading_deg} 12 12)">
                  <path d="M12 2 L4 20 L7 20 L10 14 L14 14 L17 20 L20 20 Z"
                        fill="${altitudeColor}"
                        stroke="white"
                        stroke-width="1.2"/>
                  <circle cx="12" cy="8" r="1.5" fill="white" opacity="0.8"/>
                </g>
              </svg>
            `}
            <div style="
              position: absolute;
              top: ${size + 2}px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.9);
              color: ${altitudeColor};
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 11px;
              white-space: nowrap;
              font-weight: bold;
              border: 1px solid ${altitudeColor};
              box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            ">
              ${plane.callsign}
              <span style="color: white; margin-left: 4px; font-size: 9px;">
                FL${Math.round(plane.altitude_ft / 100)}
              </span>
            </div>
          </div>
        `;

        // Update popup
        marker.setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="color: black; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${altitudeColor};">${plane.callsign}</h3>
              <table style="width: 100%; font-size: 12px;">
                <tr><td><strong>Altitude:</strong></td><td>${Math.round(plane.altitude_ft).toLocaleString()} ft</td></tr>
                <tr><td><strong>Speed:</strong></td><td>${Math.round(plane.velocity_kts)} kts</td></tr>
                <tr><td><strong>Heading:</strong></td><td>${Math.round(plane.heading_deg)}°</td></tr>
                <tr><td><strong>V/S:</strong></td><td>${plane.vertical_rate_fpm > 0 ? '↗' : plane.vertical_rate_fpm < 0 ? '↘' : '→'} ${Math.abs(Math.round(plane.vertical_rate_fpm))} fpm</td></tr>
                <tr><td><strong>Status:</strong></td><td>${plane.on_ground ? '🛬 On Ground' : '✈️ Airborne'}</td></tr>
              </table>
            </div>
          `)
        );
      }
    });

    // Update flight paths (predicted trajectories)
    const flightPathFeatures: any[] = [];
    const conflictZones: any[] = [];

    aircraft.forEach(plane => {
      if (!plane.on_ground && plane.velocity_kts > 50) {
        const altitudeColor = plane.altitude_ft > 15000 ? '#10b981' : plane.altitude_ft > 5000 ? '#3b82f6' : '#f59e0b';

        // Create predicted path line (5, 10, 15 minute predictions)
        const pathCoords = [
          [plane.longitude, plane.latitude],
          predictPosition(plane, 5),
          predictPosition(plane, 10),
          predictPosition(plane, 15)
        ];

        flightPathFeatures.push({
          type: 'Feature',
          properties: {
            callsign: plane.callsign,
            color: altitudeColor
          },
          geometry: {
            type: 'LineString',
            coordinates: pathCoords
          }
        });
      }
    });

    // Simple conflict detection (check if any aircraft are too close)
    for (let i = 0; i < aircraft.length; i++) {
      for (let j = i + 1; j < aircraft.length; j++) {
        const ac1 = aircraft[i];
        const ac2 = aircraft[j];

        // Skip if either is on ground
        if (ac1.on_ground || ac2.on_ground) continue;

        // Calculate horizontal distance (rough)
        const latDiff = ac2.latitude - ac1.latitude;
        const lonDiff = ac2.longitude - ac1.longitude;
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 69; // Miles (rough)

        // Calculate vertical separation
        const verticalSep = Math.abs(ac2.altitude_ft - ac1.altitude_ft);

        // Check for separation violation (3nm horizontal OR 1000ft vertical)
        const horizontalViolation = distance < 3;
        const verticalViolation = verticalSep < 1000;

        if (horizontalViolation && verticalViolation) {
          // CRITICAL conflict - both aircraft in danger
          const midLat = (ac1.latitude + ac2.latitude) / 2;
          const midLon = (ac1.longitude + ac2.longitude) / 2;

          conflictZones.push({
            type: 'Feature',
            properties: {
              color: '#ef4444', // Red for critical
              severity: 'CRITICAL'
            },
            geometry: {
              type: 'Point',
              coordinates: [midLon, midLat]
            }
          });
        } else if (distance < 5 && verticalSep < 2000) {
          // WARNING - developing conflict
          const midLat = (ac1.latitude + ac2.latitude) / 2;
          const midLon = (ac1.longitude + ac2.longitude) / 2;

          conflictZones.push({
            type: 'Feature',
            properties: {
              color: '#f59e0b', // Yellow for warning
              severity: 'WARNING'
            },
            geometry: {
              type: 'Point',
              coordinates: [midLon, midLat]
            }
          });
        }
      }
    }

    // Update flight paths source
    const flightPathsSource = map.current?.getSource('flight-paths') as mapboxgl.GeoJSONSource;
    if (flightPathsSource) {
      flightPathsSource.setData({
        type: 'FeatureCollection',
        features: flightPathFeatures
      });
    }

    // Update conflict zones source (convert points to circles)
    const conflictZoneFeatures = conflictZones.map(zone => {
      const [lon, lat] = zone.geometry.coordinates;
      const radiusDegrees = 0.05; // ~3 miles
      const points = 32;
      const coords: number[][] = [];

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        coords.push([
          lon + radiusDegrees * Math.cos(angle),
          lat + radiusDegrees * Math.sin(angle)
        ]);
      }

      return {
        type: 'Feature' as const,
        properties: zone.properties,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords]
        }
      };
    });

    const conflictZonesSource = map.current?.getSource('conflict-zones') as mapboxgl.GeoJSONSource;
    if (conflictZonesSource) {
      conflictZonesSource.setData({
        type: 'FeatureCollection',
        features: conflictZoneFeatures as any
      });
    }
  }, [aircraft, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />

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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg z-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white font-semibold">Loading Map...</p>
            <p className="text-slate-400 text-sm mt-2">Initializing Mapbox GL</p>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 text-white text-sm shadow-lg border border-slate-700">
        {/* Map Status */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700">
          <div className={`w-2 h-2 rounded-full ${mapLoaded ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
          <span className="font-semibold text-xs">
            {mapLoaded ? `Map Active • ${aircraft.length} Aircraft` : 'Map Loading...'}
          </span>
        </div>

        {/* Altitude Legend */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>High (&gt;15,000 ft)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Medium (5,000-15,000 ft)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Low (&lt;5,000 ft)</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .mapboxgl-popup-content {
          background: white;
          border-radius: 8px;
          padding: 12px;
        }

        .mapboxgl-popup-close-button {
          font-size: 20px;
          padding: 4px 8px;
        }
      `}</style>
    </div>
  );
}
