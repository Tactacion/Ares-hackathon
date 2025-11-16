"""
Transmission and Voice Communication Models
For context-aware voice synthesis and transmission queue management
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum
from models.risk_score import UrgencyLevel


class Priority(str, Enum):
    """Transmission priority levels"""
    EMERGENCY = "EMERGENCY"      # Interrupts everything
    CRITICAL = "CRITICAL"        # Interrupts routine
    ROUTINE = "ROUTINE"          # Normal order
    ADVISORY = "ADVISORY"        # Lowest priority


class TransmissionStatus(str, Enum):
    """Status of a transmission"""
    QUEUED = "QUEUED"            # Waiting to transmit
    TRANSMITTING = "TRANSMITTING"  # Currently being sent
    TRANSMITTED = "TRANSMITTED"  # Sent, awaiting readback
    CONFIRMED = "CONFIRMED"      # Readback received and correct
    INCORRECT = "INCORRECT"      # Readback incorrect
    NO_RESPONSE = "NO_RESPONSE"  # No readback received
    FAILED = "FAILED"            # Failed to transmit


class ReadbackStatus(str, Enum):
    """Readback verification status"""
    PENDING = "PENDING"          # Waiting for readback
    CORRECT = "CORRECT"          # Readback matches transmission
    INCORRECT = "INCORRECT"      # Readback does not match
    TIMEOUT = "TIMEOUT"          # No readback within time limit


class Transmission(BaseModel):
    """Single radio transmission"""
    id: str
    callsign: str
    message: str
    priority: Priority
    urgency: UrgencyLevel

    # Transmission details
    frequency: float = Field(..., description="Radio frequency (MHz)")
    created_at: datetime = Field(default_factory=datetime.now)
    queued_at: Optional[datetime] = None
    transmitted_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None

    # Status tracking
    status: TransmissionStatus = TransmissionStatus.QUEUED
    readback_status: ReadbackStatus = ReadbackStatus.PENDING

    # Audio
    audio_bytes: Optional[bytes] = None
    audio_duration_ms: Optional[int] = None

    # Readback verification
    expected_readback: Optional[str] = None
    actual_readback: Optional[str] = None
    readback_received_at: Optional[datetime] = None

    # Retry management
    retry_count: int = 0
    max_retries: int = 2
    last_retry_at: Optional[datetime] = None

    # Context
    alert_id: Optional[str] = None  # Associated alert
    context: Dict = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "tx_12345",
                "callsign": "UAL123",
                "message": "United one-two-three, descend and maintain flight level two-four-zero",
                "priority": "ROUTINE",
                "urgency": "ROUTINE",
                "frequency": 132.4,
                "status": "QUEUED"
            }
        }


class TransmissionQueueItem(BaseModel):
    """Item in the transmission queue with priority sorting"""
    transmission: Transmission
    queue_position: int
    estimated_transmit_time: Optional[datetime] = None

    # Priority calculation
    priority_score: float = Field(
        ...,
        description="Calculated priority score for queue sorting"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "transmission": {
                    "callsign": "UAL123",
                    "message": "Go around, traffic on runway",
                    "priority": "EMERGENCY"
                },
                "queue_position": 1,
                "priority_score": 100.0
            }
        }


class FrequencyStatus(BaseModel):
    """Radio frequency status and congestion"""
    frequency: float
    aircraft_count: int
    is_congested: bool
    congestion_level: float = Field(ge=0, le=1, description="0=clear, 1=saturated")

    # Transmission stats
    transmissions_last_minute: int
    average_transmission_duration_ms: int
    estimated_clear_time_ms: int

    # Current transmission
    currently_transmitting: bool = False
    current_transmission_id: Optional[str] = None
    current_transmission_ends_at: Optional[datetime] = None


class VoiceParameters(BaseModel):
    """ElevenLabs voice synthesis parameters"""
    voice_id: str = Field(default="atc_professional")

    # ElevenLabs parameters
    stability: float = Field(default=0.7, ge=0, le=1)
    similarity_boost: float = Field(default=0.9, ge=0, le=1)
    style: float = Field(default=0.3, ge=0, le=1)
    use_speaker_boost: bool = True

    # Custom modulation
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=1.0, ge=0.5, le=2.0)

    @classmethod
    def for_urgency(cls, urgency: UrgencyLevel) -> "VoiceParameters":
        """Get voice parameters for specific urgency level"""

        if urgency == UrgencyLevel.IMMEDIATE:
            # Critical: Fast, stressed, higher pitch
            return cls(
                stability=0.3,         # More variation (stressed)
                similarity_boost=0.8,
                speed=1.25,            # 25% faster
                pitch=1.15,            # Higher pitch
                style=0.8              # More emotional
            )

        elif urgency == UrgencyLevel.URGENT:
            # Urgent: Firm, clear, slightly faster
            return cls(
                stability=0.5,
                similarity_boost=0.85,
                speed=1.1,             # 10% faster
                pitch=1.05,
                style=0.5
            )

        elif urgency == UrgencyLevel.ROUTINE:
            # Routine: Calm, professional, normal
            return cls(
                stability=0.7,
                similarity_boost=0.9,
                speed=1.0,
                pitch=1.0,
                style=0.3
            )

        else:  # ADVISORY
            # Advisory: Very calm, informational
            return cls(
                stability=0.8,
                similarity_boost=0.95,
                speed=0.95,            # Slightly slower
                pitch=0.98,
                style=0.2
            )


class ReadbackVerificationResult(BaseModel):
    """Result of readback verification"""
    is_correct: bool
    confidence: float = Field(ge=0, le=1)

    # Comparison details
    transmitted: str
    readback: str

    # Discrepancies
    discrepancies: List[str] = Field(default_factory=list)
    critical_error: bool = False  # e.g., altitude readback wrong

    # Examples of discrepancies:
    # - Transmitted: "FL240", Readback: "FL340" - CRITICAL
    # - Transmitted: "UAL123", Readback: "United 123" - OK (semantic match)

    class Config:
        json_schema_extra = {
            "example": {
                "is_correct": False,
                "confidence": 0.95,
                "transmitted": "Descend and maintain flight level two-four-zero",
                "readback": "Down to flight level three-four-zero",
                "discrepancies": ["Altitude mismatch: transmitted FL240, read back FL340"],
                "critical_error": True
            }
        }


class TransmissionQueueStatus(BaseModel):
    """Overall transmission queue status"""
    queue_length: int
    estimated_total_time_ms: int

    # Breakdown by priority
    emergency_count: int = 0
    critical_count: int = 0
    routine_count: int = 0
    advisory_count: int = 0

    # Performance
    successful_transmissions_today: int = 0
    failed_transmissions_today: int = 0
    average_readback_time_ms: int = 0
    incorrect_readback_rate: float = Field(ge=0, le=1)

    # Warnings
    queue_warnings: List[str] = Field(default_factory=list)
