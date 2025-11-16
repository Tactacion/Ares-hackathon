"""
Task Models for ATC Workflow System
Converts alerts into actionable tasks with priority, deduplication, and auto-expiration
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TaskPriority(str, Enum):
    """Task priority levels"""
    HIGH = "HIGH"           # Critical - immediate action required
    MEDIUM = "MEDIUM"       # Important - action needed soon
    LOW = "LOW"            # Advisory - FYI or preventive


class TaskCategory(str, Enum):
    """Task categories"""
    SEPARATION = "SEPARATION"           # Separation violation
    ALTITUDE = "ALTITUDE"               # Altitude issue
    SPEED = "SPEED"                     # Speed issue
    HEADING = "HEADING"                 # Heading issue
    WEATHER = "WEATHER"                 # Weather-related
    CONFLICT = "CONFLICT"               # Predicted conflict
    RUNWAY = "RUNWAY"                   # Runway incursion
    COMMUNICATION = "COMMUNICATION"     # Communication issue
    OTHER = "OTHER"                     # Other issues


class TaskStatus(str, Enum):
    """Task status"""
    ACTIVE = "ACTIVE"           # Currently active
    RESOLVED = "RESOLVED"       # Manually resolved
    EXPIRED = "EXPIRED"         # Auto-expired (aircraft left or issue resolved)


class Task(BaseModel):
    """Single actionable task for ATC"""
    id: str

    # Aircraft info
    aircraft_icao24: str
    aircraft_callsign: str

    # Task classification
    priority: TaskPriority
    category: TaskCategory
    status: TaskStatus = TaskStatus.ACTIVE

    # Task content
    summary: str = Field(..., description="One-line summary of the issue")
    description: str = Field(..., description="Detailed description")
    ai_action: Optional[str] = None  # What the AI did/will do
    pilot_message: Optional[str] = None  # Message to transmit to pilot

    # Audio
    audio_file: Optional[str] = None
    has_audio: bool = False

    # Deduplication fingerprint
    fingerprint: str = Field(..., description="Unique identifier: icao24 + category + priority")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    last_seen: datetime = Field(default_factory=datetime.now)
    resolved_at: Optional[datetime] = None

    # Related alert/action
    alert_id: Optional[str] = None
    action_id: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "task_12345",
                "aircraft_icao24": "A12345",
                "aircraft_callsign": "AAL123",
                "priority": "HIGH",
                "category": "SEPARATION",
                "summary": "2.1nm from UAL456 - Separation violation",
                "description": "AAL123 is 2.1nm from UAL456 with only 500ft vertical separation",
                "ai_action": "Turn left heading 280°",
                "pilot_message": "American one-two-three, turn left heading two-eight-zero for traffic",
                "fingerprint": "A12345_SEPARATION_HIGH"
            }
        }


class TaskList(BaseModel):
    """Collection of tasks"""
    tasks: List[Task] = []
    active_count: int = 0
    high_priority_count: int = 0
    medium_priority_count: int = 0
    low_priority_count: int = 0
    last_updated: datetime = Field(default_factory=datetime.now)
