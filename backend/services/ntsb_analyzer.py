import json
from typing import List, Optional, Dict
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import NTSBReference
from config import get_settings

settings = get_settings()

class NTSBAnalyzer:
    """
    Analyzes current situations against NTSB accident database
    This is our COMPETITIVE ADVANTAGE
    """

    def __init__(self):
        self.load_patterns()

    def load_patterns(self):
        """Load NTSB risk patterns from scraped data"""
        try:
            with open(settings.ntsb_data_path, 'r') as f:
                data = json.load(f)
                self.accidents = data.get("accidents", [])

            with open("backend/data/risk_patterns.json", 'r') as f:
                self.patterns = json.load(f).get("patterns", {})

            print(f"✅ Loaded {len(self.accidents)} NTSB accidents")
            print(f"   - {len(self.patterns.get('runway_incursion', []))} runway incursions")
            print(f"   - {len(self.patterns.get('separation_violation', []))} separation violations")

        except FileNotFoundError:
            print("⚠️ NTSB data not found. Run scrape_ntsb.py first!")
            self.accidents = []
            self.patterns = {}

    def find_similar_runway_incursion(self, scenario: str) -> Optional[NTSBReference]:
        """
        Find NTSB runway incursion case similar to current scenario
        """
        incursions = self.patterns.get("runway_incursion", [])
        if not incursions:
            return None

        # For demo, return most recent severe case
        # In production, use semantic similarity
        for incident in incursions:
            if incident.get("injuries", 0) > 0:  # Severe case
                return NTSBReference(
                    event_id=incident.get("id", "UNKNOWN"),
                    date=incident.get("date", ""),
                    location=incident.get("location", ""),
                    description=incident.get("narrative", "")[:200],
                    similar_factors=["runway_occupied", "clearance_issued", "low_visibility"]
                )

        # Fallback to first incident
        incident = incursions[0]
        return NTSBReference(
            event_id=incident.get("id", "UNKNOWN"),
            date=incident.get("date", ""),
            location=incident.get("location", ""),
            description=incident.get("narrative", "")[:200],
            similar_factors=["runway_incursion"]
        )

    def find_similar_separation_violation(self) -> Optional[NTSBReference]:
        """Find similar separation violation case"""
        violations = self.patterns.get("separation_violation", [])
        if not violations:
            return None

        incident = violations[0]
        return NTSBReference(
            event_id=incident.get("id", "UNKNOWN"),
            date=incident.get("date", ""),
            location="Multiple locations",
            description=incident.get("narrative", "")[:200],
            similar_factors=["inadequate_separation", "controller_workload"]
        )

    def get_weather_accident_count(self, conditions: List[str]) -> int:
        """Count NTSB accidents with similar weather conditions"""
        weather_incidents = self.patterns.get("weather_related", [])
        count = 0

        for incident in weather_incidents:
            incident_conditions = incident.get("conditions", [])
            if any(cond in incident_conditions for cond in conditions):
                count += 1

        return count
        for incident in weather_incidents:
            incident_conditions = incident.get("conditions", [])
            if any(cond in incident_conditions for cond in conditions):
                count += 1

        return count
