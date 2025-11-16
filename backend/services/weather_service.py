import httpx
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import WeatherCondition
from config import get_settings
from datetime import datetime
from typing import Optional

settings = get_settings()

class WeatherService:
    """
    Parse METAR/TAF using AVWX.rest API (free tier)
    """

    def __init__(self):
        self.api_url = settings.weather_api_url

    async def get_metar(self, airport: str = "KDEN") -> Optional[WeatherCondition]:
        """
        Fetch and parse METAR for airport
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/metar/{airport}",
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()

            # Parse METAR
            metar_data = data.get("data", {})

            # Extract visibility
            visibility_sm = self._parse_visibility(metar_data.get("visibility", {}))

            # Extract ceiling
            ceiling_ft = self._parse_ceiling(metar_data.get("clouds", []))

            # Extract weather phenomena
            phenomena = [wx.get("repr", "") for wx in metar_data.get("wx_codes", [])]

            weather = WeatherCondition(
                airport=airport,
                observation_time=datetime.fromisoformat(metar_data.get("time", {}).get("dt", "")),
                visibility_sm=visibility_sm,
                ceiling_ft=ceiling_ft,
                wind_speed_kts=metar_data.get("wind_speed", {}).get("value", 0),
                wind_direction_deg=metar_data.get("wind_direction", {}).get("value", 0),
                phenomena=phenomena,
                temperature_c=metar_data.get("temperature", {}).get("value", 0),
                dewpoint_c=metar_data.get("dewpoint", {}).get("value", 0),
                altimeter_inhg=metar_data.get("altimeter", {}).get("value", 29.92),
                raw_metar=metar_data.get("raw", "")
            )

            return weather

        except Exception as e:
            print(f"❌ Error fetching METAR: {e}")
            return None

    def _parse_visibility(self, vis_data: dict) -> float:
        """Parse visibility to statute miles"""
        return vis_data.get("value", 10.0)

    def _parse_ceiling(self, clouds: list) -> Optional[int]:
        """Extract ceiling (lowest BKN or OVC layer)"""
        for cloud in clouds:
            cover = cloud.get("type", "")
            if cover in ["BKN", "OVC"]:
                altitude = cloud.get("altitude", 0)
                return altitude * 100  # Convert to feet AGL
        return None

    def is_low_visibility(self, weather: WeatherCondition) -> bool:
        """Check if visibility is below minimums"""
        return weather.visibility_sm < settings.weather_risk_visibility_sm

    def has_adverse_weather(self, weather: WeatherCondition) -> bool:
        """Check for adverse weather phenomena"""
        adverse = ["FG", "TS", "TSRA", "SN", "FZRA", "FC"]
        return any(wx in weather.phenomena for wx in adverse)
