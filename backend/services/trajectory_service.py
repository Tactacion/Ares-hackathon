import math
from typing import List, Tuple
from models import Aircraft

class TrajectoryService:
    """
    Calculates future aircraft positions based on current telemetry.
    """

    @staticmethod
    def calculate_trajectory(aircraft: Aircraft, duration_seconds: int = 90, interval_seconds: int = 30) -> List[List[float]]:
        """
        Calculate future positions for an aircraft.
        Returns a list of [lon, lat] coordinates.
        """
        path = []
        
        # Current position
        current_lat = aircraft.latitude
        current_lon = aircraft.longitude
        
        # Convert speed to meters per second (1 knot = 0.514444 m/s)
        speed_mps = aircraft.velocity_kts * 0.514444
        
        # Convert heading to radians
        heading_rad = math.radians(aircraft.heading_deg)
        
        # Earth radius in meters
        R = 6371000
        
        for t in range(interval_seconds, duration_seconds + 1, interval_seconds):
            distance_m = speed_mps * t
            
            # Calculate new position using simplified flat-earth approximation for short distances
            # or Haversine destination formula for better accuracy
            
            # Destination point given distance and bearing from start point
            lat1 = math.radians(current_lat)
            lon1 = math.radians(current_lon)
            
            lat2 = math.asin(math.sin(lat1) * math.cos(distance_m / R) +
                             math.cos(lat1) * math.sin(distance_m / R) * math.cos(heading_rad))
            
            lon2 = lon1 + math.atan2(math.sin(heading_rad) * math.sin(distance_m / R) * math.cos(lat1),
                                     math.cos(distance_m / R) - math.sin(lat1) * math.sin(lat2))
            
            new_lat = math.degrees(lat2)
            new_lon = math.degrees(lon2)
            
            path.append([new_lon, new_lat])
            
        return path

    @staticmethod
    def detect_conflicts(aircraft_list: List[Aircraft], separation_min_nm: float = 3.0) -> List[dict]:
        """
        Detect potential future conflicts based on trajectories.
        (Simplified implementation for demo)
        """
        conflicts = []
        # Logic to check if paths intersect or come too close would go here
        return conflicts

trajectory_service = TrajectoryService()
