import httpx
import asyncio
from typing import List, Dict
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Aircraft
from config import get_settings
from redis_client import redis_client
import math

settings = get_settings()

class FlightTracker:
    """
    Tracks aircraft using Airplanes.live API (free ADS-B data)
    """

    def __init__(self):
        self.api_url = settings.adsb_api_url
        self.airport_lat = settings.airport_lat
        self.airport_lon = settings.airport_lon
        self.radius_nm = settings.monitoring_radius_nm

    async def get_aircraft_in_radius(self) -> List[Aircraft]:
        """
        Get all aircraft within monitoring radius of airport
        """
        # Check cache first
        cached = await redis_client.get_cached_flight_data()
        if cached:
            return [Aircraft(**ac) for ac in cached]

        # Calculate bounding box (approximate)
        lat_delta = self.radius_nm / 60  # 1 degree ≈ 60 nm
        lon_delta = self.radius_nm / (60 * math.cos(math.radians(self.airport_lat)))

        params = {
            "lat": self.airport_lat,
            "lon": self.airport_lon,
            "distance": self.radius_nm
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.api_url,
                    params=params,
                    timeout=5.0
                )
                response.raise_for_status()
                data = response.json()

            aircraft_list = []
            for ac in data.get("ac", []):
                try:
                    aircraft = Aircraft(
                        callsign=ac.get("flight", "UNKNOWN").strip(),
                        icao24=ac.get("hex", ""),
                        latitude=ac.get("lat", 0),
                        longitude=ac.get("lon", 0),
                        altitude_ft=ac.get("alt_baro", 0),
                        velocity_kts=ac.get("gs", 0),
                        heading_deg=ac.get("track", 0),
                        vertical_rate_fpm=ac.get("baro_rate", 0),
                        on_ground=ac.get("alt_baro", 1000) < 100,
                        last_contact=ac.get("seen", 0)
                    )
                    aircraft_list.append(aircraft)
                except Exception as e:
                    print(f"⚠️ Error parsing aircraft: {e}")
                    continue

            # Cache for 2 seconds
            await redis_client.cache_flight_data([ac.dict() for ac in aircraft_list])

            print(f"✈️ Tracking {len(aircraft_list)} aircraft")
            return aircraft_list

        except Exception as e:
            print(f"❌ Error fetching flight data: {e}")
            return []

    def calculate_distance_nm(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance in nautical miles using Haversine formula"""
        R = 3440.065  # Earth radius in nautical miles

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c
