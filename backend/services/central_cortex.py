import os
import json
import asyncio
import google.generativeai as genai
from typing import List, Dict, Any, AsyncGenerator
from .tactical_analyst import TacticalAnalyst
from .ntsb_analyzer import NTSBAnalyzer

class CentralCortex:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("CRITICAL: GEMINI_API_KEY not found in env")
            self.model = None
        else:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp') # Using Flash for speed/streaming
        
        # Sub-agents
        self.tactical = TacticalAnalyst()
        self.ntsb = NTSBAnalyzer()

    async def stream_analysis(self, aircraft_data: List[Dict]) -> AsyncGenerator[str, None]:
        """
        Super-utilizes the LLM by streaming 'thoughts' and 'solutions' in real-time.
        Yields JSON strings.
        """
        
        # 1. Quick NTSB Safety Check (Rule-based fast pass)
        yield json.dumps({"type": "thought", "content": "INITIALIZING CORTEX... SCANNING TELEMETRY..."})
        await asyncio.sleep(0.5) # Cinematic pause
        
        risks = []
        for ac in aircraft_data:
            risk = self.ntsb.analyze_aircraft(ac)
            if risk:
                risks.append(risk)
                yield json.dumps({"type": "risk", "content": f"SAFETY ALERT: {ac.get('callsign')} - {risk.risk_level}"})

        # 2. Construct Complex Prompt for Gemini
        prompt = f"""
        You are ARES (Autonomous Radar Engagement System), an advanced AI Air Traffic Controller.
        
        Current Airspace Telemetry:
        {json.dumps(aircraft_data, indent=2)}
        
        Detected Risks (NTSB):
        {json.dumps(risks, indent=2)}
        
        MISSION:
        1. Analyze the traffic pattern.
        2. Identify potential conflicts or inefficiencies.
        3. Propose vector changes (Ghost Paths) to optimize flow.
        
        OUTPUT FORMAT:
        You must stream your response in a specific way. 
        Use the following tags for different types of output:
        
        [THOUGHT] ... your reasoning process ... [/THOUGHT]
        [SOLUTION] ... valid GeoJSON FeatureCollection of proposed paths ... [/SOLUTION]
        
        Think step-by-step. First, evaluate the situation. Then, simulate a solution. Finally, output the GeoJSON.
        Make your thoughts sound technical, precise, and "sci-fi" (e.g., "Calculating intercept vectors...", "Simulating wake turbulence...").
        """

        # 3. Stream from Gemini
        try:
            response = await self.model.generate_content_async(prompt, stream=True)
            
            buffer = ""
            async for chunk in response:
                text = chunk.text
                buffer += text
                
                # Simple parsing logic (robustness can be improved)
                if "[THOUGHT]" in buffer and "[/THOUGHT]" in buffer:
                    start = buffer.find("[THOUGHT]") + 9
                    end = buffer.find("[/THOUGHT]")
                    thought = buffer[start:end].strip()
                    yield json.dumps({"type": "thought", "content": thought})
                    buffer = buffer[end+10:] # Clear processed thought
                
                if "[SOLUTION]" in buffer and "[/SOLUTION]" in buffer:
                    start = buffer.find("[SOLUTION]") + 10
                    end = buffer.find("[/SOLUTION]")
                    solution_str = buffer[start:end].strip()
                    try:
                        # Clean up any markdown code blocks if present
                        if "```json" in solution_str:
                            solution_str = solution_str.replace("```json", "").replace("```", "")
                        
                        solution_json = json.loads(solution_str)
                        yield json.dumps({"type": "solution", "data": solution_json})
                    except Exception as e:
                        print(f"Failed to parse solution JSON: {e}")
                        yield json.dumps({"type": "error", "content": "Failed to parse tactical solution."})
                    buffer = buffer[end+11:]

            # Flush any remaining thoughts if formatted loosely
            if buffer.strip():
                 yield json.dumps({"type": "thought", "content": buffer.strip()})

            print(f"Cortex Error: {e}")
            yield json.dumps({"type": "error", "content": f"Cortex Malfunction: {str(e)}"})

    async def process_command(self, command: str, aircraft_list: List[Dict]) -> Dict[str, Any]:
        """
        Interprets a natural language command and executes it.
        """
        # 1. Context Preparation
        context_summary = f"Tracking {len(aircraft_list)} aircraft. "
        context_summary += ", ".join([f"{ac['callsign']} ({ac['velocity_kts']}kts, {ac['altitude_ft']}ft)" for ac in aircraft_list[:5]])
        
        prompt = f"""
        You are the BRAIN of an advanced Air Traffic Control system.
        
        USER COMMAND: "{command}"
        CONTEXT: {context_summary}
        
        YOUR JOB:
        Translate the user's natural language command into a structured JSON action.
        
        AVAILABLE ACTIONS:
        1. "ROUTE_AVOIDANCE": Generate safe corridors.
           - params: "target_criteria" (e.g., "HEAVY", "ALL", "UNITED"), "reason" (e.g. "STORM", "TRAFFIC")
        2. "VOICE_COMMAND": Queue a radio transmission.
           - params: "target_callsign", "message"
        3. "HIGHLIGHT": Highlight specific aircraft on the map.
           - params: "criteria" (e.g., "SPEED > 400", "AIRLINE=UAL")
        4. "GENERAL_QUERY": Answer a question about the airspace.
           - params: "answer"
           
        OUTPUT JSON ONLY.
        Example: {{ "action": "ROUTE_AVOIDANCE", "params": {{ "target_criteria": "HEAVY", "reason": "STORM" }} }}
        """
        
        # --- HARD-CODED DEMO LOGIC (For Reliability) ---
        cmd_lower = command.lower()
        
        if "analyze" in cmd_lower or "report" in cmd_lower:
            return {
                "action": "ANALYZE_SECTOR",
                "params": {}
            }
            
        if "route" in cmd_lower or "avoid" in cmd_lower:
            # Extract target if possible
            target = "ALL"
            if "united" in cmd_lower: target = "UAL"
            if "delta" in cmd_lower: target = "DAL"
            if "heavy" in cmd_lower: target = "HEAVY"
            
            return {
                "action": "ROUTE_AVOIDANCE",
                "params": {
                    "target_criteria": target,
                    "reason": "weather/traffic"
                }
            }
            
        if "focus" in cmd_lower or "track" in cmd_lower:
             # Find a likely callsign in the command
            target = None
            for ac in aircraft_list:
                if ac['callsign'].lower() in cmd_lower:
                    target = ac['callsign']
                    break
            
            # If no specific callsign, pick the first one
            if not target and aircraft_list:
                target = aircraft_list[0]['callsign']
                
            return {
                "action": "HIGHLIGHT",
                "params": {
                    "target_callsign": target
                }
            }

        if "priority" in cmd_lower:
             # Find a likely callsign in the command
            target = None
            for ac in aircraft_list:
                if ac['callsign'].lower() in cmd_lower:
                    target = ac['callsign']
                    break
            
            return {
                "action": "PRIORITY_LANDING",
                "params": {
                    "target_callsign": target or "UNKNOWN"
                }
            }

        # --- END DEMO LOGIC ---

        try:
            response = await self.model.generate_content_async(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            
            action_plan = json.loads(text)
            return action_plan
            
        except Exception as e:
            print(f"Command Processing Error: {e}")
            # Fallback for demo if LLM fails
            return {"action": "GENERAL_QUERY", "params": {"answer": "I'm having trouble connecting to my neural core, but I heard you."}}
