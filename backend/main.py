from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime
from typing import List

from config import get_settings
from models import SectorStatus
from redis_client import redis_client
from services.flight_tracker import FlightTracker
from services.weather_service import WeatherService
from services.risk_detector import RiskDetector
from services.risk_detector_enhanced import enhanced_risk_detector
from services.ai_copilot import AICopilot
from services.voice_controller import VoiceController
from services.voice_controller_pro import pro_voice_controller, Priority, UrgencyLevel
from services.risk_scoring import risk_scoring_engine
from services.demo_data import demo_generator
from services.autonomous_controller_v2 import MultiAgentController
from services.testing_suite import TestingSuite, testing_suite
from services.simulation_manager import EnhancedSimulationManager
from services.task_manager import task_manager
from task_models import TaskPriority, TaskCategory

settings = get_settings()

# Initialize multi-agent autonomous controller
autonomous_controller = None  # Will be initialized in lifespan

# Initialize simulation manager
simulation_manager = None  # Will be initialized in lifespan

# Background tasks
autonomous_task = None
voice_queue_task = None

# Transmitted audio history (last 10 transmissions)
transmitted_audio_history = []
MAX_AUDIO_HISTORY = 10

# Active scenario aircraft (overrides real flight data when set)
active_scenario_aircraft = None

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    global autonomous_controller, autonomous_task, voice_queue_task, testing_suite, simulation_manager

    # Startup
    print("🚀 Starting ARES Backend...")
    await redis_client.connect()

    # Initialize simulation manager
    print("[SYSTEM] Initializing Enhanced Simulation Manager...")
    simulation_manager = EnhancedSimulationManager(
        target_airport_lat=39.8561,  # KDEN
        target_airport_lon=-104.6737
    )

    # Initialize multi-agent autonomous controller
    print("[SYSTEM] Initializing Multi-Agent Autonomous ATC System...")
    autonomous_controller = MultiAgentController(
        anthropic_api_key=settings.anthropic_api_key,
        voice_controller=pro_voice_controller
    )
    autonomous_controller.monitoring_active = True

    # Initialize testing suite
    print("[SYSTEM] Initializing comprehensive testing suite...")
    testing_suite = TestingSuite(
        voice_controller=pro_voice_controller,
        flight_tracker=flight_tracker,
        weather_service=weather_service,
        risk_detector=enhanced_risk_detector,
        autonomous_controller=autonomous_controller
    )

    # Start background tasks
    print("[SYSTEM] Starting multi-agent monitoring (15-second cycles)...")
    autonomous_task = asyncio.create_task(autonomous_monitoring_loop())

    print("[SYSTEM] Starting voice transmission queue processor...")
    voice_queue_task = asyncio.create_task(voice_queue_processor_loop())

    print("[SYSTEM] All systems operational - MULTI-AGENT AI ACTIVE")
    yield

    # Shutdown
    print("🛑 Shutting down ARES Backend...")
    autonomous_controller.monitoring_active = False
    if autonomous_task:
        autonomous_task.cancel()
    if voice_queue_task:
        voice_queue_task.cancel()
    await redis_client.disconnect()


async def autonomous_monitoring_loop():
    """Background task that runs autonomous AI controller"""
    global autonomous_controller, active_scenario_aircraft

    while autonomous_controller and autonomous_controller.monitoring_active:
        try:
            # Use scenario aircraft if loaded, otherwise get real data
            if active_scenario_aircraft:
                aircraft = active_scenario_aircraft
            else:
                aircraft = await flight_tracker.get_aircraft_in_radius()
                if not aircraft:
                    aircraft = demo_generator.get_demo_aircraft()

            weather = await weather_service.get_metar(settings.target_airport)
            if not weather:
                weather = demo_generator.get_demo_weather()

            # Calculate workload
            alerts = await enhanced_risk_detector.analyze_sector(aircraft, weather)
            workload_metrics = risk_scoring_engine.calculate_workload_metrics(
                aircraft_count=len(aircraft),
                alerts=alerts
            )

            # Run multi-agent autonomous cycle
            actions = await autonomous_controller.autonomous_cycle(
                aircraft=aircraft,
                weather=weather,
                current_workload=workload_metrics.workload_level
            )

            if actions:
                print(f"[MULTI-AGENT] Generated {len(actions)} actions across agents")

            # Wait 15 seconds before next cycle
            await asyncio.sleep(15)

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[ERROR] Autonomous monitoring error: {e}")
            await asyncio.sleep(15)


async def voice_queue_processor_loop():
    """Background task that processes voice transmission queue"""
    print("🎤 Voice Queue Processor started")

    while True:
        try:
            queue_length = len(pro_voice_controller.transmission_queue)

            # Log queue status every 10 seconds (when not empty)
            if queue_length > 0:
                print(f"📋 Voice Queue: {queue_length} transmission(s) pending")

                # Get next transmission from queue
                async with pro_voice_controller.queue_lock:
                    if pro_voice_controller.transmission_queue:
                        transmission = pro_voice_controller.transmission_queue.pop(0)

                        # Simulate transmission
                        print(f"")
                        print(f"{'='*60}")
                        print(f"📻 TRANSMITTING on {transmission.frequency} MHz")
                        print(f"   Callsign: {transmission.callsign}")
                        print(f"   Message: '{transmission.message}'")
                        print(f"   Priority: {transmission.priority}")
                        print(f"   Audio Size: {len(transmission.audio_bytes) if transmission.audio_bytes else 0} bytes")
                        print(f"{'='*60}")

                        # Mark as transmitted
                        transmission.status = "TRANSMITTED"
                        transmission.transmitted_at = datetime.now()

                        # Simulate audio playback duration
                        if transmission.audio_duration_ms:
                            duration_sec = transmission.audio_duration_ms / 1000
                            print(f"🔊 Playing audio ({duration_sec:.1f} seconds)...")
                            await asyncio.sleep(duration_sec)
                        else:
                            print(f"🔊 Playing audio (3.0 seconds)...")
                            await asyncio.sleep(3)  # Default 3 seconds

                        print(f"✅ TRANSMISSION COMPLETE: {transmission.callsign}")
                        print(f"")

                        # Store in transmitted audio history for playback
                        global transmitted_audio_history
                        transmitted_audio_history.insert(0, transmission)  # Add to front
                        if len(transmitted_audio_history) > MAX_AUDIO_HISTORY:
                            transmitted_audio_history.pop()  # Remove oldest

            # Wait a bit before checking queue again
            await asyncio.sleep(1)

        except asyncio.CancelledError:
            print("🛑 Voice Queue Processor stopping...")
            break
        except Exception as e:
            print(f"[ERROR] Voice queue processor error: {e}")
            await asyncio.sleep(1)

# Initialize FastAPI app
app = FastAPI(
    title="ARES - Aerial Risk Evaluation System",
    description="AI-powered air traffic safety system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
flight_tracker = FlightTracker()
weather_service = WeatherService()
risk_detector = RiskDetector()  # Keep for backwards compatibility
ai_copilot = AICopilot()
voice_controller = VoiceController()  # Keep for backwards compatibility

# New professional services
# Use enhanced_risk_detector for new risk scoring
# Use pro_voice_controller for professional voice features

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✅ Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"❌ Client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"⚠️ Error sending to client: {e}")
                dead_connections.append(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self.active_connections.remove(conn)

manager = ConnectionManager()

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "redis": redis_client.client is not None,
            "flight_tracker": True,
            "weather_service": True,
            "risk_detector": True,
            "ai_copilot": True,
            "voice_controller": voice_controller.is_available()
        }
    }

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time sector updates
    Broadcasts flight data, weather, and risk alerts every 2 seconds
    """
    await manager.connect(websocket)

    try:
        # Start real-time updates loop
        while True:
            try:
                # Use scenario aircraft if loaded, otherwise fetch real data
                global active_scenario_aircraft
                if active_scenario_aircraft:
                    aircraft = active_scenario_aircraft
                else:
                    # Try to fetch real aircraft data, fallback to demo
                    aircraft = await flight_tracker.get_aircraft_in_radius()
                    if not aircraft:
                        aircraft = demo_generator.get_demo_aircraft()

                # Try to fetch real weather, fallback to demo
                weather = await weather_service.get_metar(settings.target_airport)
                if not weather:
                    weather = demo_generator.get_demo_weather()

                # Detect risks using ENHANCED detector with professional scoring
                alerts = await enhanced_risk_detector.analyze_sector(aircraft, weather)

                # Calculate controller workload using professional metrics
                workload_metrics = risk_scoring_engine.calculate_workload_metrics(
                    aircraft_count=len(aircraft),
                    alerts=alerts
                )

                # Ensure workload is a string (not an enum)
                workload = str(workload_metrics.workload_level) if workload_metrics and workload_metrics.workload_level else "LOW"

                # Build sector status
                sector_status = SectorStatus(
                    timestamp=datetime.now(),
                    aircraft_count=len(aircraft),
                    aircraft=aircraft,
                    active_alerts=alerts,
                    weather=weather if weather else None,
                    controller_workload=workload
                )

                # Broadcast to all clients (serialize datetime to string)
                await manager.broadcast({
                    "type": "sector_update",
                    "data": sector_status.model_dump(mode='json')
                })

                # Wait before next update
                await asyncio.sleep(settings.flight_update_interval_sec)

            except Exception as e:
                print(f"❌ Error in update loop: {str(e)}")
                # Don't crash - keep trying
                await asyncio.sleep(2)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"❌ WebSocket error: {str(e)}")
        manager.disconnect(websocket)

# REST endpoint to get current sector status
@app.get("/api/sector/status")
async def get_sector_status():
    """Get current sector status (REST endpoint)"""
    try:
        # Try real data first, fallback to demo
        aircraft = await flight_tracker.get_aircraft_in_radius()
        if not aircraft:
            print("📦 Using demo aircraft data")
            aircraft = demo_generator.get_demo_aircraft()

        weather = await weather_service.get_metar(settings.target_airport)
        if not weather:
            weather = demo_generator.get_demo_weather()

        # Use enhanced risk detector
        alerts = await enhanced_risk_detector.analyze_sector(aircraft, weather)

        # Use professional workload metrics
        workload_metrics = risk_scoring_engine.calculate_workload_metrics(
            aircraft_count=len(aircraft),
            alerts=alerts
        )

        sector_status = SectorStatus(
            timestamp=datetime.now(),
            aircraft_count=len(aircraft),
            aircraft=aircraft,
            active_alerts=alerts,
            weather=weather,
            controller_workload=workload_metrics.workload_level
        )

        return sector_status.model_dump(mode='json')

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# AI analysis endpoint
@app.post("/api/ai/analyze")
async def ai_analyze():
    """Get AI analysis of current situation"""
    try:
        aircraft = await flight_tracker.get_aircraft_in_radius()
        weather = await weather_service.get_metar(settings.target_airport)
        alerts = await risk_detector.analyze_sector(aircraft, weather)

        analysis = await ai_copilot.analyze_complex_situation(aircraft, weather, alerts)

        return {
            "timestamp": datetime.now().isoformat(),
            "analysis": analysis
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# Voice synthesis endpoint
@app.post("/api/voice/synthesize")
async def synthesize_voice(message: dict):
    """Synthesize ATC message to voice"""
    try:
        text = message.get("text", "")
        if not text:
            return JSONResponse(
                status_code=400,
                content={"error": "No text provided"}
            )

        audio_bytes = await voice_controller.synthesize_atc_message(text)

        if audio_bytes:
            return {
                "success": True,
                "audio_base64": audio_bytes.hex()
            }
        else:
            return {
                "success": False,
                "message": "Voice synthesis not available"
            }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# ============================================================================
# PROFESSIONAL FEATURES - NEW API ENDPOINTS
# ============================================================================

@app.get("/api/risk/workload")
async def get_workload_metrics():
    """Get current controller workload metrics"""
    try:
        aircraft = await flight_tracker.get_aircraft_in_radius()
        if not aircraft:
            aircraft = demo_generator.get_demo_aircraft()

        weather = await weather_service.get_metar(settings.target_airport)
        if not weather:
            weather = demo_generator.get_demo_weather()

        alerts = await enhanced_risk_detector.analyze_sector(aircraft, weather)

        workload_metrics = risk_scoring_engine.calculate_workload_metrics(
            aircraft_count=len(aircraft),
            alerts=alerts
        )

        return workload_metrics.model_dump()

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/api/voice/transmit")
async def queue_voice_transmission(request: dict):
    """
    Queue a voice transmission

    Body:
    {
        "callsign": "UAL123",
        "message": "Descend and maintain flight level two-four-zero",
        "priority": "ROUTINE",  // EMERGENCY, CRITICAL, ROUTINE, ADVISORY
        "urgency": "ROUTINE",   // IMMEDIATE, URGENT, ROUTINE, ADVISORY
        "frequency": 132.4,
        "alert_id": "optional-alert-id"
    }
    """
    try:
        if not pro_voice_controller.is_available():
            return JSONResponse(
                status_code=503,
                content={"error": "ElevenLabs voice service not configured"}
            )

        callsign = request.get("callsign")
        message = request.get("message")
        priority_str = request.get("priority", "ROUTINE")
        urgency_str = request.get("urgency", "ROUTINE")
        frequency = request.get("frequency", 132.4)
        alert_id = request.get("alert_id")

        if not callsign or not message:
            return JSONResponse(
                status_code=400,
                content={"error": "callsign and message are required"}
            )

        # Convert strings to enums
        priority = Priority[priority_str]
        urgency = UrgencyLevel[urgency_str]

        # Queue transmission
        transmission = await pro_voice_controller.queue_transmission(
            callsign=callsign,
            message=message,
            priority=priority,
            urgency=urgency,
            frequency=frequency,
            alert_id=alert_id
        )

        return {
            "success": True,
            "transmission_id": transmission.id,
            "queued_at": transmission.queued_at.isoformat() if transmission.queued_at else None,
            "queue_position": len(pro_voice_controller.transmission_queue)
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/api/voice/queue")
async def get_transmission_queue():
    """Get current voice transmission queue status"""
    try:
        queue_status = pro_voice_controller.get_queue_status()
        return queue_status.model_dump()

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/api/voice/verify-readback")
async def verify_readback(request: dict):
    """
    Verify pilot readback

    Body:
    {
        "transmission_id": "tx_12345",
        "readback_text": "Down to flight level two-four-zero"
    }
    """
    try:
        transmission_id = request.get("transmission_id")
        readback_text = request.get("readback_text")

        if not transmission_id or not readback_text:
            return JSONResponse(
                status_code=400,
                content={"error": "transmission_id and readback_text are required"}
            )

        result = await pro_voice_controller.verify_readback(
            transmission_id=transmission_id,
            readback_text=readback_text
        )

        return result.model_dump()

    except ValueError as e:
        return JSONResponse(
            status_code=404,
            content={"error": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/api/voice/synthesize-pro")
async def synthesize_professional_voice(request: dict):
    """
    Synthesize voice with professional urgency modulation

    Body:
    {
        "text": "United one-two-three, go around",
        "urgency": "IMMEDIATE",  // IMMEDIATE, URGENT, ROUTINE, ADVISORY
        "callsign": "UAL123"
    }
    """
    try:
        if not pro_voice_controller.is_available():
            return JSONResponse(
                status_code=503,
                content={"error": "ElevenLabs voice service not configured"}
            )

        text = request.get("text")
        urgency_str = request.get("urgency", "ROUTINE")
        callsign = request.get("callsign")

        if not text:
            return JSONResponse(
                status_code=400,
                content={"error": "text is required"}
            )

        urgency = UrgencyLevel[urgency_str]

        audio_bytes = await pro_voice_controller.synthesize_with_context(
            text=text,
            urgency=urgency,
            callsign=callsign
        )

        if audio_bytes:
            return {
                "success": True,
                "audio_base64": audio_bytes.hex(),
                "urgency": urgency_str,
                "size_bytes": len(audio_bytes)
            }
        else:
            return JSONResponse(
                status_code=500,
                content={"error": "Voice synthesis failed"}
            )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/api/risk/scoring-info")
async def get_risk_scoring_info():
    """Get information about risk scoring system"""
    return {
        "tiers": {
            "CRITICAL": {
                "score_range": "90-100",
                "action_time_seconds": 60,
                "auto_transmit": True,
                "buzzer": True,
                "description": "Immediate action required"
            },
            "HIGH": {
                "score_range": "70-89",
                "action_time_seconds": 180,
                "auto_transmit": False,
                "buzzer": True,
                "description": "Urgent action required"
            },
            "MEDIUM": {
                "score_range": "50-69",
                "action_time_seconds": 600,
                "auto_transmit": False,
                "buzzer": False,
                "description": "Monitor closely"
            },
            "LOW": {
                "score_range": "0-49",
                "action_time_seconds": 1800,
                "auto_transmit": False,
                "buzzer": False,
                "description": "Awareness only"
            }
        },
        "scoring_formula": "Risk Score = (NTSB_frequency × 40%) + (severity × 30%) + (time_urgency × 20%) + (environmental × 10%)",
        "ntsb_frequencies": risk_scoring_engine.ntsb_frequencies,
        "ntsb_case_counts": risk_scoring_engine.ntsb_case_counts
    }


# ============================================================================
# AUTONOMOUS AI CONTROLLER ENDPOINTS
# ============================================================================

@app.get("/api/ai/actions")
async def get_ai_actions():
    """Get recent autonomous AI actions"""
    if not autonomous_controller:
        return JSONResponse(
            status_code=503,
            content={"error": "Autonomous controller not initialized"}
        )

    return {
        "actions": autonomous_controller.get_recent_actions(limit=20),
        "status": autonomous_controller.get_status()
    }


@app.get("/api/ai/status")
async def get_ai_status():
    """Get autonomous AI controller status"""
    if not autonomous_controller:
        return JSONResponse(
            status_code=503,
            content={"error": "Autonomous controller not initialized"}
        )

    return autonomous_controller.get_status()


@app.get("/api/ai/statistics")
async def get_ai_statistics():
    """Get multi-agent system statistics"""
    if not autonomous_controller:
        return JSONResponse(
            status_code=503,
            content={"error": "Autonomous controller not initialized"}
        )

    return autonomous_controller.get_statistics()


@app.post("/api/simulation/scenario")
async def load_scenario(request: dict):
    """Load a simulation scenario"""
    global active_scenario_aircraft, simulation_manager

    if not simulation_manager:
        return JSONResponse(
            status_code=503,
            content={"error": "Simulation manager not initialized"}
        )

    scenario_id = request.get("scenario_id", "separation_violation")

    # Load scenario aircraft
    aircraft = simulation_manager.create_scenario(scenario_id)
    active_scenario_aircraft = aircraft

    print(f"🎬 Loaded scenario: {scenario_id} with {len(aircraft)} aircraft")

    return {
        "status": "success",
        "scenario_id": scenario_id,
        "aircraft_count": len(aircraft),
        "message": f"Loaded {scenario_id} scenario with {len(aircraft)} aircraft"
    }


@app.post("/api/ai/autopilot/toggle")
async def toggle_autopilot(request: dict):
    """Enable or disable autonomous AI autopilot mode"""
    if not autonomous_controller:
        return JSONResponse(
            status_code=503,
            content={"error": "Autonomous controller not initialized"}
        )

    enabled = request.get("enabled", True)
    autonomous_controller.monitoring_active = enabled

    return {
        "success": True,
        "autopilot_enabled": enabled,
        "message": f"AI Autopilot {'ENABLED' if enabled else 'DISABLED'}"
    }


@app.get("/api/simulation/scenarios")
async def get_available_scenarios():
    """Get list of available simulation scenarios"""
    return {
        "scenarios": simulation_manager.get_scenario_list()
    }


@app.post("/api/simulation/create-scenario")
async def create_simulation_scenario(request: dict):
    """
    Create a realistic ATC scenario using Enhanced Simulation Manager

    Scenarios:
    - separation_violation: Multiple aircraft with separation conflicts
    - high_workload: 15-25 aircraft requiring traffic management
    - emergency: Aircraft emergency with surrounding traffic
    - approach_sequence: Multiple aircraft on final approach
    """
    global demo_generator

    scenario_id = request.get("scenario", "separation_violation")

    # Create scenario using simulation manager
    aircraft = simulation_manager.create_scenario(scenario_id)

    # Store aircraft in demo_generator to override real data
    demo_generator.aircraft_positions = {}
    for ac in aircraft:
        demo_generator.aircraft_positions[ac.callsign] = {
            "latitude": ac.latitude,
            "longitude": ac.longitude,
            "altitude_ft": ac.altitude_ft,
            "velocity_kts": ac.velocity_kts,
            "heading_deg": ac.heading_deg,
            "vertical_rate_fpm": ac.vertical_rate_fpm,
            "on_ground": ac.on_ground,
            "airport": "KDEN",
            "phase": "scenario"
        }

    # Trigger autonomous analysis immediately
    if autonomous_controller:
        try:
            weather = demo_generator.get_demo_weather()
            alerts = await enhanced_risk_detector.analyze_sector(aircraft, weather)
            workload_metrics = risk_scoring_engine.calculate_workload_metrics(
                aircraft_count=len(aircraft),
                alerts=alerts
            )

            # Force immediate agent response
            actions = await autonomous_controller.autonomous_cycle(
                aircraft=aircraft,
                weather=weather,
                current_workload=workload_metrics.workload_level
            )

            return {
                "scenario": scenario_id,
                "description": f"Created {scenario_id} scenario",
                "aircraft_count": len(aircraft),
                "aircraft": [ac.callsign for ac in aircraft],
                "alerts_detected": len(alerts),
                "ai_actions_generated": len(actions) if actions else 0,
                "actions": [
                    {
                        "callsign": action.aircraft_callsign,
                        "clearance": action.clearance,
                        "reason": action.reason,
                        "priority": action.priority
                    }
                    for action in (actions or [])
                ],
                "expected_behavior": [
                    "Separation violations will be detected immediately",
                    "Multi-agent AI will generate clearances",
                    "Voice transmissions will be queued and processed",
                    "Check logs for detailed agent activity"
                ]
            }

        except Exception as e:
            print(f"Error triggering autonomous analysis: {e}")

    return {
        "scenario": scenario_id,
        "description": f"Created {scenario_id} scenario",
        "aircraft_count": len(aircraft),
        "aircraft": [ac.callsign for ac in aircraft]
    }


@app.post("/api/simulation/reset")
async def reset_simulation():
    """Reset simulation to default demo data"""
    global demo_generator
    from services.demo_data import DemoDataGenerator

    # Reinitialize demo generator
    demo_generator = DemoDataGenerator()

    return {
        "status": "reset",
        "message": "Simulation reset to default demo data"
    }


@app.post("/api/voice/test-transmission")
async def test_voice_transmission():
    """Test ElevenLabs voice transmission with sample clearance"""
    if not pro_voice_controller.is_available():
        return JSONResponse(
            status_code=503,
            content={"error": "ElevenLabs not configured - check ELEVENLABS_API_KEY in .env"}
        )

    try:
        # Queue a test transmission
        test_message = "United two-three-four, climb and maintain flight level three-five-zero"
        transmission = await pro_voice_controller.queue_transmission(
            callsign="UAL234",
            message=test_message,
            priority="ROUTINE",
            urgency="ROUTINE",
            frequency=132.4
        )

        return {
            "success": True,
            "message": "Test transmission queued",
            "transmission_id": transmission.id,
            "text": test_message,
            "queue_position": len(pro_voice_controller.transmission_queue)
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/api/voice/play-audio")
async def play_latest_audio():
    """
    Get the latest audio transmission for playback in browser
    Returns audio bytes as MP3
    """
    try:
        # Get the most recent transmission with audio
        if pro_voice_controller.transmission_queue:
            transmission = pro_voice_controller.transmission_queue[0]
            if transmission.audio_bytes:
                from fastapi.responses import Response
                return Response(
                    content=transmission.audio_bytes,
                    media_type="audio/mpeg",
                    headers={
                        "Content-Disposition": f"inline; filename=transmission_{transmission.callsign}.mp3"
                    }
                )

        return JSONResponse(
            status_code=404,
            content={"error": "No audio available"}
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/api/voice/transmitted")
async def get_transmitted_audio_history():
    """
    Get history of transmitted audio for playback
    Returns list of transmissions with metadata (without audio bytes for list view)
    """
    try:
        global transmitted_audio_history

        history = []
        for transmission in transmitted_audio_history:
            history.append({
                "id": transmission.id,
                "callsign": transmission.callsign,
                "message": transmission.message,
                "priority": transmission.priority,
                "urgency": transmission.urgency,
                "frequency": transmission.frequency,
                "transmitted_at": transmission.transmitted_at.isoformat() if transmission.transmitted_at else None,
                "audio_duration_ms": transmission.audio_duration_ms,
                "has_audio": transmission.audio_bytes is not None,
                "audio_size_bytes": len(transmission.audio_bytes) if transmission.audio_bytes else 0
            })

        return {"transmissions": history, "total": len(history)}

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/api/voice/transmitted/{transmission_id}")
async def get_transmitted_audio_by_id(transmission_id: str):
    """
    Get specific transmitted audio by ID
    Returns audio bytes for playback
    """
    try:
        global transmitted_audio_history

        for transmission in transmitted_audio_history:
            if transmission.id == transmission_id:
                if transmission.audio_bytes:
                    from fastapi.responses import Response
                    return Response(
                        content=transmission.audio_bytes,
                        media_type="audio/mpeg",
                        headers={
                            "Content-Disposition": f"inline; filename=transmission_{transmission.callsign}.mp3"
                        }
                    )

        return JSONResponse(
            status_code=404,
            content={"error": "Transmission not found"}
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


# ============================================================================
# COMPREHENSIVE TESTING SUITE ENDPOINTS
# ============================================================================

@app.post("/api/testing/run-all")
async def run_all_tests():
    """Run comprehensive system test suite"""
    if not testing_suite:
        return JSONResponse(
            status_code=503,
            content={"error": "Testing suite not initialized"}
        )

    results = await testing_suite.run_all_tests()
    return results


@app.post("/api/testing/elevenlabs-basic")
async def test_elevenlabs_basic():
    """Test basic ElevenLabs synthesis"""
    if not testing_suite:
        return JSONResponse(status_code=503, content={"error": "Testing suite not initialized"})

    result = await testing_suite.test_elevenlabs_basic()
    return result


@app.post("/api/testing/elevenlabs-urgency")
async def test_elevenlabs_urgency():
    """Test ElevenLabs with urgency modulation"""
    if not testing_suite:
        return JSONResponse(status_code=503, content={"error": "Testing suite not initialized"})

    result = await testing_suite.test_elevenlabs_urgency()
    return result


@app.post("/api/testing/voice-queue")
async def test_voice_queue():
    """Test voice transmission queue"""
    if not testing_suite:
        return JSONResponse(status_code=503, content={"error": "Testing suite not initialized"})

    result = await testing_suite.test_voice_queue()
    return result


@app.post("/api/testing/separation")
async def test_separation():
    """Test separation detection"""
    if not testing_suite:
        return JSONResponse(status_code=503, content={"error": "Testing suite not initialized"})

    result = await testing_suite.test_separation_detection()
    return result


@app.post("/api/testing/multi-agent")
async def test_multi_agent():
    """Test multi-agent system"""
    if not testing_suite:
        return JSONResponse(status_code=503, content={"error": "Testing suite not initialized"})

    result = await testing_suite.test_multi_agent_system()
    return result


@app.post("/api/testing/workload")
async def test_workload():
    """Test workload calculation"""
    if not testing_suite:
        return JSONResponse(status_code=503, content={"error": "Testing suite not initialized"})

    result = await testing_suite.test_workload_calculation()
    return result


@app.post("/api/testing/weather")
async def test_weather():
    """Test weather integration"""
    if not testing_suite:
        return JSONResponse(status_code=503, content={"error": "Testing suite not initialized"})

    result = await testing_suite.test_weather_integration()
    return result


@app.post("/api/testing/flight-tracking")
async def test_flight_tracking():
    """Test flight tracking"""
    if not testing_suite:
        return JSONResponse(status_code=503, content={"error": "Testing suite not initialized"})

    result = await testing_suite.test_flight_tracking()
    return result


# ============================================================================
# ATC HELPER FEATURES
# ============================================================================

@app.get("/api/helper/quick-reference")
async def get_quick_reference():
    """Get quick reference data for ATC"""
    return {
        "separation_standards": {
            "radar": {
                "horizontal": "3.0 nautical miles",
                "vertical": "1000 feet (below FL290), 2000 feet (above FL290)"
            },
            "non_radar": {
                "longitudinal": "5-10 minutes or 10-20 nautical miles",
                "lateral": "Based on navigation aids"
            }
        },
        "altitude_assignments": {
            "VFR_eastbound": "Odd thousands + 500ft (3500, 5500, 7500, etc.)",
            "VFR_westbound": "Even thousands + 500ft (4500, 6500, 8500, etc.)",
            "IFR_eastbound": "Odd thousands (3000, 5000, 7000, etc.)",
            "IFR_westbound": "Even thousands (4000, 6000, 8000, etc.)"
        },
        "emergency_frequencies": {
            "guard": "121.5 MHz (civilian)",
            "military_guard": "243.0 MHz",
            "squawk_codes": {
                "emergency": "7700",
                "radio_failure": "7600",
                "hijack": "7500",
                "VFR": "1200"
            }
        },
        "wake_turbulence_separation": {
            "heavy_behind_heavy": "4 nm",
            "large_behind_heavy": "5 nm",
            "small_behind_heavy": "6 nm",
            "small_behind_757": "5 nm"
        }
    }


@app.post("/api/helper/calculate-separation")
async def calculate_separation(request: dict):
    """Calculate separation between two aircraft"""
    import math

    ac1_lat = request.get("aircraft1_lat")
    ac1_lon = request.get("aircraft1_lon")
    ac1_alt = request.get("aircraft1_alt")
    ac2_lat = request.get("aircraft2_lat")
    ac2_lon = request.get("aircraft2_lon")
    ac2_alt = request.get("aircraft2_alt")

    # Calculate horizontal distance (great circle)
    lat1, lon1 = math.radians(ac1_lat), math.radians(ac1_lon)
    lat2, lon2 = math.radians(ac2_lat), math.radians(ac2_lon)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    horizontal_nm = 3440.065 * c  # Earth radius in nautical miles

    # Calculate vertical separation
    vertical_ft = abs(ac2_alt - ac1_alt)

    # Determine if legal separation exists
    meets_horizontal = horizontal_nm >= 3.0
    meets_vertical = vertical_ft >= 1000
    legal_separation = meets_horizontal or meets_vertical

    return {
        "horizontal_separation_nm": round(horizontal_nm, 2),
        "vertical_separation_ft": vertical_ft,
        "legal_separation": legal_separation,
        "meets_horizontal_standard": meets_horizontal,
        "meets_vertical_standard": meets_vertical,
        "status": "SAFE" if legal_separation else "VIOLATION"
    }


@app.post("/api/helper/generate-clearance")
async def generate_clearance(request: dict):
    """Generate proper ATC clearance phraseology"""
    clearance_type = request.get("type")
    callsign = request.get("callsign")

    templates = {
        "climb": f"{callsign}, climb and maintain {{altitude}}",
        "descend": f"{callsign}, descend and maintain {{altitude}}",
        "turn_heading": f"{callsign}, turn {{direction}} heading {{heading}}",
        "speed": f"{callsign}, {{action}} speed {{speed}} knots",
        "direct": f"{callsign}, proceed direct {{waypoint}}",
        "hold": f"{callsign}, hold {{direction}} of {{fix}} on the {{radial}} radial",
        "cleared_approach": f"{callsign}, cleared {{approach}} approach runway {{runway}}",
        "traffic": f"{callsign}, traffic {{clock_position}} o'clock, {{distance}} miles, {{altitude}}, {{direction}}bound"
    }

    template = templates.get(clearance_type, "")

    # Fill in the template with provided parameters
    for key, value in request.items():
        if key not in ["type", "callsign"]:
            template = template.replace(f"{{{key}}}", str(value))

    return {
        "clearance": template,
        "type": clearance_type,
        "callsign": callsign
    }


# ============================================================================
# TASK MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/tasks")
async def get_tasks():
    """Get all active tasks, sorted by priority"""
    tasks = task_manager.get_active_tasks(sort_by_priority=True)

    # Expire stale tasks
    task_manager.expire_stale_tasks()

    return [task.dict() for task in tasks]


@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    """Get specific task by ID"""
    task = task_manager.get_task(task_id)
    if not task:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
    return task.dict()


@app.post("/api/tasks/{task_id}/resolve")
async def resolve_task(task_id: str):
    """Mark task as resolved"""
    success = task_manager.resolve_task(task_id)
    if not success:
        return JSONResponse(status_code=404, content={"error": "Task not found"})

    return {
        "status": "success",
        "task_id": task_id,
        "message": "Task resolved successfully"
    }


@app.get("/api/tasks/stats")
async def get_task_stats():
    """Get task statistics"""
    return task_manager.get_statistics()


@app.post("/api/tasks/create")
async def create_task(request: dict):
    """Manually create a task (for testing)"""
    try:
        task = task_manager.create_or_update_task(
            aircraft_icao24=request.get("aircraft_icao24"),
            aircraft_callsign=request.get("aircraft_callsign"),
            priority=TaskPriority(request.get("priority", "MEDIUM")),
            category=TaskCategory(request.get("category", "OTHER")),
            summary=request.get("summary"),
            description=request.get("description"),
            ai_action=request.get("ai_action"),
            pilot_message=request.get("pilot_message")
        )
        return task.dict()
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.backend_host,
        port=settings.backend_port,
        log_level="info"
    )
