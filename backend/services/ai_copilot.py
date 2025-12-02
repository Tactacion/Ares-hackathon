import google.generativeai as genai
from typing import List, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Aircraft, WeatherCondition, RiskAlert
from config import get_settings

settings = get_settings()

class AICopilot:
    """
    Gemini-powered AI copilot for advanced reasoning
    """

    def __init__(self):
        # Configure Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            genai.configure(api_key=gemini_key)
            self.model = genai.GenerativeModel('gemini-2.5-pro')
        else:
            print("⚠️ GEMINI_API_KEY not found in environment variables")
            self.model = None

    async def analyze_complex_situation(
        self,
        aircraft: List[Aircraft],
        weather: Optional[WeatherCondition],
        alerts: List[RiskAlert]
    ) -> str:
        """
        Use Gemini to analyze complex situations requiring advanced reasoning
        """
        if not self.model:
            return "AI analysis unavailable. API key missing."

        # Build context
        context = self._build_context(aircraft, weather, alerts)

        try:
            prompt = f"""You are ARES (Aerial Risk Evaluation System), an AI copilot for air traffic controllers.
Your role is to analyze aviation safety situations and provide clear, actionable recommendations.

You have access to:
1. Real-time aircraft positions and states
2. Current weather conditions
3. NTSB accident database patterns

When analyzing situations:
- Be concise and direct
- Prioritize safety above all else
- Reference NTSB data when relevant
- Provide specific actions, not vague advice
- Use standard ATC phraseology for pilot communications
- Consider controller workload during skeleton crew operations

CONTEXT:
{context}
"""
            response = await self.model.generate_content_async(prompt)
            return response.text

        except Exception as e:
            print(f"❌ Error in AI analysis: {e}")
            return "AI analysis unavailable. Proceeding with rule-based risk detection."

    def _build_context(
        self,
        aircraft: List[Aircraft],
        weather: Optional[WeatherCondition],
        alerts: List[RiskAlert]
    ) -> str:
        """Build context string for Gemini"""
        context = "# Current Situation Analysis Request\n\n"

        # Aircraft summary
        context += f"## Aircraft in Sector: {len(aircraft)}\n"
        for ac in aircraft[:5]:  # Limit to 5 for brevity
            context += f"- {ac.callsign}: {ac.altitude_ft}ft, {ac.velocity_kts}kts, "
            context += f"{'ON GROUND' if ac.on_ground else 'AIRBORNE'}\n"

        if len(aircraft) > 5:
            context += f"... and {len(aircraft) - 5} more aircraft\n"

        # Weather
        if weather:
            context += f"\n## Weather Conditions\n"
            context += f"- Visibility: {weather.visibility_sm}SM\n"
            context += f"- Wind: {weather.wind_direction_deg}° at {weather.wind_speed_kts}kts\n"
            if weather.phenomena:
                context += f"- Phenomena: {', '.join(weather.phenomena)}\n"
            if weather.ceiling_ft:
                context += f"- Ceiling: {weather.ceiling_ft}ft\n"

        # Active alerts
        if alerts:
            context += f"\n## Active Risk Alerts: {len(alerts)}\n"
            for alert in alerts:
                context += f"\n### {alert.severity} - {alert.risk_type}\n"
                context += f"- Description: {alert.description}\n"
                context += f"- Aircraft: {', '.join(alert.aircraft_involved)}\n"
                if alert.ntsb_reference:
                    context += f"- NTSB Reference: {alert.ntsb_reference.event_id}\n"
                context += f"- Recommended Action: {alert.recommended_action}\n"
        else:
            context += "\n## No Active Alerts\nSector appears nominal.\n"

        context += "\n## Analysis Request\n"
        context += "Provide a brief (2-3 sentence) assessment of the current situation. "
        context += "If there are alerts, prioritize which to address first and why. "
        context += "If the situation is nominal, suggest proactive measures given the weather/traffic.\n"

        return context

    async def generate_pilot_communication(
        self,
        alert: RiskAlert,
        aircraft_callsign: str
    ) -> str:
        """
        Generate proper ATC phraseology for pilot communication
        """
        if not self.model:
            return f"{aircraft_callsign}, {alert.recommended_action}"

        try:
            prompt = f"""You are an expert in FAA air traffic control phraseology.
Generate ONLY the exact radio transmission using standard ATC phraseology.
Be concise. Do not explain or add commentary.

Generate ATC radio transmission for:
Aircraft: {aircraft_callsign}
Situation: {alert.description}
Action Required: {alert.recommended_action}

Output ONLY the radio transmission text."""

            response = await self.model.generate_content_async(prompt)
            return response.text.strip()

        except Exception as e:
            print(f"❌ Error generating communication: {e}")
            # Fallback to rule-based
            return f"{aircraft_callsign}, {alert.recommended_action}"
