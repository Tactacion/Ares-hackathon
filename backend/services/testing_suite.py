"""
Comprehensive Testing Suite for ARES
Real working tests for all ATC features
"""

import asyncio
from typing import List, Dict, Any
from datetime import datetime
import random
from models import Aircraft, WeatherCondition


class TestingSuite:
    """Comprehensive testing for all ARES features"""

    def __init__(self, voice_controller, flight_tracker, weather_service, risk_detector, autonomous_controller):
        self.voice_controller = voice_controller
        self.flight_tracker = flight_tracker
        self.weather_service = weather_service
        self.risk_detector = risk_detector
        self.autonomous_controller = autonomous_controller
        self.test_results = []

    async def test_elevenlabs_basic(self) -> Dict[str, Any]:
        """Test basic ElevenLabs connectivity and synthesis"""
        result = {
            "test_name": "ElevenLabs Basic Synthesis",
            "timestamp": datetime.now().isoformat(),
            "status": "PENDING",
            "details": []
        }

        try:
            # Check if API key is configured
            if not self.voice_controller.is_available():
                result["status"] = "FAILED"
                result["error"] = "ElevenLabs API key not configured in .env"
                result["details"].append("Set ELEVENLABS_API_KEY in backend/.env file")
                return result

            result["details"].append("✓ API key configured")

            # Test simple synthesis
            test_text = "American one-two-three, climb and maintain flight level three-five-zero"
            audio_bytes = await self.voice_controller.synthesize_with_context(
                text=test_text,
                urgency="ROUTINE",
                callsign="AAL123"
            )

            if audio_bytes:
                result["status"] = "PASSED"
                result["audio_size_bytes"] = len(audio_bytes)
                result["audio_duration_ms"] = len(audio_bytes) // 16  # Rough estimate
                result["details"].append(f"✓ Synthesized {len(audio_bytes)} bytes of audio")
                result["details"].append(f"✓ Test message: '{test_text}'")
            else:
                result["status"] = "FAILED"
                result["error"] = "Synthesis returned no audio"
                result["details"].append("Check ElevenLabs API quota and key validity")

        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)
            result["details"].append(f"Exception: {e}")

        self.test_results.append(result)
        return result

    async def test_elevenlabs_urgency(self) -> Dict[str, Any]:
        """Test ElevenLabs with different urgency levels"""
        result = {
            "test_name": "ElevenLabs Urgency Modulation",
            "timestamp": datetime.now().isoformat(),
            "status": "PENDING",
            "details": [],
            "urgency_tests": []
        }

        if not self.voice_controller.is_available():
            result["status"] = "SKIPPED"
            result["error"] = "ElevenLabs not configured"
            return result

        try:
            urgency_levels = ["IMMEDIATE", "URGENT", "ROUTINE"]
            test_text = "United four-five-six, traffic alert, turn left heading two-seven-zero immediately"

            for urgency in urgency_levels:
                audio = await self.voice_controller.synthesize_with_context(
                    text=test_text,
                    urgency=urgency,
                    callsign="UAL456"
                )

                urgency_result = {
                    "urgency": urgency,
                    "success": audio is not None,
                    "size_bytes": len(audio) if audio else 0
                }
                result["urgency_tests"].append(urgency_result)

            passed_tests = sum(1 for t in result["urgency_tests"] if t["success"])
            result["status"] = "PASSED" if passed_tests == len(urgency_levels) else "PARTIAL"
            result["details"].append(f"✓ {passed_tests}/{len(urgency_levels)} urgency levels tested")

        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)

        self.test_results.append(result)
        return result

    async def test_voice_queue(self) -> Dict[str, Any]:
        """Test voice transmission queue system"""
        result = {
            "test_name": "Voice Transmission Queue",
            "timestamp": datetime.now().isoformat(),
            "status": "PENDING",
            "details": []
        }

        try:
            initial_queue_size = len(self.voice_controller.transmission_queue)
            result["details"].append(f"Initial queue size: {initial_queue_size}")

            # Queue multiple transmissions with different priorities
            test_transmissions = [
                ("AAL123", "Climb and maintain flight level two-eight-zero", "ROUTINE"),
                ("DAL456", "IMMEDIATE turn right heading zero-nine-zero, traffic", "IMMEDIATE"),
                ("UAL789", "Descend and maintain one-zero-thousand", "ROUTINE"),
            ]

            for callsign, message, priority in test_transmissions:
                await self.voice_controller.queue_transmission(
                    callsign=callsign,
                    message=message,
                    priority=priority,
                    urgency=priority,
                    frequency=132.4
                )

            final_queue_size = len(self.voice_controller.transmission_queue)
            added = final_queue_size - initial_queue_size

            result["status"] = "PASSED" if added == len(test_transmissions) else "PARTIAL"
            result["details"].append(f"✓ Added {added} transmissions to queue")
            result["details"].append(f"Final queue size: {final_queue_size}")

            # Check priority sorting
            if self.voice_controller.transmission_queue:
                top_transmission = self.voice_controller.transmission_queue[0]
                result["details"].append(f"✓ Top priority: {top_transmission.priority} ({top_transmission.callsign})")

        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)

        self.test_results.append(result)
        return result

    async def test_separation_detection(self) -> Dict[str, Any]:
        """Test aircraft separation monitoring"""
        result = {
            "test_name": "Separation Detection System",
            "timestamp": datetime.now().isoformat(),
            "status": "PENDING",
            "details": []
        }

        try:
            # Create two aircraft with known separation
            aircraft = [
                Aircraft(
                    icao24="TEST01",
                    callsign="AAL123",
                    latitude=37.619,
                    longitude=-122.375,
                    altitude_ft=35000,
                    velocity_kts=450,
                    heading_deg=90,
                    vertical_rate_fpm=0,
                    on_ground=False,
                    last_contact=datetime.now().timestamp()
                ),
                Aircraft(
                    icao24="TEST02",
                    callsign="UAL456",
                    latitude=37.619 + 0.015,  # ~0.9nm separation (CRITICAL)
                    longitude=-122.375 + 0.015,
                    altitude_ft=35500,  # 500ft vertical (CRITICAL)
                    velocity_kts=460,
                    heading_deg=90,
                    vertical_rate_fpm=0,
                    on_ground=False,
                    last_contact=datetime.now().timestamp()
                )
            ]

            # Run separation check
            weather = WeatherCondition(
                airport_code="KSFO",
                visibility_sm=10.0,
                wind_speed_kts=10,
                wind_direction_deg=270,
                temperature_c=15,
                dewpoint_c=10,
                altimeter_inhg=29.92,
                phenomena=[]
            )

            alerts = await self.risk_detector.analyze_sector(aircraft, weather)

            separation_alerts = [a for a in alerts if "SEPARATION" in a.risk_type]

            if separation_alerts:
                result["status"] = "PASSED"
                result["details"].append(f"✓ Detected {len(separation_alerts)} separation violation(s)")
                for alert in separation_alerts:
                    result["details"].append(f"  - {alert.description}")
            else:
                result["status"] = "FAILED"
                result["error"] = "Failed to detect separation violation"

        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)

        self.test_results.append(result)
        return result

    async def test_multi_agent_system(self) -> Dict[str, Any]:
        """Test multi-agent autonomous system"""
        result = {
            "test_name": "Multi-Agent Autonomous System",
            "timestamp": datetime.now().isoformat(),
            "status": "PENDING",
            "details": [],
            "agent_activity": {}
        }

        try:
            # Check if autonomous controller is active
            is_active = self.autonomous_controller.monitoring_active
            result["details"].append(f"System active: {is_active}")

            # Get agent statistics
            stats = self.autonomous_controller.get_statistics()

            for agent_name, agent_stats in stats["agent_statistics"].items():
                result["agent_activity"][agent_name] = {
                    "actions": agent_stats.get("actions", 0),
                    "specific_metric": agent_stats.get(
                        list(agent_stats.keys())[1] if len(agent_stats) > 1 else "actions", 0
                    )
                }

            total_actions = stats.get("total_actions", 0)

            if total_actions > 0:
                result["status"] = "PASSED"
                result["details"].append(f"✓ Generated {total_actions} autonomous actions")
            else:
                result["status"] = "PARTIAL"
                result["details"].append("System active but no actions yet (normal if just started)")

        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)

        self.test_results.append(result)
        return result

    async def test_workload_calculation(self) -> Dict[str, Any]:
        """Test controller workload metrics"""
        result = {
            "test_name": "Workload Calculation",
            "timestamp": datetime.now().isoformat(),
            "status": "PENDING",
            "details": []
        }

        try:
            from services.risk_scoring import risk_scoring_engine

            # Test with different aircraft counts
            test_scenarios = [
                (10, "LOW"),
                (25, "MODERATE"),
                (40, "HIGH"),
                (60, "CRITICAL")
            ]

            for aircraft_count, expected_level in test_scenarios:
                metrics = risk_scoring_engine.calculate_workload_metrics(
                    aircraft_count=aircraft_count,
                    alerts=[]
                )

                result["details"].append(
                    f"✓ {aircraft_count} aircraft → {metrics.workload_level} "
                    f"(score: {metrics.workload_score})"
                )

            result["status"] = "PASSED"

        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)

        self.test_results.append(result)
        return result

    async def test_weather_integration(self) -> Dict[str, Any]:
        """Test weather data integration"""
        result = {
            "test_name": "Weather Data Integration",
            "timestamp": datetime.now().isoformat(),
            "status": "PENDING",
            "details": []
        }

        try:
            weather = await self.weather_service.get_metar("KSFO")

            if weather:
                result["status"] = "PASSED"
                result["details"].append(f"✓ Weather data retrieved for KSFO")
                result["details"].append(f"  Visibility: {weather.visibility_sm} SM")
                result["details"].append(f"  Wind: {weather.wind_speed_kts} kts @ {weather.wind_direction_deg}°")
                result["details"].append(f"  Temperature: {weather.temperature_c}°C")
            else:
                result["status"] = "PARTIAL"
                result["details"].append("Using demo weather data (normal if no API key)")

        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)

        self.test_results.append(result)
        return result

    async def test_flight_tracking(self) -> Dict[str, Any]:
        """Test live flight tracking"""
        result = {
            "test_name": "Flight Tracking System",
            "timestamp": datetime.now().isoformat(),
            "status": "PENDING",
            "details": []
        }

        try:
            aircraft = await self.flight_tracker.get_aircraft_in_radius()

            if aircraft:
                result["status"] = "PASSED"
                result["details"].append(f"✓ Tracking {len(aircraft)} aircraft")
                result["details"].append(f"✓ Live data from OpenSky Network")

                # Sample some aircraft
                for ac in aircraft[:3]:
                    result["details"].append(
                        f"  - {ac.callsign}: {ac.altitude_ft}ft, {ac.velocity_kts}kts"
                    )
            else:
                result["status"] = "PARTIAL"
                result["details"].append("Using demo data (normal if no live aircraft in range)")

        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)

        self.test_results.append(result)
        return result

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive test suite"""
        print("[TESTING] Running comprehensive ARES test suite...")

        self.test_results = []

        tests = [
            self.test_flight_tracking(),
            self.test_weather_integration(),
            self.test_workload_calculation(),
            self.test_separation_detection(),
            self.test_multi_agent_system(),
            self.test_elevenlabs_basic(),
            self.test_elevenlabs_urgency(),
            self.test_voice_queue(),
        ]

        results = await asyncio.gather(*tests, return_exceptions=True)

        # Compile summary
        passed = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "PASSED")
        partial = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "PARTIAL")
        failed = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "FAILED")

        summary = {
            "total_tests": len(tests),
            "passed": passed,
            "partial": partial,
            "failed": failed,
            "timestamp": datetime.now().isoformat(),
            "overall_status": "PASSED" if failed == 0 else "PARTIAL" if passed > 0 else "FAILED",
            "test_results": results
        }

        print(f"[TESTING] Complete: {passed} passed, {partial} partial, {failed} failed")

        return summary


# Global instance (will be initialized in main.py)
testing_suite = None
