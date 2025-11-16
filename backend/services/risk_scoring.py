"""
Multi-Layered Risk Scoring Engine
NTSB frequency-weighted risk assessment with auto-escalation
"""

from typing import List, Optional, Dict, Tuple
from datetime import datetime, timedelta
from models import (
    RiskScore, RiskTier, UrgencyLevel, RiskFactor,
    EnhancedRiskAlert, WorkloadMetrics,
    Aircraft, WeatherCondition
)


class RiskScoringEngine:
    """
    Advanced risk scoring with NTSB frequency weighting

    Score Formula:
    Risk Score = (NTSB_frequency × 0.4) + (severity × 0.3) + (urgency × 0.2) + (environmental × 0.1)

    Tiers:
    - CRITICAL (90-100): Act in 60 seconds - auto-transmit if no response
    - HIGH (70-89): Act in 3 minutes - alert with buzzer
    - MEDIUM (50-69): Monitor - visual highlight only
    - LOW (<50): Awareness - background tracking
    """

    def __init__(self):
        # NTSB frequency data (from historical analysis)
        # These would be loaded from actual NTSB database
        self.ntsb_frequencies = {
            'RUNWAY_INCURSION': 0.85,      # 85% of incidents involve runway issues
            'SEPARATION_VIOLATION': 0.72,   # 72% involve separation issues
            'WEATHER_RELATED': 0.63,        # 63% involve weather
            'COMMUNICATION_ERROR': 0.45,    # 45% involve comm errors
            'WAKE_TURBULENCE': 0.38,        # 38% involve wake turb
            'UNSTABLE_APPROACH': 0.55,      # 55% involve unstable approaches
        }

        # NTSB case counts (simplified - would be from database)
        self.ntsb_case_counts = {
            'RUNWAY_INCURSION': 342,
            'SEPARATION_VIOLATION': 287,
            'WEATHER_RELATED': 256,
            'COMMUNICATION_ERROR': 178,
            'WAKE_TURBULENCE': 156,
            'UNSTABLE_APPROACH': 221,
        }

    def calculate_risk_score(
        self,
        risk_type: str,
        aircraft: List[Aircraft],
        weather: Optional[WeatherCondition],
        current_workload: int,
        separation_nm: Optional[float] = None,
        separation_ft: Optional[float] = None,
        time_to_impact_seconds: Optional[float] = None
    ) -> RiskScore:
        """
        Calculate comprehensive risk score

        Args:
            risk_type: Type of risk (RUNWAY_INCURSION, SEPARATION, etc.)
            aircraft: Aircraft involved
            weather: Current weather conditions
            current_workload: Controller workload (aircraft count)
            separation_nm: Horizontal separation (nautical miles)
            separation_ft: Vertical separation (feet)
            time_to_impact_seconds: Time until incident if unaddressed

        Returns:
            RiskScore with full analysis
        """

        # Component 1: NTSB Frequency (40% weight)
        ntsb_frequency = self.ntsb_frequencies.get(risk_type, 0.5)

        # Component 2: Severity (30% weight)
        severity = self._calculate_severity(
            risk_type, aircraft, separation_nm, separation_ft
        )

        # Component 3: Time Urgency (20% weight)
        time_urgency = self._calculate_time_urgency(
            time_to_impact_seconds, risk_type
        )

        # Component 4: Environmental Factors (10% weight)
        environmental = self._calculate_environmental(
            weather, current_workload
        )

        # Calculate overall score (0-100)
        score = (
            ntsb_frequency * 40.0 +
            severity * 30.0 +
            time_urgency * 20.0 +
            environmental * 10.0
        )

        # Determine tier and actions
        tier = self._get_tier(score)
        urgency = self._get_urgency_level(score, time_urgency)
        action_time = self._get_action_time(tier)
        auto_transmit = score >= 90
        requires_buzzer = score >= 70

        # NTSB statistical data
        ntsb_case_count = self.ntsb_case_counts.get(risk_type, 0)
        incident_percentage = ntsb_frequency * 100  # Convert to percentage

        return RiskScore(
            score=round(score, 1),
            tier=tier,
            urgency=urgency,
            ntsb_frequency=ntsb_frequency,
            severity=severity,
            time_urgency=time_urgency,
            environmental=environmental,
            action_time_seconds=action_time,
            auto_transmit=auto_transmit,
            requires_buzzer=requires_buzzer,
            ntsb_case_count=ntsb_case_count,
            incident_percentage=round(incident_percentage, 1)
        )

    def _calculate_severity(
        self,
        risk_type: str,
        aircraft: List[Aircraft],
        separation_nm: Optional[float],
        separation_ft: Optional[float]
    ) -> float:
        """
        Calculate severity component (0-1)

        Factors:
        - Number of aircraft involved
        - Aircraft types (heavy jets more severe)
        - Current separation
        - Risk type criticality
        """

        severity = 0.5  # Baseline

        # Aircraft count multiplier
        if len(aircraft) >= 3:
            severity += 0.2
        elif len(aircraft) == 2:
            severity += 0.1

        # Separation criticality
        if separation_nm is not None:
            if separation_nm < 1.0:
                severity += 0.3  # Very dangerous
            elif separation_nm < 2.0:
                severity += 0.2
            elif separation_nm < 3.0:
                severity += 0.1

        if separation_ft is not None:
            if separation_ft < 500:
                severity += 0.3
            elif separation_ft < 1000:
                severity += 0.2
            elif separation_ft < 1500:
                severity += 0.1

        # Risk type inherent severity
        high_severity_types = ['RUNWAY_INCURSION', 'SEPARATION_VIOLATION']
        if risk_type in high_severity_types:
            severity += 0.2

        return min(severity, 1.0)  # Cap at 1.0

    def _calculate_time_urgency(
        self,
        time_to_impact: Optional[float],
        risk_type: str
    ) -> float:
        """
        Calculate time-based urgency (0-1)

        Less time = higher urgency
        """

        if time_to_impact is None:
            # Default urgency based on risk type
            urgent_types = ['RUNWAY_INCURSION', 'SEPARATION_VIOLATION']
            return 0.8 if risk_type in urgent_types else 0.5

        # Convert seconds to urgency score
        if time_to_impact <= 30:
            return 1.0  # Immediate danger
        elif time_to_impact <= 60:
            return 0.9  # Critical urgency
        elif time_to_impact <= 120:
            return 0.7  # High urgency
        elif time_to_impact <= 300:
            return 0.5  # Moderate urgency
        else:
            return 0.3  # Lower urgency

    def _calculate_environmental(
        self,
        weather: Optional[WeatherCondition],
        current_workload: int
    ) -> float:
        """
        Calculate environmental factors (0-1)

        Factors:
        - Weather conditions
        - Controller workload
        - Time of day
        - Visibility
        """

        environmental = 0.3  # Baseline

        # Weather factors
        if weather:
            # Low visibility increases risk
            if weather.visibility_sm < 3.0:
                environmental += 0.3
            elif weather.visibility_sm < 5.0:
                environmental += 0.2

            # Strong winds increase risk
            if weather.wind_speed_kts > 25:
                environmental += 0.2
            elif weather.wind_speed_kts > 15:
                environmental += 0.1

            # Weather phenomena
            if weather.phenomena:
                if any(wx in ['TS', 'SN', 'FG'] for wx in weather.phenomena):
                    environmental += 0.2

        # Workload factors
        if current_workload > 20:
            environmental += 0.3  # Very high workload
        elif current_workload > 15:
            environmental += 0.2
        elif current_workload > 10:
            environmental += 0.1

        return min(environmental, 1.0)  # Cap at 1.0

    def _get_tier(self, score: float) -> RiskTier:
        """Map score to risk tier"""
        if score >= 90:
            return RiskTier.CRITICAL
        elif score >= 70:
            return RiskTier.HIGH
        elif score >= 50:
            return RiskTier.MEDIUM
        else:
            return RiskTier.LOW

    def _get_urgency_level(self, score: float, time_urgency: float) -> UrgencyLevel:
        """Map score and time urgency to urgency level (for voice synthesis)"""
        if score >= 90 or time_urgency >= 0.9:
            return UrgencyLevel.IMMEDIATE
        elif score >= 70 or time_urgency >= 0.7:
            return UrgencyLevel.URGENT
        elif score >= 50:
            return UrgencyLevel.ROUTINE
        else:
            return UrgencyLevel.ADVISORY

    def _get_action_time(self, tier: RiskTier) -> int:
        """Get required action time in seconds"""
        action_times = {
            RiskTier.CRITICAL: 60,    # 1 minute
            RiskTier.HIGH: 180,       # 3 minutes
            RiskTier.MEDIUM: 600,     # 10 minutes
            RiskTier.LOW: 1800        # 30 minutes
        }
        return action_times[tier]

    def get_risk_factors(
        self,
        risk_score: RiskScore,
        risk_type: str
    ) -> List[RiskFactor]:
        """
        Break down risk score into individual factors
        Shows what's contributing to the overall risk
        """

        factors = []

        # NTSB Frequency factor
        factors.append(RiskFactor(
            name="NTSB Historical Frequency",
            value=risk_score.ntsb_frequency,
            weight=0.4,
            contribution=risk_score.ntsb_frequency * 40.0,
            description=f"{risk_score.incident_percentage}% of serious incidents involve {risk_type.lower().replace('_', ' ')}",
            ntsb_references=[f"{risk_score.ntsb_case_count} cases in database"]
        ))

        # Severity factor
        factors.append(RiskFactor(
            name="Incident Severity",
            value=risk_score.severity,
            weight=0.3,
            contribution=risk_score.severity * 30.0,
            description=self._get_severity_description(risk_score.severity),
            ntsb_references=[]
        ))

        # Time urgency factor
        factors.append(RiskFactor(
            name="Time Criticality",
            value=risk_score.time_urgency,
            weight=0.2,
            contribution=risk_score.time_urgency * 20.0,
            description=self._get_urgency_description(risk_score.time_urgency),
            ntsb_references=[]
        ))

        # Environmental factor
        factors.append(RiskFactor(
            name="Environmental Conditions",
            value=risk_score.environmental,
            weight=0.1,
            contribution=risk_score.environmental * 10.0,
            description=self._get_environmental_description(risk_score.environmental),
            ntsb_references=[]
        ))

        return factors

    def _get_severity_description(self, severity: float) -> str:
        """Get human-readable severity description"""
        if severity >= 0.8:
            return "Extremely high potential for catastrophic outcome"
        elif severity >= 0.6:
            return "High potential for serious incident"
        elif severity >= 0.4:
            return "Moderate potential for incident"
        else:
            return "Lower severity, monitoring recommended"

    def _get_urgency_description(self, urgency: float) -> str:
        """Get human-readable urgency description"""
        if urgency >= 0.9:
            return "Immediate action required - seconds matter"
        elif urgency >= 0.7:
            return "Urgent action required within minutes"
        elif urgency >= 0.5:
            return "Timely action recommended"
        else:
            return "Monitor and address when practical"

    def _get_environmental_description(self, environmental: float) -> str:
        """Get human-readable environmental description"""
        if environmental >= 0.7:
            return "Challenging conditions significantly increasing risk"
        elif environmental >= 0.5:
            return "Adverse conditions contributing to risk"
        elif environmental >= 0.3:
            return "Some environmental factors present"
        else:
            return "Favorable conditions"

    def calculate_workload_metrics(
        self,
        aircraft_count: int,
        alerts: List[EnhancedRiskAlert]
    ) -> WorkloadMetrics:
        """
        Calculate controller workload assessment
        """

        # Count alerts by tier
        critical_alerts = sum(1 for a in alerts if a.risk_score.tier == RiskTier.CRITICAL)
        high_alerts = sum(1 for a in alerts if a.risk_score.tier == RiskTier.HIGH)
        medium_alerts = sum(1 for a in alerts if a.risk_score.tier == RiskTier.MEDIUM)
        low_alerts = sum(1 for a in alerts if a.risk_score.tier == RiskTier.LOW)

        # Calculate workload score (0-100)
        # Sector capacity (not single position): 50-60 aircraft typical for a sector
        workload_score = min(
            (aircraft_count / 55.0) * 60 +  # Aircraft count (60% weight) - sector capacity
            (critical_alerts * 10) +         # Critical alerts (major impact)
            (high_alerts * 5) +              # High alerts
            (medium_alerts * 2),             # Medium alerts
            100.0
        )

        # Determine workload level
        if workload_score >= 80:
            workload_level = "CRITICAL"
        elif workload_score >= 60:
            workload_level = "HIGH"
        elif workload_score >= 40:
            workload_level = "MODERATE"
        else:
            workload_level = "LOW"

        # Capacity
        max_safe_aircraft = 55  # Sector capacity (not single position)
        capacity_percentage = min((aircraft_count / max_safe_aircraft) * 100, 100)

        # Simple projections (would be more sophisticated with traffic flow data)
        projected_15min = min(workload_score * 1.1, 100)  # Assume slight increase
        projected_30min = min(workload_score * 1.2, 100)

        # Recommendations
        recommendations = []
        if workload_score >= 80:
            recommendations.append("Request additional controller support")
            recommendations.append("Consider traffic management initiatives")
        if critical_alerts > 0:
            recommendations.append(f"Prioritize {critical_alerts} CRITICAL alert(s)")
        if aircraft_count > 20:
            recommendations.append("Approaching maximum safe capacity")

        return WorkloadMetrics(
            aircraft_count=aircraft_count,
            active_alerts=len(alerts),
            critical_alerts=critical_alerts,
            high_alerts=high_alerts,
            medium_alerts=medium_alerts,
            low_alerts=low_alerts,
            workload_score=round(workload_score, 1),
            workload_level=workload_level,
            max_safe_aircraft=max_safe_aircraft,
            capacity_percentage=round(capacity_percentage, 1),
            projected_workload_15min=round(projected_15min, 1),
            projected_workload_30min=round(projected_30min, 1),
            workload_recommendations=recommendations
        )


# Global instance
risk_scoring_engine = RiskScoringEngine()
