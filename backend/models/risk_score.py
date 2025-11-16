"""
Enhanced Risk Scoring Models
Multi-layered risk assessment with NTSB frequency weighting
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RiskTier(str, Enum):
    """Risk tier classification"""
    CRITICAL = "CRITICAL"  # 90-100: Act in 60 seconds
    HIGH = "HIGH"          # 70-89: Act in 3 minutes
    MEDIUM = "MEDIUM"      # 50-69: Monitor closely
    LOW = "LOW"            # <50: Awareness only


class UrgencyLevel(str, Enum):
    """Urgency classification for voice synthesis"""
    IMMEDIATE = "IMMEDIATE"     # Critical, stressed voice
    URGENT = "URGENT"           # High priority, firm voice
    ROUTINE = "ROUTINE"         # Normal ATC cadence
    ADVISORY = "ADVISORY"       # Informational, calm voice


class RiskScore(BaseModel):
    """Comprehensive risk score with multi-factor analysis"""
    score: float = Field(..., ge=0, le=100, description="Overall risk score 0-100")
    tier: RiskTier = Field(..., description="Risk tier classification")
    urgency: UrgencyLevel = Field(..., description="Urgency level for voice")

    # Score components
    ntsb_frequency: float = Field(..., ge=0, le=1, description="NTSB occurrence frequency")
    severity: float = Field(..., ge=0, le=1, description="Potential impact severity")
    time_urgency: float = Field(..., ge=0, le=1, description="Time-based urgency")
    environmental: float = Field(..., ge=0, le=1, description="Environmental factors")

    # Action requirements
    action_time_seconds: int = Field(..., description="Required action time in seconds")
    auto_transmit: bool = Field(default=False, description="Auto-transmit if no controller response")
    requires_buzzer: bool = Field(default=False, description="Alert with audible buzzer")

    # Statistical backing
    ntsb_case_count: int = Field(default=0, description="Number of similar NTSB cases")
    incident_percentage: float = Field(default=0.0, description="% of serious incidents")

    # Timing
    calculated_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "score": 92.5,
                "tier": "CRITICAL",
                "urgency": "IMMEDIATE",
                "ntsb_frequency": 0.85,
                "severity": 0.95,
                "time_urgency": 0.90,
                "environmental": 0.70,
                "action_time_seconds": 60,
                "auto_transmit": True,
                "requires_buzzer": True,
                "ntsb_case_count": 47,
                "incident_percentage": 34.2
            }
        }


class RiskFactor(BaseModel):
    """Individual risk factor contribution"""
    name: str
    value: float = Field(ge=0, le=1)
    weight: float = Field(ge=0, le=1)
    contribution: float = Field(ge=0, le=100)
    description: str
    ntsb_references: List[str] = Field(default_factory=list)


class EnhancedRiskAlert(BaseModel):
    """Enhanced risk alert with full scoring details"""
    id: str
    timestamp: datetime
    risk_type: str
    severity: str  # Will be replaced by risk_score.tier

    # Enhanced risk scoring
    risk_score: RiskScore
    risk_factors: List[RiskFactor]

    # Aircraft and situation
    aircraft_involved: List[str]
    description: str
    current_separation: Optional[float] = None  # nm or ft

    # NTSB references (basic - will enhance later)
    ntsb_reference: Optional[dict] = None

    # Actions
    recommended_action: str
    pilot_message: Optional[str] = None
    controller_action: Optional[str] = None

    # Timing and status
    created_at: datetime = Field(default_factory=datetime.now)
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    auto_resolve: bool = False

    # Escalation
    escalated: bool = False
    escalation_count: int = 0
    last_escalation: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "alert_12345",
                "timestamp": "2025-11-15T14:52:00Z",
                "risk_type": "RUNWAY_INCURSION",
                "severity": "CRITICAL",
                "risk_score": {
                    "score": 92.5,
                    "tier": "CRITICAL",
                    "urgency": "IMMEDIATE",
                    "action_time_seconds": 60,
                    "auto_transmit": True
                },
                "aircraft_involved": ["UAL123", "DAL456"],
                "description": "Aircraft on runway with landing aircraft on final",
                "recommended_action": "Go around immediately",
                "pilot_message": "United 123, go around, traffic on runway"
            }
        }


class WorkloadMetrics(BaseModel):
    """Controller workload assessment"""
    aircraft_count: int
    active_alerts: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int

    # Workload score (0-100)
    workload_score: float = Field(ge=0, le=100)
    workload_level: str  # LOW, MODERATE, HIGH, CRITICAL

    # Capacity
    max_safe_aircraft: int = Field(default=25)
    capacity_percentage: float = Field(ge=0, le=100)

    # Predictions
    projected_workload_15min: float = Field(ge=0, le=100)
    projected_workload_30min: float = Field(ge=0, le=100)

    # Recommendations
    workload_recommendations: List[str] = Field(default_factory=list)
