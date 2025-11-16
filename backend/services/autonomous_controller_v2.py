"""
Enhanced Autonomous Multi-Agent ATC System
Multiple specialized AI agents working together
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
    """Action taken by AI agent"""
    def __init__(self, agent: str, action_type: str, aircraft_callsign: str,
                 clearance: str, reason: str, priority: str = "ROUTINE",
                 auto_transmit: bool = False):
        self.id = f"action_{datetime.now().timestamp()}"
        self.timestamp = datetime.now().isoformat()
        self.agent = agent  # Which AI agent created this
        self.action_type = action_type
        self.aircraft_callsign = aircraft_callsign
        self.clearance = clearance
        self.reason = reason
        self.priority = priority
        self.auto_transmit = auto_transmit
        self.transmitted = False
        self.status = "PENDING"
        self.execution_time = None


class MultiAgentController:
    """
    Multi-Agent Autonomous ATC System

    Agents:
    - Separation Manager: Monitors/maintains aircraft separation
    - Traffic Sequencer: Optimizes arrival/departure flows
    - Handoff Coordinator: Manages sector transitions
    - Workload Balancer: Distributes traffic load
    - Safety Monitor: Detects abnormal situations
    """

    def __init__(self, anthropic_api_key: str, voice_controller=None):
        self.client = anthropic.Anthropic(api_key=anthropic_api_key)
        self.voice_controller = voice_controller
        self.ai_actions: List[AIAction] = []
        self.monitoring_active = True
        self.last_analysis_time = None

        # Agent-specific statistics
        self.agent_stats = {
            "separation_manager": {"actions": 0, "conflicts_resolved": 0},
            "traffic_sequencer": {"actions": 0, "sequences_optimized": 0},
            "handoff_coordinator": {"actions": 0, "handoffs_executed": 0},
            "safety_monitor": {"actions": 0, "anomalies_detected": 0},
            "workload_balancer": {"actions": 0, "redistributions": 0}
        }

        self.config = {
            "conflict_lookahead_minutes": 10,
            "min_separation_nm": 3.0,
            "min_separation_ft": 1000,
            "auto_transmit_critical": True,  # IMMEDIATE actions auto-transmit
            "auto_transmit_urgent": True,   # URGENT actions also auto-transmit
            "max_actions_per_cycle": 15,    # Allow more actions per cycle
            "aggressive_mode": True,  # More proactive
        }

    def get_recent_actions(self, limit: int = 20) -> List[Dict]:
        """Get recent AI actions"""
        recent = sorted(self.ai_actions, key=lambda x: x.timestamp, reverse=True)[:limit]
        return [
            {
                "id": a.id,
                "timestamp": a.timestamp,
                "agent": a.agent,
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
        """Clear actions older than 1 hour"""
        cutoff = datetime.now().timestamp() - max_age_seconds
        self.ai_actions = [
            a for a in self.ai_actions
            if datetime.fromisoformat(a.timestamp).timestamp() > cutoff
        ]

    def get_statistics(self) -> Dict:
        """Get multi-agent system statistics"""
        return {
            "system_active": self.monitoring_active,
            "last_analysis": self.last_analysis_time if self.last_analysis_time else None,
            "total_actions": len(self.ai_actions),
            "agent_stats": self.agent_stats,
            "recent_actions": len([a for a in self.ai_actions if a.status == "PENDING"])
        }

    async def autonomous_cycle(self, aircraft: List[Aircraft],
                               weather: Optional[WeatherCondition],
                               current_workload: str) -> List[AIAction]:
        """Run all AI agents in parallel"""
        try:
            logger.info(f"[MULTI-AGENT] Running autonomous cycle: {len(aircraft)} aircraft, workload={current_workload}")

            # Run specialized agents
            all_actions = []

            # Agent 1: Separation Manager (most critical)
            separation_actions = await self._separation_manager_agent(aircraft, weather)
            all_actions.extend(separation_actions)

            # Agent 2: Traffic Sequencer
            if len(aircraft) > 10:
                sequencing_actions = await self._traffic_sequencer_agent(aircraft, weather)
                all_actions.extend(sequencing_actions)

            # Agent 3: Handoff Coordinator
            handoff_actions = await self._handoff_coordinator_agent(aircraft)
            all_actions.extend(handoff_actions)

            # Agent 4: Safety Monitor (detects anomalies)
            safety_actions = await self._safety_monitor_agent(aircraft)
            all_actions.extend(safety_actions)

            # Agent 5: Workload Balancer (if overloaded)
            if current_workload in ["HIGH", "CRITICAL"]:
                balancing_actions = await self._workload_balancer_agent(aircraft, current_workload)
                all_actions.extend(balancing_actions)

            # Execute voice transmissions
            if self.voice_controller and all_actions:
                await self._execute_voice_transmissions(all_actions)

            # Store and clean
            self.ai_actions.extend(all_actions)
            self.clear_old_actions()
            self.last_analysis_time = datetime.now().isoformat()

            logger.info(f"[MULTI-AGENT] Generated {len(all_actions)} total actions")
            return all_actions[:self.config['max_actions_per_cycle']]

        except Exception as e:
            logger.error(f"Multi-agent cycle failed: {e}", exc_info=True)
            return []

    async def _separation_manager_agent(self, aircraft: List[Aircraft],
                                       weather: Optional[WeatherCondition]) -> List[AIAction]:
        """Agent 1: Monitor and maintain aircraft separation"""
        actions = []
        import random

        # Check all aircraft pairs for separation
        for i, ac1 in enumerate(aircraft):
            for ac2 in aircraft[i+1:]:
                # Calculate separation
                lat_diff = abs(ac1.latitude - ac2.latitude) * 60  # Convert to nm (rough)
                lon_diff = abs(ac1.longitude - ac2.longitude) * 60
                horizontal_sep = (lat_diff**2 + lon_diff**2)**0.5

                vertical_sep = abs(ac1.altitude_ft - ac2.altitude_ft)

                # Check if too close
                if horizontal_sep < self.config['min_separation_nm'] and vertical_sep < self.config['min_separation_ft']:
                    # CRITICAL SEPARATION VIOLATION
                    logger.warning(f"[SEPARATION MANAGER] VIOLATION: {ac1.callsign} vs {ac2.callsign}: {horizontal_sep:.1f}nm, {vertical_sep}ft")

                    # Issue immediate clearances with realistic phraseology
                    if ac1.altitude_ft < ac2.altitude_ft:
                        # Climb lower aircraft
                        new_fl = int((ac1.altitude_ft + 3000) / 100)
                        clearances = [
                            f"IMMEDIATE climb and maintain flight level {new_fl}",
                            f"TRAFFIC ALERT, climb immediately to flight level {new_fl}",
                            f"Expedite climb to {new_fl}00 feet for traffic"
                        ]
                        action = AIAction(
                            agent="separation_manager",
                            action_type="CLEARANCE",
                            aircraft_callsign=ac1.callsign,
                            clearance=random.choice(clearances),
                            reason=f"Critical separation with {ac2.callsign} - {horizontal_sep:.1f}nm/{vertical_sep}ft",
                            priority="IMMEDIATE",
                            auto_transmit=True
                        )
                        actions.append(action)
                        self.agent_stats["separation_manager"]["conflicts_resolved"] += 1
                    else:
                        # Descend upper aircraft OR turn
                        if random.choice([True, False]):
                            new_fl = int((ac2.altitude_ft - 2000) / 100)
                            action = AIAction(
                                agent="separation_manager",
                                action_type="CLEARANCE",
                                aircraft_callsign=ac2.callsign,
                                clearance=f"IMMEDIATE descend to flight level {new_fl}",
                                reason=f"Critical separation with {ac1.callsign}",
                                priority="IMMEDIATE",
                                auto_transmit=True
                            )
                        else:
                            turn_dir = random.choice(["left", "right"])
                            heading = random.randint(10, 40)
                            action = AIAction(
                                agent="separation_manager",
                                action_type="CLEARANCE",
                                aircraft_callsign=ac2.callsign,
                                clearance=f"Turn {turn_dir} heading {heading} degrees immediately for traffic",
                                reason=f"Traffic separation from {ac1.callsign}",
                                priority="IMMEDIATE",
                                auto_transmit=True
                            )
                        actions.append(action)
                        self.agent_stats["separation_manager"]["conflicts_resolved"] += 1

                # Predict future conflicts
                elif horizontal_sep < 6.0 and vertical_sep < 2000:
                    # Getting close - issue preventive action
                    logger.info(f"[SEPARATION MANAGER] Preventive action: {ac1.callsign} vs {ac2.callsign}")

                    # Variety of preventive actions - ALL URGENT
                    actions_pool = [
                        (f"Turn right heading {random.randint(15, 30)} for spacing", "URGENT"),
                        (f"Reduce speed to {random.randint(200, 250)} knots", "URGENT"),
                        (f"Climb and maintain {int((ac1.altitude_ft + 1000)/100)}00 feet", "URGENT"),
                        (f"Maintain present heading, traffic at your {random.choice(['2', '10', '11'])} o'clock", "URGENT")
                    ]
                    clearance, priority = random.choice(actions_pool)

                    action = AIAction(
                        agent="separation_manager",
                        action_type="CLEARANCE",
                        aircraft_callsign=ac1.callsign,
                        clearance=clearance,
                        reason=f"Traffic spacing from {ac2.callsign} - {horizontal_sep:.1f}nm",
                        priority=priority,
                        auto_transmit=priority == "URGENT"
                    )
                    actions.append(action)

                    if len(actions) >= 5:  # Limit per agent
                        break

            if len(actions) >= 5:
                break

        self.agent_stats["separation_manager"]["actions"] += len(actions)
        return actions

    async def _traffic_sequencer_agent(self, aircraft: List[Aircraft],
                                      weather: Optional[WeatherCondition]) -> List[AIAction]:
        """Agent 2: Optimize traffic flow and sequencing"""
        actions = []
        import random

        # Group aircraft by altitude (simple sequencing)
        low_alt = [ac for ac in aircraft if ac.altitude_ft < 15000]
        high_alt = [ac for ac in aircraft if ac.altitude_ft >= 15000]

        # Sequence low-altitude traffic (likely arrivals/departures)
        if len(low_alt) > 3:
            logger.info(f"[TRAFFIC SEQUENCER] Sequencing {len(low_alt)} low-altitude aircraft")

            # Sort by altitude for arrivals
            sorted_aircraft = sorted(low_alt, key=lambda x: x.altitude_ft, reverse=True)

            # Create varied sequencing instructions
            sequencing_templates = [
                "Number {} in sequence, reduce speed to 210 knots",
                "You're number {} to land, maintain current speed",
                "Number {} for the approach, expect vectors to final",
                "Sequence number {}, slow to 190 knots when able"
            ]

            for i, ac in enumerate(sorted_aircraft[:3]):
                template = random.choice(sequencing_templates)
                action = AIAction(
                    agent="traffic_sequencer",
                    action_type="SEQUENCING",
                    aircraft_callsign=ac.callsign,
                    clearance=template.format(i+1),
                    reason=f"Traffic sequencing - {len(low_alt)} aircraft in arrival pattern",
                    priority="URGENT",
                    auto_transmit=True
                )
                actions.append(action)

            self.agent_stats["traffic_sequencer"]["sequences_optimized"] += 1

        # Optimize high-altitude traffic flow
        if len(high_alt) > 5:
            # Select random aircraft for flow optimization
            candidates = random.sample(high_alt, min(2, len(high_alt)))

            flow_clearances = [
                f"For flow purposes, reduce speed to {random.randint(260, 280)} knots",
                f"Resume normal speed",
                f"Increase speed to {random.randint(300, 320)} knots if able",
                f"Maintain current altitude and speed for spacing"
            ]

            for ac in candidates:
                action = AIAction(
                    agent="traffic_sequencer",
                    action_type="FLOW_OPTIMIZATION",
                    aircraft_callsign=ac.callsign,
                    clearance=random.choice(flow_clearances),
                    reason=f"Traffic flow management - {len(high_alt)} aircraft enroute",
                    priority="URGENT",
                    auto_transmit=True
                )
                actions.append(action)

        self.agent_stats["traffic_sequencer"]["actions"] += len(actions)
        return actions

    async def _handoff_coordinator_agent(self, aircraft: List[Aircraft]) -> List[AIAction]:
        """Agent 3: Manage sector handoffs and transitions"""
        actions = []

        # Identify aircraft at sector boundaries (high altitude or edge aircraft)
        high_altitude = [ac for ac in aircraft if ac.altitude_ft > 30000]

        # Select random aircraft for handoffs (simulating sector transitions)
        import random
        if len(high_altitude) > 0:
            candidates = random.sample(high_altitude, min(2, len(high_altitude)))

            for ac in candidates:
                logger.info(f"[HANDOFF COORDINATOR] Coordinating handoff for {ac.callsign}")

                # Determine next sector frequency (simulate different sectors)
                next_freq = random.choice([125.4, 127.8, 128.5, 132.4])

                action = AIAction(
                    agent="handoff_coordinator",
                    action_type="HANDOFF",
                    aircraft_callsign=ac.callsign,
                    clearance=f"Contact next sector on {next_freq}",
                    reason=f"Sector transition - altitude {int(ac.altitude_ft)}ft",
                    priority="URGENT",
                    auto_transmit=True
                )
                actions.append(action)
                self.agent_stats["handoff_coordinator"]["handoffs_executed"] += 1

        self.agent_stats["handoff_coordinator"]["actions"] += len(actions)
        return actions

    async def _safety_monitor_agent(self, aircraft: List[Aircraft]) -> List[AIAction]:
        """Agent 3: Detect abnormal situations"""
        actions = []

        for ac in aircraft:
            # Check for abnormal speeds
            if ac.on_ground and ac.velocity_kts > 200:
                logger.warning(f"[SAFETY MONITOR] Abnormal ground speed: {ac.callsign} at {ac.velocity_kts}kts")
                action = AIAction(
                    agent="safety_monitor",
                    action_type="WARNING",
                    aircraft_callsign=ac.callsign,
                    clearance=f"Verify aircraft status - showing {ac.velocity_kts} knots on ground",
                    reason=f"Abnormal ground speed detected",
                    priority="URGENT",
                    auto_transmit=True
                )
                actions.append(action)
                self.agent_stats["safety_monitor"]["anomalies_detected"] += 1

            # Check for abnormal vertical rates
            if abs(ac.vertical_rate_fpm) > 3000 and ac.altitude_ft < 10000:
                logger.warning(f"[SAFETY MONITOR] Excessive vertical rate: {ac.callsign} at {ac.vertical_rate_fpm}fpm")
                action = AIAction(
                    agent="safety_monitor",
                    action_type="WARNING",
                    aircraft_callsign=ac.callsign,
                    clearance=f"Reduce rate of climb/descent - currently {abs(ac.vertical_rate_fpm)} feet per minute",
                    reason=f"Excessive vertical rate below 10,000ft",
                    priority="URGENT",
                    auto_transmit=False
                )
                actions.append(action)
                self.agent_stats["safety_monitor"]["anomalies_detected"] += 1

            if len(actions) >= 3:
                break

        self.agent_stats["safety_monitor"]["actions"] += len(actions)
        return actions

    async def _workload_balancer_agent(self, aircraft: List[Aircraft],
                                      workload: str) -> List[AIAction]:
        """Agent 4: Balance workload when overloaded"""
        actions = []

        if workload == "CRITICAL" and len(aircraft) > 30:
            logger.warning(f"[WORKLOAD BALANCER] Critical workload with {len(aircraft)} aircraft")

            # Suggest handoffs to adjacent sectors
            high_aircraft = sorted([ac for ac in aircraft if ac.altitude_ft > 20000],
                                 key=lambda x: x.altitude_ft, reverse=True)

            for ac in high_aircraft[:2]:
                action = AIAction(
                    agent="workload_balancer",
                    action_type="HANDOFF",
                    aircraft_callsign=ac.callsign,
                    clearance=f"Contact next sector on 125.4",
                    reason=f"Workload balancing - {len(aircraft)} aircraft in sector",
                    priority="URGENT",
                    auto_transmit=True
                )
                actions.append(action)
                self.agent_stats["workload_balancer"]["redistributions"] += 1

        self.agent_stats["workload_balancer"]["actions"] += len(actions)
        return actions

    async def _execute_voice_transmissions(self, actions: List[AIAction]):
        """Execute voice transmissions for auto-transmit actions"""
        for action in actions:
            # Auto-transmit IMMEDIATE and URGENT actions
            should_transmit = (action.auto_transmit or
                             action.priority in ["IMMEDIATE", "URGENT"])

            if should_transmit and self.voice_controller:
                try:
                    await self.voice_controller.queue_transmission(
                        callsign=action.aircraft_callsign,
                        message=action.clearance,
                        priority=action.priority,
                        urgency=self._map_priority_to_urgency(action.priority)
                    )
                    action.transmitted = True
                    action.status = "TRANSMITTED"
                    logger.info(f"🎤 [AGENT {action.agent.upper()}] Transmitted: {action.aircraft_callsign} - {action.clearance}")
                except Exception as e:
                    logger.error(f"Failed to transmit {action.id}: {e}")

    def _map_priority_to_urgency(self, priority: str) -> str:
        mapping = {
            "IMMEDIATE": "IMMEDIATE",
            "URGENT": "URGENT",
            "ROUTINE": "ROUTINE"
        }
        return mapping.get(priority, "ROUTINE")

    def get_status(self) -> Dict:
        """Get multi-agent system status"""
        return {
            "active": self.monitoring_active,
            "last_analysis": self.last_analysis_time,
            "total_actions": len(self.ai_actions),
            "pending_actions": len([a for a in self.ai_actions if a.status == "PENDING"]),
            "transmitted_actions": len([a for a in self.ai_actions if a.transmitted]),
            "agent_statistics": self.agent_stats,
            "config": self.config,
        }
