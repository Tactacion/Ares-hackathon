"""
Demo data generator for ARES when live APIs are unavailable
Generates realistic traffic patterns across major US airports
"""
from typing import List
from datetime import datetime
import random
from models import Aircraft, WeatherCondition

class DemoDataGenerator:
    """Generate realistic demo flight and weather data"""

    def __init__(self):
        # Major US airports with coordinates
        self.airports = {
            "KDEN": {"lat": 39.8561, "lon": -104.6737, "name": "Denver"},
            "KLAX": {"lat": 33.9416, "lon": -118.4085, "name": "Los Angeles"},
            "KJFK": {"lat": 40.6413, "lon": -73.7781, "name": "New York JFK"},
            "KORD": {"lat": 41.9742, "lon": -87.9073, "name": "Chicago O'Hare"},
            "KATL": {"lat": 33.6407, "lon": -84.4277, "name": "Atlanta"},
            "KDFW": {"lat": 32.8998, "lon": -97.0403, "name": "Dallas"},
            "KSFO": {"lat": 37.6213, "lon": -122.3790, "name": "San Francisco"},
            "KLAS": {"lat": 36.0840, "lon": -115.1537, "name": "Las Vegas"},
            "KMIA": {"lat": 25.7959, "lon": -80.2870, "name": "Miami"},
            "KSEA": {"lat": 47.4502, "lon": -122.3088, "name": "Seattle"},
        }

        # Airline callsign prefixes
        self.airlines = [
            ("UAL", "United"),
            ("DAL", "Delta"),
            ("SWA", "Southwest"),
            ("AAL", "American"),
            ("FDX", "FedEx"),
            ("UPS", "UPS"),
            ("SKW", "SkyWest"),
            ("RPA", "Republic"),
            ("ENY", "Envoy"),
            ("JBU", "JetBlue"),
            ("ASA", "Alaska"),
            ("FFT", "Frontier"),
            ("NKS", "Spirit"),
        ]

        # General aviation
        self.ga_prefixes = ["N", "C", "G"]

        self.aircraft_positions = self._initialize_aircraft()

    def _initialize_aircraft(self):
        """Initialize 50+ aircraft across multiple airports"""
        positions = {}

        # Create 5-8 aircraft around each major airport
        for airport_code, airport_data in self.airports.items():
            num_aircraft = random.randint(5, 8)

            for i in range(num_aircraft):
                # Random airline or GA
                if random.random() < 0.7:  # 70% commercial
                    airline, _ = random.choice(self.airlines)
                    callsign = f"{airline}{random.randint(1, 9999)}"
                else:  # 30% general aviation
                    prefix = random.choice(self.ga_prefixes)
                    callsign = f"{prefix}{random.randint(10000, 99999)}"

                # Position within 40nm of airport
                lat_offset = random.uniform(-0.6, 0.6)
                lon_offset = random.uniform(-0.6, 0.6)

                # Determine phase of flight
                phase = random.choice(["departing", "arriving", "cruise", "pattern"])

                if phase == "departing":
                    altitude = random.randint(5000, 15000)
                    vertical_rate = random.randint(1500, 2500)
                    on_ground = False
                    speed = random.randint(220, 350)
                elif phase == "arriving":
                    altitude = random.randint(3000, 12000)
                    vertical_rate = random.randint(-1500, -500)
                    on_ground = False
                    speed = random.randint(180, 280)
                elif phase == "pattern":
                    altitude = random.randint(1500, 3000)
                    vertical_rate = random.randint(-500, 500)
                    on_ground = False
                    speed = random.randint(120, 180)
                else:  # cruise
                    altitude = random.randint(25000, 41000)
                    vertical_rate = random.randint(-200, 200)
                    on_ground = False
                    speed = random.randint(400, 520)

                positions[callsign] = {
                    "latitude": airport_data["lat"] + lat_offset,
                    "longitude": airport_data["lon"] + lon_offset,
                    "altitude_ft": altitude,
                    "velocity_kts": speed,
                    "heading_deg": random.randint(0, 359),
                    "vertical_rate_fpm": vertical_rate,
                    "on_ground": on_ground,
                    "airport": airport_code,
                    "phase": phase
                }

        return positions

    def get_demo_aircraft(self) -> List[Aircraft]:
        """Get simulated aircraft data with realistic movement"""
        aircraft_list = []

        for callsign, pos in self.aircraft_positions.items():
            # Update positions for realistic movement

            # Move aircraft based on heading and speed
            # Rough conversion: 1 degree lat/lon ≈ 60nm
            heading_rad = pos["heading_deg"] * 3.14159 / 180
            speed_nm_per_sec = pos["velocity_kts"] / 3600  # knots to nm/s

            # Update position (simplified, not accounting for earth curvature)
            lat_change = speed_nm_per_sec * 0.0167 * -1 * (1 if heading_rad < 3.14159 else -1) * abs(heading_rad - 1.57)
            lon_change = speed_nm_per_sec * 0.0167 * (1 if heading_rad < 1.57 or heading_rad > 4.71 else -1)

            pos["latitude"] += lat_change + random.uniform(-0.0005, 0.0005)
            pos["longitude"] += lon_change + random.uniform(-0.0005, 0.0005)

            # Update altitude based on vertical rate
            pos["altitude_ft"] += pos["vertical_rate_fpm"] / 60 * 2  # 2 second update
            pos["altitude_ft"] = max(0, min(45000, pos["altitude_ft"]))  # Clamp

            # Slight heading variation
            pos["heading_deg"] = (pos["heading_deg"] + random.randint(-3, 3)) % 360

            # Speed variation
            pos["velocity_kts"] += random.randint(-5, 5)
            pos["velocity_kts"] = max(100, min(600, pos["velocity_kts"]))

            aircraft = Aircraft(
                callsign=callsign,
                icao24=callsign.lower().replace("n", "a"),
                latitude=pos["latitude"],
                longitude=pos["longitude"],
                altitude_ft=pos["altitude_ft"],
                velocity_kts=pos["velocity_kts"],
                heading_deg=pos["heading_deg"],
                vertical_rate_fpm=pos["vertical_rate_fpm"],
                on_ground=pos["on_ground"],
                last_contact=datetime.now().timestamp()
            )
            aircraft_list.append(aircraft)

        return aircraft_list

    def get_demo_weather(self) -> WeatherCondition:
        """Get simulated weather data"""
        # Random weather conditions
        conditions = [
            ("Clear", 10.0, 25000, 8, "27008KT 10SM CLR"),
            ("Few Clouds", 10.0, 20000, 12, "27012KT 10SM FEW200"),
            ("Scattered", 8.0, 12000, 15, "27015KT 8SM SCT120"),
            ("Overcast", 5.0, 3000, 18, "27018KT 5SM OVC030"),
            ("Light Rain", 3.0, 1500, 22, "27022KT 3SM -RA BKN015 OVC025"),
        ]

        condition, vis, ceiling, wind, metar_conditions = random.choice(conditions)

        return WeatherCondition(
            airport="KDEN",
            observation_time=datetime.now(),
            visibility_sm=vis,
            ceiling_ft=ceiling,
            wind_speed_kts=wind,
            wind_direction_deg=270,
            phenomena=[],
            temperature_c=random.randint(5, 25),
            dewpoint_c=random.randint(0, 15),
            altimeter_inhg=round(random.uniform(29.80, 30.20), 2),
            raw_metar=f"KDEN {datetime.now().strftime('%d%H%M')}Z {metar_conditions} {random.randint(10, 25)}/{random.randint(0, 15)} A{random.randint(2980, 3020)}"
        )

# Global instance
demo_generator = DemoDataGenerator()
