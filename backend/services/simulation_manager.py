"""
Enhanced Simulation Manager
Creates realistic ATC scenarios with separation violations, workload, and emergencies
"""

import random
from typing import List, Dict
from datetime import datetime
from models import Aircraft
import asyncio


class SimulationScenario:
    """Represents a simulation scenario"""
    def __init__(self, name: str, description: str, aircraft_count: int):
        self.name = name
        self.description = description
        self.aircraft_count = aircraft_count
        self.aircraft: List[Aircraft] = []
        self.created_at = datetime.now()


class EnhancedSimulationManager:
    """
    Creates realistic ATC simulation scenarios:
    - Separation violations (aircraft too close)
    - High workload situations (many aircraft)
    - Emergency scenarios
    - Conflict resolution challenges
    """

    def __init__(self, target_airport_lat: float, target_airport_lon: float):
        self.center_lat = target_airport_lat
        self.center_lon = target_airport_lon
        self.active_scenario = None

    def create_separation_violation_scenario(self) -> List[Aircraft]:
        """
        Create 2-4 aircraft with GUARANTEED CRITICAL separation violations
        Returns aircraft that WILL trigger IMMEDIATE agent actions with voice
        """
        aircraft = []

        # VIOLATION 1: CRITICAL - 2nm separation, same altitude (< 3nm, < 1000ft)
        aircraft.append(Aircraft(
            callsign="AAL123",
            icao24="aal123",
            latitude=self.center_lat + 0.017,  # ~1nm north
            longitude=self.center_lon,
            altitude_ft=35000,
            velocity_kts=450,
            heading_deg=180,  # Heading south
            vertical_rate_fpm=0,
            on_ground=False,
            last_contact=datetime.now().timestamp()
        ))

        aircraft.append(Aircraft(
            callsign="UAL456",
            icao24="ual456",
            latitude=self.center_lat - 0.017,  # ~1nm south
            longitude=self.center_lon,
            altitude_ft=35200,  # 200ft vertical - CRITICAL!
            velocity_kts=450,
            heading_deg=0,  # Heading north - COLLISION COURSE!
            vertical_rate_fpm=0,
            on_ground=False,
            last_contact=datetime.now().timestamp()
        ))

        # VIOLATION 2: CRITICAL - Vertical separation loss (< 1000ft)
        aircraft.append(Aircraft(
            callsign="DAL789",
            icao24="dal789",
            latitude=self.center_lat + 0.025,
            longitude=self.center_lon + 0.025,
            altitude_ft=25000,
            velocity_kts=400,
            heading_deg=270,
            vertical_rate_fpm=1500,  # Climbing into next aircraft!
            on_ground=False,
            last_contact=datetime.now().timestamp()
        ))

        aircraft.append(Aircraft(
            callsign="SWA234",
            icao24="swa234",
            latitude=self.center_lat + 0.025,  # SAME POSITION
            longitude=self.center_lon + 0.025,
            altitude_ft=25800,  # Only 800ft separation - VIOLATION!
            velocity_kts=380,
            heading_deg=270,
            vertical_rate_fpm=0,
            on_ground=False,
            last_contact=datetime.now().timestamp()
        ))

        # VIOLATION 3: Near-miss for preventive actions
        aircraft.append(Aircraft(
            callsign="FFT3496",
            icao24="fft3496",
            latitude=self.center_lat - 0.05,
            longitude=self.center_lon - 0.05,
            altitude_ft=33000,
            velocity_kts=420,
            heading_deg=45,
            vertical_rate_fpm=0,
            on_ground=False,
            last_contact=datetime.now().timestamp()
        ))

        aircraft.append(Aircraft(
            callsign="G11390",
            icao24="g11390",
            latitude=self.center_lat - 0.04,  # 4nm apart, closing
            longitude=self.center_lon - 0.06,
            altitude_ft=33400,  # 400ft vertical
            velocity_kts=430,
            heading_deg=225,  # Converging
            vertical_rate_fpm=0,
            on_ground=False,
            last_contact=datetime.now().timestamp()
        ))

        print(f"✅ CRITICAL SCENARIO: {len(aircraft)} aircraft with GUARANTEED separation violations")
        print(f"   🚨 AAL123 vs UAL456: 2nm apart, 200ft vertical - IMMEDIATE ACTION REQUIRED")
        print(f"   🚨 DAL789 vs SWA234: 800ft vertical separation - CRITICAL")
        print(f"   ⚠️  FFT3496 vs G11390: Converging paths - PREVENTIVE ACTION")
        print(f"   → Separation Manager WILL issue IMMEDIATE clearances with voice")

        return aircraft

    def create_high_workload_scenario(self) -> List[Aircraft]:
        """
        Create 15-25 aircraft for high workload simulation
        Various altitudes, speeds, and headings
        """
        aircraft = []
        airlines = ["AAL", "UAL", "DAL", "SWA", "JBU", "FDX", "UPS", "SKW", "RPA"]

        num_aircraft = random.randint(15, 25)

        for i in range(num_aircraft):
            airline = random.choice(airlines)
            flight_num = random.randint(100, 9999)
            callsign = f"{airline}{flight_num}"

            # Distribute around airport (within 30nm)
            lat_offset = random.uniform(-0.5, 0.5)
            lon_offset = random.uniform(-0.5, 0.5)

            # Various altitudes to create complexity
            altitude_levels = [23000, 25000, 27000, 29000, 31000, 33000, 35000, 37000, 39000, 41000]
            altitude = random.choice(altitude_levels)

            # Variety of phases
            phase = random.choice(["arriving", "departing", "cruise"])

            if phase == "arriving":
                heading = self._calculate_heading_to_airport(
                    self.center_lat + lat_offset,
                    self.center_lon + lon_offset
                )
                vertical_rate = random.randint(-1800, -800)
                speed = random.randint(250, 300)
            elif phase == "departing":
                heading = random.randint(0, 359)
                vertical_rate = random.randint(1200, 2400)
                speed = random.randint(250, 350)
            else:  # cruise
                heading = random.randint(0, 359)
                vertical_rate = random.randint(-200, 200)
                speed = random.randint(400, 500)

            aircraft.append(Aircraft(
                callsign=callsign,
                icao24=callsign.lower(),
                latitude=self.center_lat + lat_offset,
                longitude=self.center_lon + lon_offset,
                altitude_ft=altitude,
                velocity_kts=speed,
                heading_deg=heading,
                vertical_rate_fpm=vertical_rate,
                on_ground=False,
                last_contact=datetime.now().timestamp()
            ))

        print(f"✅ Created high workload scenario with {len(aircraft)} aircraft")
        return aircraft

    def create_emergency_scenario(self) -> List[Aircraft]:
        """
        Create emergency scenario with:
        - One aircraft declaring emergency
        - Surrounding traffic that needs to be cleared
        - Priority handling situation
        """
        aircraft = []

        # Emergency aircraft
        aircraft.append(Aircraft(
            callsign="AAL911",
            icao24="aal911",
            latitude=self.center_lat + 0.1,
            longitude=self.center_lon,
            altitude_ft=28000,
            velocity_kts=300,
            heading_deg=90,  # Heading to airport
            vertical_rate_fpm=-1500,  # Emergency descent
            on_ground=False,
            last_contact=datetime.now().timestamp()
        ))

        # Surrounding traffic that needs to be moved
        surrounding = [
            ("UAL555", self.center_lat + 0.08, self.center_lon + 0.05, 28000, 270),
            ("DAL666", self.center_lat + 0.12, self.center_lon - 0.05, 29000, 180),
            ("SWA777", self.center_lat + 0.10, self.center_lon + 0.03, 27000, 0),
            ("JBU888", self.center_lat + 0.09, self.center_lon - 0.02, 28000, 90),
        ]

        for callsign, lat, lon, alt, hdg in surrounding:
            aircraft.append(Aircraft(
                callsign=callsign,
                icao24=callsign.lower(),
                latitude=lat,
                longitude=lon,
                altitude_ft=alt,
                velocity_kts=400,
                heading_deg=hdg,
                vertical_rate_fpm=0,
                on_ground=False,
                last_contact=datetime.now().timestamp()
            ))

        print(f"✅ Created emergency scenario: AAL911 emergency descent")
        print(f"   - 4 surrounding aircraft need immediate traffic management")
        return aircraft

    def create_approach_sequence_scenario(self) -> List[Aircraft]:
        """
        Create aircraft on final approach requiring sequencing
        Tests spacing and flow management
        """
        aircraft = []

        # 5 aircraft on approach, needs spacing adjustment
        approaches = [
            ("AAL100", 10, 3000),  # 10nm out, 3000ft
            ("UAL200", 8, 2400),   # 8nm out, 2400ft - TOO CLOSE to AAL100!
            ("DAL300", 15, 4500),  # 15nm out, 4500ft
            ("SWA400", 6, 1800),   # 6nm out, 1800ft
            ("JBU500", 12, 3600),  # 12nm out, 3600ft
        ]

        for callsign, distance_nm, altitude in approaches:
            # Calculate position based on distance from airport
            lat_offset = -distance_nm * 0.0167  # Approaching from north

            aircraft.append(Aircraft(
                callsign=callsign,
                icao24=callsign.lower(),
                latitude=self.center_lat + lat_offset,
                longitude=self.center_lon,
                altitude_ft=altitude,
                velocity_kts=180,
                heading_deg=180,  # All heading to runway
                vertical_rate_fpm=-700,
                on_ground=False,
                last_contact=datetime.now().timestamp()
            ))

        print(f"✅ Created approach sequencing scenario with {len(aircraft)} aircraft")
        print(f"   - UAL200 needs spacing adjustment (too close to AAL100)")
        return aircraft

    def _calculate_heading_to_airport(self, from_lat: float, from_lon: float) -> int:
        """Calculate heading from position to airport"""
        import math

        lat_diff = self.center_lat - from_lat
        lon_diff = self.center_lon - from_lon

        heading_rad = math.atan2(lon_diff, lat_diff)
        heading_deg = int(heading_rad * 180 / math.pi)

        # Normalize to 0-359
        return (heading_deg + 360) % 360

    def get_scenario_list(self) -> List[Dict]:
        """Get list of available scenarios"""
        return [
            {
                "id": "separation_violation",
                "name": "Separation Violations",
                "description": "Multiple aircraft with separation conflicts requiring immediate action",
                "aircraft_count": 4,
                "difficulty": "HIGH"
            },
            {
                "id": "high_workload",
                "name": "High Workload",
                "description": "15-25 aircraft requiring traffic management and sequencing",
                "aircraft_count": 20,
                "difficulty": "MEDIUM"
            },
            {
                "id": "emergency",
                "name": "Emergency Handling",
                "description": "Aircraft emergency with surrounding traffic requiring priority handling",
                "aircraft_count": 5,
                "difficulty": "HIGH"
            },
            {
                "id": "approach_sequence",
                "name": "Approach Sequencing",
                "description": "Multiple aircraft on final requiring spacing adjustments",
                "aircraft_count": 5,
                "difficulty": "MEDIUM"
            }
        ]

    def create_scenario(self, scenario_id: str) -> List[Aircraft]:
        """Create a specific scenario by ID"""
        if scenario_id == "separation_violation":
            return self.create_separation_violation_scenario()
        elif scenario_id == "high_workload":
            return self.create_high_workload_scenario()
        elif scenario_id == "emergency":
            return self.create_emergency_scenario()
        elif scenario_id == "approach_sequence":
            return self.create_approach_sequence_scenario()
        else:
            return self.create_separation_violation_scenario()  # Default


# Global instance will be initialized in main.py
simulation_manager = None
