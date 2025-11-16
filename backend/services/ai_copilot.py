import anthropic
from typing import List, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Aircraft, WeatherCondition, RiskAlert
from config import get_settings

settings = get_settings()

class AICopilot:
    """
    Claude-powered AI copilot for advanced reasoning
    """

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.ai_model

    async def analyze_complex_situation(
        self,
        aircraft: List[Aircraft],
        weather: Optional[WeatherCondition],
        alerts: List[RiskAlert]
    ) -> str:
        """
        Use Claude to analyze complex situations requiring advanced reasoning
        """
        # Build context
        context = self._build_context(aircraft, weather, alerts)

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=settings.ai_max_tokens,
                temperature=settings.ai_temperature,
                system="""You are ARES (Aerial Risk Evaluation System), an AI copilot for air traffic controllers.
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
- Consider controller workload during skeleton crew operations""",
                messages=[
                    {
                        "role": "user",
                        "content": context
                    }
                ]
            )

            response = message.content[0].text
            return response

        except Exception as e:
            print(f"❌ Error in AI analysis: {e}")
            return "AI analysis unavailable. Proceeding with rule-based risk detection."

    def _build_context(
        self,
        aircraft: List[Aircraft],
        weather: Optional[WeatherCondition],
        alerts: List[RiskAlert]
    ) -> str:
        """Build context string for Claude"""
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
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                temperature=0.2,  # Very low for consistent phraseology
                system="""You are an expert in FAA air traffic control phraseology.
Generate ONLY the exact radio transmission using standard ATC phraseology.
Be concise. Do not explain or add commentary.""",
                messages=[
                    {
                        "role": "user",
                        "content": f"""Generate ATC radio transmission for:
Aircraft: {aircraft_callsign}
Situation: {alert.description}
Action Required: {alert.recommended_action}

Output ONLY the radio transmission text."""
                    }
                ]
            )

            return message.content[0].text.strip()

        except Exception as e:
            print(f"❌ Error generating communication: {e}")
            # Fallback to rule-based
            return f"{aircraft_callsign}, {alert.recommended_action}"
