"""
Enhanced Risk Detector with Multi-Layered Scoring
Integrates RiskScoringEngine for professional risk assessment
"""

from typing import List, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Aircraft, WeatherCondition, NTSBReference, EnhancedRiskAlert, RiskScore, RiskTier, UrgencyLevel
from services.risk_scoring import risk_scoring_engine
from services.ntsb_analyzer import NTSBAnalyzer
from services.task_manager import task_manager
from task_models import TaskPriority, TaskCategory
from config import get_settings
from datetime import datetime
import uuid
import math

settings = get_settings()


class EnhancedRiskDetector:
    """
    Professional risk detection with multi-layered scoring

    Improvements over basic RiskDetector:
    - NTSB frequency-weighted scoring
    - Multi-factor risk assessment
    - Auto-escalation for critical risks
    - Detailed risk factor breakdown
    - Workload-aware analysis
    """

    def __init__(self):
        self.ntsb = NTSBAnalyzer()
        self.scoring_engine = risk_scoring_engine
        self.active_alerts = []

    def _create_task_from_alert(self, alert: EnhancedRiskAlert) -> None:
        """
        Automatically create a task from an alert
        Maps severity to priority and risk_type to category
        """
        # Map severity to priority
        severity_to_priority = {
            "CRITICAL": TaskPriority.HIGH,
            "HIGH": TaskPriority.HIGH,
            "MEDIUM": TaskPriority.MEDIUM,
            "LOW": TaskPriority.LOW
        }
        priority = severity_to_priority.get(alert.severity, TaskPriority.MEDIUM)

        # Map risk_type to category
        risk_to_category = {
            "RUNWAY_INCURSION": TaskCategory.RUNWAY,
            "SEPARATION": TaskCategory.SEPARATION,
            "WEATHER": TaskCategory.WEATHER,
            "ALTITUDE": TaskCategory.ALTITUDE,
            "SPEED": TaskCategory.SPEED,
            "HEADING": TaskCategory.HEADING
        }
        category = risk_to_category.get(alert.risk_type, TaskCategory.CONFLICT)

        # Get primary aircraft (first in involved list)
        primary_aircraft = alert.aircraft_involved[0] if alert.aircraft_involved else "UNKNOWN"

        # Create or update task
        task_manager.create_or_update_task(
            aircraft_icao24=f"ICAO_{primary_aircraft}",  # We don't have ICAO24 in alert, use callsign-based ID
            aircraft_callsign=primary_aircraft,
            priority=priority,
            category=category,
            summary=f"{alert.risk_type}: {alert.description[:80]}",
            description=alert.description,
            ai_action=alert.controller_action,
            pilot_message=alert.pilot_message,
            alert_id=alert.id
        )

    async def analyze_sector(
        self,
        aircraft: List[Aircraft],
        weather: Optional[WeatherCondition]
    ) -> List[EnhancedRiskAlert]:
        """
        Analyze entire sector for risks with enhanced scoring

        Returns:
            List of EnhancedRiskAlert with full risk scores
        """
        alerts = []
        current_workload = len(aircraft)

        # Check runway incursion risk
        runway_alert = self.detect_runway_incursion(aircraft, weather, current_workload)
        if runway_alert:
            alerts.append(runway_alert)

        # Check separation violations
        separation_alerts = self.detect_separation_violations(aircraft, current_workload)
        alerts.extend(separation_alerts)

        # Check weather risks
        if weather:
            weather_alert = self.detect_weather_risk(aircraft, weather, current_workload)
            if weather_alert:
                alerts.append(weather_alert)

        self.active_alerts = alerts
        return alerts

    def detect_runway_incursion(
        self,
        aircraft: List[Aircraft],
        weather: Optional[WeatherCondition],
        current_workload: int
    ) -> Optional[EnhancedRiskAlert]:
        """
        Detect potential runway incursion with enhanced scoring
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
            runway_aircraft = on_runway[0]
            approaching_aircraft = on_approach[0]

            # Calculate time to impact
            # Rough estimate: distance to runway / approach speed
            approach_speed_fps = approaching_aircraft.velocity_kts * 1.68781  # kts to fps
            altitude_agl = approaching_aircraft.altitude_ft - 5000  # KDEN elevation
            descent_rate_fps = abs(approaching_aircraft.vertical_rate_fpm) / 60

            time_to_touchdown = altitude_agl / descent_rate_fps if descent_rate_fps > 0 else 120

            # Calculate separation
            separation_nm = self._calculate_distance_nm(
                runway_aircraft.latitude, runway_aircraft.longitude,
                approaching_aircraft.latitude, approaching_aircraft.longitude
            )

            # Calculate enhanced risk score
            risk_score = self.scoring_engine.calculate_risk_score(
                risk_type='RUNWAY_INCURSION',
                aircraft=[runway_aircraft, approaching_aircraft],
                weather=weather,
                current_workload=current_workload,
                separation_nm=separation_nm,
                time_to_impact_seconds=time_to_touchdown
            )

            # Get risk factor breakdown
            risk_factors = self.scoring_engine.get_risk_factors(risk_score, 'RUNWAY_INCURSION')

            # Get similar NTSB case
            ntsb_ref = self.ntsb.find_similar_runway_incursion(
                f"runway_occupied low_visibility" if weather and weather.visibility_sm < 3 else "runway_occupied"
            )

            # Generate messages based on urgency
            if risk_score.urgency == UrgencyLevel.IMMEDIATE:
                pilot_message = f"{approaching_aircraft.callsign}, GO AROUND, TRAFFIC ON THE RUNWAY!"
                controller_action = "Immediately instruct go-around"
            elif risk_score.urgency == UrgencyLevel.URGENT:
                pilot_message = f"{approaching_aircraft.callsign}, expedite runway vacation or go around"
                controller_action = "Expedite runway clearance or instruct go-around"
            else:
                pilot_message = f"{runway_aircraft.callsign}, expedite runway vacation"
                controller_action = "Monitor and expedite as needed"

            alert = EnhancedRiskAlert(
                id=str(uuid.uuid4()),
                timestamp=datetime.now(),
                risk_type="RUNWAY_INCURSION",
                severity=risk_score.tier,
                risk_score=risk_score,
                risk_factors=risk_factors,
                aircraft_involved=[runway_aircraft.callsign, approaching_aircraft.callsign],
                description=f"Runway incursion risk: {runway_aircraft.callsign} on runway, {approaching_aircraft.callsign} {altitude_agl:.0f}ft AGL on approach",
                current_separation=separation_nm,
                ntsb_reference=ntsb_ref.model_dump() if ntsb_ref else None,
                recommended_action=f"Go-around or expedite runway vacation - {time_to_touchdown:.0f}s to impact",
                pilot_message=pilot_message,
                controller_action=controller_action,
                auto_resolve=False
            )

            # Auto-generate task from alert
            self._create_task_from_alert(alert)

            return alert

        return None

    def detect_separation_violations(
        self,
        aircraft: List[Aircraft],
        current_workload: int
    ) -> List[EnhancedRiskAlert]:
        """
        Detect aircraft too close to each other with enhanced scoring
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

                    # Calculate closing speed (simplified)
                    # In reality would need velocity vectors
                    avg_speed_kts = (ac1.velocity_kts + ac2.velocity_kts) / 2
                    closing_speed_nm_per_sec = avg_speed_kts / 3600

                    time_to_impact = horiz_sep_nm / closing_speed_nm_per_sec if closing_speed_nm_per_sec > 0 else 300

                    # Calculate enhanced risk score
                    risk_score = self.scoring_engine.calculate_risk_score(
                        risk_type='SEPARATION_VIOLATION',
                        aircraft=[ac1, ac2],
                        weather=None,
                        current_workload=current_workload,
                        separation_nm=horiz_sep_nm,
                        separation_ft=vert_sep_ft,
                        time_to_impact_seconds=time_to_impact
                    )

                    # Get risk factors
                    risk_factors = self.scoring_engine.get_risk_factors(risk_score, 'SEPARATION_VIOLATION')

                    ntsb_ref = self.ntsb.find_similar_separation_violation()

                    # Generate actions based on risk tier
                    if risk_score.tier == RiskTier.CRITICAL:
                        recommended_action = f"IMMEDIATE: Climb {ac1.callsign} to FL{int((ac1.altitude_ft + 2000) / 100)} or turn {ac2.callsign} 30° right"
                        pilot_message = f"{ac1.callsign}, CLIMB IMMEDIATELY, traffic alert"
                    elif risk_score.tier == RiskTier.HIGH:
                        recommended_action = f"Increase separation: climb {ac1.callsign} or turn {ac2.callsign}"
                        pilot_message = f"{ac1.callsign}, climb and maintain FL{int((ac1.altitude_ft + 1000) / 100)}"
                    else:
                        recommended_action = f"Monitor separation between {ac1.callsign} and {ac2.callsign}"
                        pilot_message = None

                    alert = EnhancedRiskAlert(
                        id=str(uuid.uuid4()),
                        timestamp=datetime.now(),
                        risk_type="SEPARATION",
                        severity=risk_score.tier,
                        risk_score=risk_score,
                        risk_factors=risk_factors,
                        aircraft_involved=[ac1.callsign, ac2.callsign],
                        description=f"Separation violation: {horiz_sep_nm:.1f}nm horizontal, {vert_sep_ft:.0f}ft vertical",
                        current_separation=horiz_sep_nm,
                        ntsb_reference=ntsb_ref.model_dump() if ntsb_ref else None,
                        recommended_action=recommended_action,
                        pilot_message=pilot_message,
                        controller_action=f"Restore separation - {time_to_impact:.0f}s estimated",
                        auto_resolve=False
                    )

                    # Auto-generate task from alert
                    self._create_task_from_alert(alert)

                    alerts.append(alert)

        return alerts

    def detect_weather_risk(
        self,
        aircraft: List[Aircraft],
        weather: WeatherCondition,
        current_workload: int
    ) -> Optional[EnhancedRiskAlert]:
        """
        Detect weather-related risks with enhanced scoring
        """
        if weather.visibility_sm < settings.weather_risk_visibility_sm:
            # Calculate weather risk score
            risk_score = self.scoring_engine.calculate_risk_score(
                risk_type='WEATHER_RELATED',
                aircraft=aircraft,
                weather=weather,
                current_workload=current_workload,
                time_to_impact_seconds=None  # Weather is ongoing
            )

            # Get risk factors
            risk_factors = self.scoring_engine.get_risk_factors(risk_score, 'WEATHER_RELATED')

            # Get NTSB weather accident count
            accident_count = self.ntsb.get_weather_accident_count(weather.phenomena)

            alert = EnhancedRiskAlert(
                id=str(uuid.uuid4()),
                timestamp=datetime.now(),
                risk_type="WEATHER",
                severity=risk_score.tier,
                risk_score=risk_score,
                risk_factors=risk_factors,
                aircraft_involved=[ac.callsign for ac in aircraft[:10]],  # Limit to first 10
                description=f"Adverse weather: {weather.visibility_sm}SM visibility, {', '.join(weather.phenomena) if weather.phenomena else 'low visibility'}",
                ntsb_reference={
                    "event_id": "WEATHER-PATTERN",
                    "date": "Multiple",
                    "location": "Various",
                    "description": f"{accident_count} NTSB accidents occurred in similar weather conditions",
                    "similar_factors": weather.phenomena or []
                },
                recommended_action="Increase separation standards, advise pilots of conditions, consider instrument approaches",
                pilot_message=None if risk_score.tier == RiskTier.LOW else f"All aircraft, advised current visibility {weather.visibility_sm} statute miles",
                controller_action=f"Enhanced monitoring required - visibility {weather.visibility_sm}SM",
                auto_resolve=False
            )

            # Auto-generate task from alert
            self._create_task_from_alert(alert)

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


# Global instance
enhanced_risk_detector = EnhancedRiskDetector()
