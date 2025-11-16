from typing import List, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Aircraft, WeatherCondition, RiskAlert, NTSBReference
from services.ntsb_analyzer import NTSBAnalyzer
from config import get_settings
from datetime import datetime
import uuid
import math

settings = get_settings()

class RiskDetector:
    """
    Real-time risk detection based on NTSB patterns
    """

    def __init__(self):
        self.ntsb = NTSBAnalyzer()
        self.active_alerts = []

    async def analyze_sector(
        self,
        aircraft: List[Aircraft],
        weather: Optional[WeatherCondition]
    ) -> List[RiskAlert]:
        """
        Analyze entire sector for risks
        """
        alerts = []

        # Check runway incursion risk
        runway_alert = self.detect_runway_incursion(aircraft, weather)
        if runway_alert:
            alerts.append(runway_alert)

        # Check separation violations
        separation_alerts = self.detect_separation_violations(aircraft)
        alerts.extend(separation_alerts)

        # Check weather risks
        if weather:
            weather_alert = self.detect_weather_risk(aircraft, weather)
            if weather_alert:
                alerts.append(weather_alert)

        self.active_alerts = alerts
        return alerts

    def detect_runway_incursion(
        self,
        aircraft: List[Aircraft],
        weather: Optional[WeatherCondition]
    ) -> Optional[RiskAlert]:
        """
        Detect potential runway incursion
        Critical: Aircraft on runway + another cleared to land
        """
        # Find aircraft on ground (on runway)
        on_runway = [ac for ac in aircraft if ac.on_ground and ac.velocity_kts < 30]

        # Find aircraft on approach (< 2000ft AGL, descending)
        on_approach = [
            ac for ac in aircraft
            if not ac.on_ground
            and ac.altitude_ft < 6000  # Assuming airport elevation ~5000ft (KDEN)
            and ac.vertical_rate_fpm < -500
        ]

        if on_runway and on_approach:
            # CRITICAL: Potential runway incursion
            runway_aircraft = on_runway[0]
            approaching_aircraft = on_approach[0]

            # Get similar NTSB case
            ntsb_ref = self.ntsb.find_similar_runway_incursion(
                f"runway_occupied low_visibility" if weather and weather.visibility_sm < 3 else "runway_occupied"
            )

            # Calculate severity
            severity = "CRITICAL"
            if weather and weather.visibility_sm < 3:
                severity = "CRITICAL"  # Low vis makes it worse

            alert = RiskAlert(
                id=str(uuid.uuid4()),
                timestamp=datetime.now(),
                risk_type="RUNWAY_INCURSION",
                severity=severity,
                aircraft_involved=[runway_aircraft.callsign, approaching_aircraft.callsign],
                description=f"Runway incursion risk: {runway_aircraft.callsign} on runway, {approaching_aircraft.callsign} on approach",
                ntsb_reference=ntsb_ref,
                recommended_action="Go around or expedite runway vacation",
                pilot_message=f"{approaching_aircraft.callsign}, GO AROUND, traffic on the runway",
                reasoning=f"NTSB data shows {len(self.ntsb.patterns.get('runway_incursion', []))} similar runway incursion incidents. Current conditions increase risk.",
                auto_resolve=False
            )

            return alert

        return None

    def detect_separation_violations(self, aircraft: List[Aircraft]) -> List[RiskAlert]:
        """
        Detect aircraft too close to each other
        """
        alerts = []

        for i, ac1 in enumerate(aircraft):
            for ac2 in aircraft[i+1:]:
                # Calculate horizontal separation
                horiz_sep_nm = self._calculate_distance_nm(
                    ac1.latitude, ac1.longitude,
                    ac2.latitude, ac2.longitude
                )

                # Calculate vertical separation
                vert_sep_ft = abs(ac1.altitude_ft - ac2.altitude_ft)

                # Check if too close
                if (horiz_sep_nm < settings.separation_minimum_nm and
                    vert_sep_ft < settings.separation_minimum_ft):

                    ntsb_ref = self.ntsb.find_similar_separation_violation()

                    alert = RiskAlert(
                        id=str(uuid.uuid4()),
                        timestamp=datetime.now(),
                        risk_type="SEPARATION",
                        severity="HIGH" if horiz_sep_nm < 2.0 else "MEDIUM",
                        aircraft_involved=[ac1.callsign, ac2.callsign],
                        description=f"Inadequate separation: {horiz_sep_nm:.1f}nm horizontal, {vert_sep_ft}ft vertical",
                        ntsb_reference=ntsb_ref,
                        recommended_action=f"Increase separation: climb {ac1.callsign} or turn {ac2.callsign}",
                        pilot_message=None,
                        reasoning=f"Current separation below minimums. NTSB database contains {len(self.ntsb.patterns.get('separation_violation', []))} similar cases.",
                        auto_resolve=False
                    )
                    alerts.append(alert)

        return alerts

    def detect_weather_risk(
        self,
        aircraft: List[Aircraft],
        weather: WeatherCondition
    ) -> Optional[RiskAlert]:
        """
        Detect weather-related risks
        """
        if weather.visibility_sm < settings.weather_risk_visibility_sm:
            # Low visibility risk
            accident_count = self.ntsb.get_weather_accident_count(weather.phenomena)

            alert = RiskAlert(
                id=str(uuid.uuid4()),
                timestamp=datetime.now(),
                risk_type="WEATHER",
                severity="HIGH" if weather.visibility_sm < 1.0 else "MEDIUM",
                aircraft_involved=[ac.callsign for ac in aircraft],
                description=f"Low visibility: {weather.visibility_sm}SM. Weather: {', '.join(weather.phenomena)}",
                ntsb_reference=NTSBReference(
                    event_id="WEATHER-PATTERN",
                    date="Multiple",
                    location="Various",
                    description=f"{accident_count} NTSB accidents occurred in similar weather conditions",
                    similar_factors=weather.phenomena
                ),
                recommended_action="Increase separation standards, advise pilots of conditions",
                pilot_message=None,
                reasoning=f"NTSB data: {accident_count} accidents in similar weather. Increased vigilance required.",
                auto_resolve=False
            )

            return alert

        return None

    def _calculate_distance_nm(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance in nautical miles"""
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
