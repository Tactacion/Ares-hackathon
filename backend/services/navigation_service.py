import math
from typing import List, Tuple
from models import Aircraft

class NavigationService:
    def __init__(self):
        pass

    def calculate_safe_corridor(self, aircraft: Aircraft, hazard_center: Tuple[float, float] = None) -> List[Tuple[float, float]]:
        """
        Calculates a safe corridor (curved path) for the aircraft to avoid a hazard.
        Returns a list of [lon, lat] coordinates.
        """
        path = []
        start_lat = aircraft.latitude
        start_lon = aircraft.longitude
        heading_rad = math.radians(aircraft.heading_deg)

        # If no specific hazard, simulate a "weather avoidance" turn to the right
        # We'll generate a smooth Bezier-like curve: 
        # 1. Current Pos
        # 2. Forward 10nm
        # 3. Right Turn 30 degrees, forward 20nm
        # 4. Rejoin original heading

        # Simple step-based generation for demo robustness
        current_lat = start_lat
        current_lon = start_lon
        current_heading = heading_rad

        # 1. Start point
        path.append([current_lon, current_lat])

        # 2. Generate 20 points for a smooth curve
        for i in range(1, 21):
            # Gradually turn right (change heading)
            turn_rate = math.radians(2) # 2 degrees per step
            current_heading += turn_rate

            # Move forward 1nm per step
            dist_nm = 1.0
            dist_deg = dist_nm / 60.0 # Approx degrees

            current_lat += math.cos(current_heading) * dist_deg
            current_lon += math.sin(current_heading) * dist_deg

            path.append([current_lon, current_lat])
        
        # 3. Straighten out for another 10 points
        for i in range(10):
             # Move forward 1nm per step
            dist_nm = 1.0
            dist_deg = dist_nm / 60.0

            current_lat += math.cos(current_heading) * dist_deg
            current_lon += math.sin(current_heading) * dist_deg

            path.append([current_lon, current_lat])

        return path

navigation_service = NavigationService()
