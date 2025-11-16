"""
Autonomous AI Controller - Does the work of 3 controllers
Uses Claude API with tool calling for real-time decision making
"""
import asyncio
import anthropic
import json
from typing import List, Dict, Optional
from datetime import datetime
from models import Aircraft, WeatherCondition
import logging

logger = logging.getLogger(__name__)


class AIAction:
    """Represents an action taken by the AI"""
    def __init__(self, action_type: str, aircraft_callsign: str, clearance: str,
                 reason: str, priority: str = "ROUTINE", auto_transmit: bool = False):
        self.id = f"action_{datetime.now().timestamp()}"
        self.timestamp = datetime.now().isoformat()
        self.action_type = action_type  # CLEARANCE, WARNING, HANDOFF, SEQUENCING
        self.aircraft_callsign = aircraft_callsign
        self.clearance = clearance
        self.reason = reason
        self.priority = priority
        self.auto_transmit = auto_transmit
        self.transmitted = False
        self.status = "PENDING"  # PENDING, TRANSMITTED, ACKNOWLEDGED, REJECTED


class AutonomousController:
    """
    AI Controller Agent that:
    - Monitors all aircraft continuously
    - Predicts conflicts 5-10 minutes ahead
    - Auto-generates clearances
    - Manages handoffs and sequencing
    - Queues voice transmissions
    """

    def __init__(self, anthropic_api_key: str, voice_controller=None):
        self.client = anthropic.Anthropic(api_key=anthropic_api_key)
        self.voice_controller = voice_controller
        self.ai_actions: List[AIAction] = []
        self.monitoring_active = False
        self.last_analysis_time = None

        # AI Controller configuration
        self.config = {
            "conflict_lookahead_minutes": 8,
            "min_separation_nm": 3.0,
            "min_separation_ft": 1000,
            "auto_transmit_critical": True,
            "auto_transmit_routine": False,
            "max_actions_per_cycle": 5,
        }

    def get_recent_actions(self, limit: int = 10) -> List[Dict]:
        """Get recent AI actions"""
        recent = sorted(self.ai_actions, key=lambda x: x.timestamp, reverse=True)[:limit]
        return [
            {
                "id": a.id,
                "timestamp": a.timestamp,
                "type": a.action_type,
                "callsign": a.aircraft_callsign,
                "clearance": a.clearance,
                "reason": a.reason,
                "priority": a.priority,
                "status": a.status,
                "transmitted": a.transmitted,
            }
            for a in recent
        ]

    def clear_old_actions(self, max_age_seconds: int = 3600):
        """Clear actions older than max_age"""
        cutoff = datetime.now().timestamp() - max_age_seconds
        self.ai_actions = [
            a for a in self.ai_actions
            if datetime.fromisoformat(a.timestamp).timestamp() > cutoff
        ]

    async def autonomous_monitoring_cycle(self, aircraft: List[Aircraft],
                                         weather: Optional[WeatherCondition],
                                         current_workload: str) -> List[AIAction]:
        """
        Main autonomous monitoring cycle - AI analyzes situation and takes actions
        """
        try:
            logger.info(f"🤖 AI CONTROLLER: Starting autonomous cycle with {len(aircraft)} aircraft")

            # Prepare situation context
            situation = self._build_situation_context(aircraft, weather, current_workload)

            # Use Claude with tool calling for decision making
            actions = await self._ai_decision_making(situation, aircraft)

            # Execute auto-transmit actions
            if self.voice_controller and actions:
                await self._execute_voice_transmissions(actions)

            # Store actions
            self.ai_actions.extend(actions)
            self.clear_old_actions()

            self.last_analysis_time = datetime.now().isoformat()

            logger.info(f"🤖 AI CONTROLLER: Generated {len(actions)} actions")
            return actions

        except Exception as e:
            logger.error(f"AI Controller cycle failed: {e}", exc_info=True)
            return []

    def _build_situation_context(self, aircraft: List[Aircraft],
                                 weather: Optional[WeatherCondition],
                                 current_workload: str) -> str:
        """Build detailed situation context for AI"""

        # Aircraft summary
        aircraft_data = []
        for ac in aircraft:
            aircraft_data.append({
                "callsign": ac.callsign,
                "altitude_ft": int(ac.altitude_ft) if ac.altitude_ft else 0,
                "heading_deg": int(ac.heading_deg) if ac.heading_deg else 0,
                "velocity_kts": int(ac.velocity_kts) if ac.velocity_kts else 0,
                "lat": round(ac.latitude, 4),
                "lon": round(ac.longitude, 4),
                "on_ground": ac.on_ground,
            })

        # Weather summary
        weather_summary = "Clear"
        if weather:
            weather_summary = f"Visibility: {weather.visibility_sm}sm, Wind: {weather.wind_speed_kts}kts @ {weather.wind_direction_deg}°"

        context = f"""CURRENT ATC SITUATION - {datetime.now().strftime('%H:%M:%S')}

SECTOR STATUS:
- Aircraft Count: {len(aircraft)}
- Controller Workload: {current_workload}
- Weather: {weather_summary}

AIRCRAFT IN SECTOR:
{json.dumps(aircraft_data, indent=2)}

YOUR ROLE:
You are an autonomous AI Air Traffic Controller. Your job is to:
1. Monitor all aircraft for potential conflicts
2. Predict conflicts 5-10 minutes ahead
3. Generate clearances to maintain safe separation (min {self.config['min_separation_nm']}nm horizontal, {self.config['min_separation_ft']}ft vertical)
4. Manage traffic flow and sequencing
5. Detect abnormal situations
6. Issue clearances proactively

SAFETY MINIMUMS:
- Horizontal: {self.config['min_separation_nm']} nautical miles
- Vertical: {self.config['min_separation_ft']} feet

Analyze this situation and determine what actions to take."""

        return context

    async def _ai_decision_making(self, situation: str, aircraft: List[Aircraft]) -> List[AIAction]:
        """Use Claude API to make real-time ATC decisions"""

        tools = [
            {
                "name": "issue_clearance",
                "description": "Issue an ATC clearance to an aircraft (altitude, heading, or speed change)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "callsign": {"type": "string", "description": "Aircraft callsign"},
                        "clearance_type": {"type": "string", "enum": ["ALTITUDE", "HEADING", "SPEED"], "description": "Type of clearance"},
                        "value": {"type": "number", "description": "New altitude (feet), heading (degrees), or speed (knots)"},
                        "reason": {"type": "string", "description": "Why this clearance is needed"},
                        "priority": {"type": "string", "enum": ["IMMEDIATE", "URGENT", "ROUTINE"], "description": "Priority level"}
                    },
                    "required": ["callsign", "clearance_type", "value", "reason", "priority"]
                }
            },
            {
                "name": "issue_warning",
                "description": "Issue a traffic advisory or safety warning to an aircraft",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "callsign": {"type": "string", "description": "Aircraft callsign"},
                        "warning_message": {"type": "string", "description": "The warning message"},
                        "traffic_callsign": {"type": "string", "description": "Conflicting traffic callsign if applicable"},
                        "priority": {"type": "string", "enum": ["IMMEDIATE", "URGENT", "ROUTINE"], "description": "Priority level"}
                    },
                    "required": ["callsign", "warning_message", "priority"]
                }
            },
            {
                "name": "predict_conflict",
                "description": "Identify a potential conflict between aircraft in the next 5-10 minutes",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "aircraft_1": {"type": "string", "description": "First aircraft callsign"},
                        "aircraft_2": {"type": "string", "description": "Second aircraft callsign"},
                        "estimated_time_minutes": {"type": "number", "description": "Estimated time to conflict in minutes"},
                        "estimated_separation_nm": {"type": "number", "description": "Estimated minimum separation in nautical miles"},
                        "recommended_action": {"type": "string", "description": "Recommended action to prevent conflict"}
                    },
                    "required": ["aircraft_1", "aircraft_2", "estimated_time_minutes", "recommended_action"]
                }
            },
        ]

        try:
            # Call Claude with tool use
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                tools=tools,
                messages=[
                    {
                        "role": "user",
                        "content": situation
                    }
                ]
            )

            # Process AI decisions
            actions = []

            for block in response.content:
                if block.type == "tool_use":
                    action = self._process_tool_call(block)
                    if action:
                        actions.append(action)

            # Limit actions per cycle
            return actions[:self.config['max_actions_per_cycle']]

        except Exception as e:
            logger.error(f"AI decision making failed: {e}", exc_info=True)
            return []

    def _process_tool_call(self, tool_block) -> Optional[AIAction]:
        """Process a tool call from Claude into an AIAction"""
        try:
            tool_name = tool_block.name
            tool_input = tool_block.input

            if tool_name == "issue_clearance":
                clearance_type = tool_input['clearance_type']
                value = tool_input['value']

                # Format clearance message
                if clearance_type == "ALTITUDE":
                    clearance = f"Climb and maintain {int(value)} feet"
                    if value < 10000:
                        clearance = f"Descend and maintain {int(value)} feet"
                elif clearance_type == "HEADING":
                    clearance = f"Turn {'left' if value < 180 else 'right'} heading {int(value)}"
                elif clearance_type == "SPEED":
                    clearance = f"{'Reduce' if value < 250 else 'Increase'} speed to {int(value)} knots"
                else:
                    clearance = f"{clearance_type} {value}"

                auto_transmit = tool_input['priority'] in ["IMMEDIATE", "URGENT"] and self.config['auto_transmit_critical']

                return AIAction(
                    action_type="CLEARANCE",
                    aircraft_callsign=tool_input['callsign'],
                    clearance=clearance,
                    reason=tool_input['reason'],
                    priority=tool_input['priority'],
                    auto_transmit=auto_transmit
                )

            elif tool_name == "issue_warning":
                warning = tool_input['warning_message']
                if 'traffic_callsign' in tool_input:
                    warning = f"Traffic alert: {tool_input['traffic_callsign']}, {warning}"

                auto_transmit = tool_input['priority'] == "IMMEDIATE" and self.config['auto_transmit_critical']

                return AIAction(
                    action_type="WARNING",
                    aircraft_callsign=tool_input['callsign'],
                    clearance=warning,
                    reason="Safety warning",
                    priority=tool_input['priority'],
                    auto_transmit=auto_transmit
                )

            elif tool_name == "predict_conflict":
                # Log conflict prediction
                logger.warning(
                    f"🚨 AI PREDICTED CONFLICT: {tool_input['aircraft_1']} vs {tool_input['aircraft_2']} "
                    f"in {tool_input['estimated_time_minutes']} minutes"
                )
                # Conflict predictions are logged but don't create direct actions
                # The AI should follow up with clearances via issue_clearance
                return None

        except Exception as e:
            logger.error(f"Failed to process tool call: {e}", exc_info=True)
            return None

    async def _execute_voice_transmissions(self, actions: List[AIAction]):
        """Execute voice transmissions for auto-transmit actions"""
        for action in actions:
            if action.auto_transmit and self.voice_controller:
                try:
                    # Queue voice transmission
                    await self.voice_controller.queue_transmission(
                        callsign=action.aircraft_callsign,
                        message=action.clearance,
                        priority=action.priority,
                        urgency=self._map_priority_to_urgency(action.priority)
                    )
                    action.transmitted = True
                    action.status = "TRANSMITTED"
                    logger.info(f"🎤 AI AUTO-TRANSMITTED: {action.aircraft_callsign} - {action.clearance}")
                except Exception as e:
                    logger.error(f"Failed to transmit {action.id}: {e}")

    def _map_priority_to_urgency(self, priority: str) -> str:
        """Map priority to urgency level for voice"""
        mapping = {
            "IMMEDIATE": "IMMEDIATE",
            "URGENT": "URGENT",
            "ROUTINE": "ROUTINE"
        }
        return mapping.get(priority, "ROUTINE")

    def get_status(self) -> Dict:
        """Get AI controller status"""
        return {
            "active": self.monitoring_active,
            "last_analysis": self.last_analysis_time,
            "total_actions": len(self.ai_actions),
            "pending_actions": len([a for a in self.ai_actions if a.status == "PENDING"]),
            "transmitted_actions": len([a for a in self.ai_actions if a.transmitted]),
            "config": self.config,
        }
