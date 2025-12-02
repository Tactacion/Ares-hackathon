import google.generativeai as genai
import json
import os
from typing import List, Dict, Any
from models import Aircraft

class TacticalAnalyst:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️ GEMINI_API_KEY not found for TacticalAnalyst")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-pro')

    async def analyze_sector(self, aircraft_list: List[Aircraft]) -> Dict[str, Any]:
        """
        Analyzes the current aircraft positions and generates a GeoJSON FeatureCollection
        representing tactical zones (e.g., High Traffic, Conflict Risk).
        """
        if not self.model:
            print("⚠️ TacticalAnalyst model not initialized (missing key)")
            return {"type": "FeatureCollection", "features": []}
        
        # 1. Prepare Context
        aircraft_data = []
        for ac in aircraft_list:
            aircraft_data.append({
                "callsign": ac.callsign,
                "lat": ac.latitude,
                "lon": ac.longitude,
                "alt": ac.altitude_ft,
                "heading": ac.heading_deg,
                "speed": ac.velocity_kts
            })
            
        prompt = f"""
        You are an Advanced Air Traffic Tactical AI.
        Analyze the following aircraft data in the Denver sector (Center: 39.85, -104.67).
        
        Aircraft Data:
        {json.dumps(aircraft_data, indent=2)}
        
        Task:
        Identify 1-3 "Tactical Zones" based on the traffic pattern.
        Examples: "High Congestion Zone", "Converging Traffic Area", "Clear Airspace".
        
        Output:
        Return ONLY a valid GeoJSON FeatureCollection.
        Each Feature must be a Polygon.
        Properties must include:
        - "type": "CONGESTION" | "CONFLICT" | "SAFE"
        - "description": Short tactical assessment (e.g. "Heavy inbound flow")
        - "risk_level": 1-10
        
        Ensure coordinates are realistic for the Denver area (approx lat 39-40, lon -105 to -104).
        Do not include markdown formatting. Just the JSON.
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            text = response.text.strip()
            # Clean up markdown if present
            if text.startswith("```json"):
                text = text[7:-3]
            
            return json.loads(text)
        except Exception as e:
            print(f"❌ Tactical Analysis Failed: {e}")
            return {"type": "FeatureCollection", "features": []}
