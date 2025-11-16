"""
NTSB Aviation Accident Database Scraper
Focuses on accidents from 2023-2025 related to:
- Runway incursions
- Separation violations
- Weather-related incidents
- Communication breakdowns
"""

import json
from typing import List, Dict
import time
import os

class NTSBScraper:
    """
    NTSB aviation accident database scraper with demo data fallback
    """

    def __init__(self):
        self.accidents = []

    def fetch_accidents(self, start_date="2023-01-01", end_date="2025-12-31"):
        """
        Fetch accidents - using demo data for initial setup
        """
        print("📦 Using demo accident data based on real NTSB patterns...")

        # Create realistic demo data based on actual NTSB cases
        self.accidents = self._create_demo_data()
        print(f"✅ Loaded {len(self.accidents)} demo accident records")

        return self.accidents

    def _create_demo_data(self) -> List[Dict]:
        """
        Create realistic demo data based on actual NTSB accident patterns
        """
        demo_accidents = [
            # Runway Incursions
            {
                "EventId": "20230145",
                "EventDate": "2023-03-15",
                "EventCity": "Denver, CO",
                "Make": "Boeing 737",
                "NarrativeCause": "Runway incursion occurred when aircraft crossed active runway without clearance during low visibility conditions. Tower controller was working combined position due to staffing shortage.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20230289",
                "EventDate": "2023-06-22",
                "EventCity": "Chicago, IL",
                "Make": "Airbus A320",
                "NarrativeCause": "Aircraft on runway when another aircraft was cleared to land. Fog reduced visibility to 1/2 mile. Controller workload was high.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20230456",
                "EventDate": "2023-08-10",
                "EventCity": "Atlanta, GA",
                "Make": "Embraer 175",
                "NarrativeCause": "Taxi clearance confusion led to aircraft entering active runway. Low ceiling and reduced visibility were factors.",
                "TotalFatalInjuries": 0
            },

            # Separation Violations
            {
                "EventId": "20230567",
                "EventDate": "2023-09-05",
                "EventCity": "New York, NY",
                "Make": "Multiple Aircraft",
                "NarrativeCause": "Loss of separation between two aircraft due to controller workload. TCAS resolution advisory issued. Inadequate separation of 1.8 nautical miles.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20230678",
                "EventDate": "2023-10-12",
                "EventCity": "Los Angeles, CA",
                "Make": "Boeing 777",
                "NarrativeCause": "Near miss reported by pilots. Separation reduced to 2.1 nautical miles horizontally and 600 feet vertically during high traffic period.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20230789",
                "EventDate": "2023-11-20",
                "EventCity": "Miami, FL",
                "Make": "Airbus A321",
                "NarrativeCause": "Traffic conflict alert activated. Controller working skeleton crew during budget constraints. Separation fell below minimums.",
                "TotalFatalInjuries": 0
            },

            # Weather-Related
            {
                "EventId": "20230890",
                "EventDate": "2023-12-08",
                "EventCity": "Seattle, WA",
                "Make": "Boeing 737",
                "NarrativeCause": "Go-around performed due to weather. Heavy rain and fog reduced visibility to 1/4 mile. Wind shear reported on final approach.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20240123",
                "EventDate": "2024-01-15",
                "EventCity": "Boston, MA",
                "Make": "Airbus A319",
                "NarrativeCause": "Turbulence encounter during approach in thunderstorm conditions. Multiple weather phenomena including rain and wind.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20240234",
                "EventDate": "2024-02-22",
                "EventCity": "Denver, CO",
                "Make": "Canadair RJ",
                "NarrativeCause": "Snow and freezing conditions contributed to runway excursion. Visibility was 1/2 mile in snow showers.",
                "TotalFatalInjuries": 0
            },

            # Communication Issues
            {
                "EventId": "20240345",
                "EventDate": "2024-03-10",
                "EventCity": "Dallas, TX",
                "Make": "Boeing 787",
                "NarrativeCause": "Radio communication breakdown between tower and aircraft. Pilot misunderstood clearance instructions during busy traffic period.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20240456",
                "EventDate": "2024-04-18",
                "EventCity": "San Francisco, CA",
                "Make": "Airbus A350",
                "NarrativeCause": "Clearance read-back error not caught by controller. High workload and distraction cited as factors.",
                "TotalFatalInjuries": 0
            },

            # Additional realistic cases
            {
                "EventId": "20240567",
                "EventDate": "2024-05-25",
                "EventCity": "Phoenix, AZ",
                "Make": "Boeing 737 MAX",
                "NarrativeCause": "Runway incursion during taxi operations. Aircraft crossed hold-short line. Controller was managing multiple frequencies alone.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20240678",
                "EventDate": "2024-06-30",
                "EventCity": "Orlando, FL",
                "Make": "Airbus A320neo",
                "NarrativeCause": "Weather-related go-around. Thunderstorm with heavy rain reduced visibility below minimums during final approach.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20240789",
                "EventDate": "2024-07-14",
                "EventCity": "Charlotte, NC",
                "Make": "Embraer E190",
                "NarrativeCause": "Separation violation during departure sequence. Controller workload was critical due to staffing shortage.",
                "TotalFatalInjuries": 0
            },
            {
                "EventId": "20240890",
                "EventDate": "2024-08-20",
                "EventCity": "Las Vegas, NV",
                "Make": "Boeing 757",
                "NarrativeCause": "Taxi conflict at intersection. Low visibility due to fog. Both aircraft received conflicting taxi instructions.",
                "TotalFatalInjuries": 0
            },
        ]

        return demo_accidents

    def extract_risk_patterns(self) -> Dict:
        """
        Extract common risk patterns from accident data
        """
        patterns = {
            "runway_incursion": [],
            "separation_violation": [],
            "weather_related": [],
            "communication_breakdown": [],
            "go_around_late": []
        }

        for accident in self.accidents:
            narrative = accident.get("NarrativeCause", "").lower()

            # Runway incursion detection
            if any(term in narrative for term in ["runway incursion", "taxi", "crossed runway", "on runway"]):
                patterns["runway_incursion"].append({
                    "id": accident.get("EventId"),
                    "date": accident.get("EventDate"),
                    "location": accident.get("EventCity"),
                    "aircraft": accident.get("Make"),
                    "narrative": accident.get("NarrativeCause"),
                    "injuries": accident.get("TotalFatalInjuries", 0)
                })

            # Separation violations
            if any(term in narrative for term in ["separation", "conflict", "near miss", "tcas"]):
                patterns["separation_violation"].append({
                    "id": accident.get("EventId"),
                    "date": accident.get("EventDate"),
                    "narrative": accident.get("NarrativeCause")
                })

            # Weather-related
            if any(term in narrative for term in ["weather", "visibility", "fog", "wind", "turbulence", "rain", "snow"]):
                patterns["weather_related"].append({
                    "id": accident.get("EventId"),
                    "conditions": self.extract_weather_conditions(narrative),
                    "narrative": accident.get("NarrativeCause")
                })

            # Communication issues
            if any(term in narrative for term in ["communication", "radio", "misunderstand", "clearance"]):
                patterns["communication_breakdown"].append({
                    "id": accident.get("EventId"),
                    "narrative": accident.get("NarrativeCause")
                })

        # Calculate statistics
        stats = {
            "total_accidents": len(self.accidents),
            "runway_incursions": len(patterns["runway_incursion"]),
            "separation_violations": len(patterns["separation_violation"]),
            "weather_related": len(patterns["weather_related"]),
            "communication_breakdowns": len(patterns["communication_breakdown"])
        }

        print(f"\n📊 Risk Pattern Statistics:")
        print(f"  Runway Incursions: {stats['runway_incursions']}")
        print(f"  Separation Violations: {stats['separation_violations']}")
        print(f"  Weather-Related: {stats['weather_related']}")
        print(f"  Communication Issues: {stats['communication_breakdowns']}")

        return {
            "patterns": patterns,
            "statistics": stats,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

    def extract_weather_conditions(self, narrative: str) -> List[str]:
        """Extract weather conditions from narrative"""
        conditions = []
        weather_terms = {
            "fog": "FG",
            "mist": "BR",
            "rain": "RA",
            "snow": "SN",
            "thunderstorm": "TS",
            "wind": "WIND",
            "turbulence": "TURB"
        }

        for term, code in weather_terms.items():
            if term in narrative.lower():
                conditions.append(code)

        return conditions

    def save_data(self, filename="backend/data/ntsb_accidents.json"):
        """Save scraped data to JSON"""
        # Get absolute path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        full_path = os.path.join(project_root, filename)

        # Ensure directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        with open(full_path, 'w') as f:
            json.dump({
                "accidents": self.accidents,
                "total_count": len(self.accidents)
            }, f, indent=2)
        print(f"✅ Saved {len(self.accidents)} accidents to {full_path}")

    def save_patterns(self, patterns: Dict, filename="backend/data/risk_patterns.json"):
        """Save extracted patterns"""
        # Get absolute path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        full_path = os.path.join(project_root, filename)

        # Ensure directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        with open(full_path, 'w') as f:
            json.dump(patterns, f, indent=2)
        print(f"✅ Saved risk patterns to {full_path}")

if __name__ == "__main__":
    print("🚀 ARES NTSB Data Scraper")
    print("=" * 50)

    scraper = NTSBScraper()

    # Fetch accidents
    print("\n📥 Fetching NTSB accident data...")
    scraper.fetch_accidents()

    # Extract patterns
    print("\n🔍 Extracting risk patterns...")
    patterns = scraper.extract_risk_patterns()

    # Save data
    print("\n💾 Saving data...")
    scraper.save_data()
    scraper.save_patterns(patterns)

    print("\n✅ NTSB data processing complete!")
    print("\nYou can now start the ARES backend!")
