import json
import os
from typing import List, Optional, Dict
from models import NTSBReference, Aircraft
from config import get_settings

settings = get_settings()

class NTSBAnalyzer:
    """
    Analyzes current situations against NTSB accident database.
    Uses 'Risk Profiles' to detect dangerous patterns in real-time.
    """

    def __init__(self):
        self.profiles = []
        self.load_profiles()

    def load_profiles(self):
        """Load NTSB risk profiles from JSON"""
        try:
            path = os.path.join("backend", "data", "risk_profiles.json")
            if os.path.exists(path):
                with open(path, 'r') as f:
                    data = json.load(f)
                    self.profiles = data.get("profiles", [])
                print(f"✅ Loaded {len(self.profiles)} NTSB risk profiles")
            else:
                print(f"⚠️ Risk profiles not found at {path}")
        except Exception as e:
            print(f"❌ Error loading risk profiles: {e}")

    def analyze_aircraft(self, aircraft: Aircraft) -> Optional[NTSBReference]:
        """
        Compare aircraft telemetry against historical crash profiles.
        Returns an NTSBReference if a match is found.
        """
        for profile in self.profiles:
            conditions = profile.get("conditions", {})
            match = True
            
            # Check Altitude
            if "altitude_ft_max" in conditions:
                if aircraft.altitude_ft > conditions["altitude_ft_max"]:
                    match = False
            
            # Check Vertical Speed (Descent)
            if "vertical_speed_fpm_max" in conditions:
                # Note: vertical_speed is usually negative for descent
                if aircraft.vertical_rate_fpm > conditions["vertical_speed_fpm_max"]: 
                    match = False

            # Check Airspeed
            if "airspeed_kts_max" in conditions:
                if aircraft.velocity_kts > conditions["airspeed_kts_max"]:
                    match = False

            # Check Ground Status
            if "on_ground" in conditions:
                if aircraft.on_ground != conditions["on_ground"]:
                    match = False

            if match:
                return NTSBReference(
                    event_id=profile["id"],
                    date="HISTORICAL",
                    location="Similar Profile Match",
                    description=f"MATCHED PROFILE: {profile['name']}. {profile['description']}",
                    similar_factors=profile["risk_factors"]
                )
        
        return None
