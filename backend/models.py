from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Union
from datetime import datetime

class Aircraft(BaseModel):
    """Real-time aircraft state"""
    callsign: str
    icao24: str
    latitude: float
    longitude: float
    altitude_ft: float
    velocity_kts: float
    heading_deg: float
    vertical_rate_fpm: float
    on_ground: bool
    last_contact: float
    predicted_path: List[List[float]] = []  # List of [lon, lat] coordinates

class WeatherCondition(BaseModel):
    """Parsed METAR/TAF data"""
    airport: str
    observation_time: datetime
    visibility_sm: float
    ceiling_ft: Optional[int] = None
    wind_speed_kts: int
    wind_direction_deg: int
    phenomena: List[str] = []  # FG, RA, SN, etc.
    temperature_c: float
    dewpoint_c: float
    altimeter_inhg: float
    raw_metar: str

class NTSBReference(BaseModel):
    """Reference to similar NTSB accident"""
    event_id: str
    date: str
    location: str
    description: str
    similar_factors: List[str]

class RiskAlert(BaseModel):
    """AI-generated risk alert"""
    id: str
    timestamp: datetime
    risk_type: Literal["RUNWAY_INCURSION", "SEPARATION", "WEATHER", "COMMUNICATION"]
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    aircraft_involved: List[str]
    description: str
    ntsb_reference: Optional[NTSBReference] = None
    recommended_action: str
    pilot_message: Optional[str] = None  # Exact phraseology
    reasoning: str
    auto_resolve: bool = False

class SectorStatus(BaseModel):
    """Overall sector situation"""
    timestamp: datetime
    aircraft_count: int
    aircraft: List[Aircraft]
    active_alerts: List[Union['RiskAlert', 'EnhancedRiskAlert']]
    weather: Optional[WeatherCondition] = None
    controller_workload: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]
    safe_corridors: List[List[List[float]]] = [] # List of paths (each path is a list of [lon, lat])


# ============================================================================
# PROFESSIONAL FEATURES - ENHANCED MODELS
# ============================================================================

# Risk Scoring Models
class RiskTier(str):
    """Risk tier classification"""
    CRITICAL = "CRITICAL"  # 90-100
    HIGH = "HIGH"          # 70-89
    MEDIUM = "MEDIUM"      # 50-69
    LOW = "LOW"            # <50


class UrgencyLevel(str):
    """Urgency for voice synthesis"""
    IMMEDIATE = "IMMEDIATE"
    URGENT = "URGENT"
    ROUTINE = "ROUTINE"
    ADVISORY = "ADVISORY"


class RiskScore(BaseModel):
    """Comprehensive risk score"""
    score: float = Field(..., ge=0, le=100)
    tier: str  # RiskTier
    urgency: str  # UrgencyLevel

    # Components
    ntsb_frequency: float = Field(..., ge=0, le=1)
    severity: float = Field(..., ge=0, le=1)
    time_urgency: float = Field(..., ge=0, le=1)
    environmental: float = Field(..., ge=0, le=1)

    # Actions
    action_time_seconds: int
    auto_transmit: bool = False
    requires_buzzer: bool = False

    # Stats
    ntsb_case_count: int = 0
    incident_percentage: float = 0.0

    calculated_at: datetime = Field(default_factory=datetime.now)


class RiskFactor(BaseModel):
    """Individual risk factor"""
    name: str
    value: float
    weight: float
    contribution: float
    description: str
    ntsb_references: List[str] = []


class EnhancedRiskAlert(BaseModel):
    """Enhanced risk alert with scoring"""
    id: str
    timestamp: datetime
    risk_type: str
    severity: str

    risk_score: RiskScore
    risk_factors: List[RiskFactor]

    aircraft_involved: List[str]
    description: str
    current_separation: Optional[float] = None

    ntsb_reference: Optional[dict] = None

    recommended_action: str
    pilot_message: Optional[str] = None
    controller_action: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.now)
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    auto_resolve: bool = False

    escalated: bool = False
    escalation_count: int = 0
    last_escalation: Optional[datetime] = None


class WorkloadMetrics(BaseModel):
    """Controller workload metrics"""
    aircraft_count: int
    active_alerts: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int

    workload_score: float = Field(ge=0, le=100)
    workload_level: str

    max_safe_aircraft: int = 25
    capacity_percentage: float = Field(ge=0, le=100)

    projected_workload_15min: float = Field(ge=0, le=100)
    projected_workload_30min: float = Field(ge=0, le=100)

    workload_recommendations: List[str] = []


# Voice/Transmission Models
class Priority(str):
    """Transmission priority"""
    EMERGENCY = "EMERGENCY"
    CRITICAL = "CRITICAL"
    ROUTINE = "ROUTINE"
    ADVISORY = "ADVISORY"


class TransmissionStatus(str):
    """Transmission status"""
    QUEUED = "QUEUED"
    TRANSMITTING = "TRANSMITTING"
    TRANSMITTED = "TRANSMITTED"
    CONFIRMED = "CONFIRMED"
    INCORRECT = "INCORRECT"
    NO_RESPONSE = "NO_RESPONSE"
    FAILED = "FAILED"


class ReadbackStatus(str):
    """Readback verification"""
    PENDING = "PENDING"
    CORRECT = "CORRECT"
    INCORRECT = "INCORRECT"
    TIMEOUT = "TIMEOUT"
