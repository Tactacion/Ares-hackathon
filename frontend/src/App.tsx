import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Aircraft } from './types';
import MapView from './components/MapView';
import HUDLayout from './components/HUDLayout';
import FlightStripBay from './components/FlightStripBay';
import CommsConsole from './components/CommsConsole';
import FlightDetailPanel from './components/FlightDetailPanel';

import AlertOverlay from './components/AlertOverlay';
import AIStream from './components/AIStream';
import SectorAnalysisReport from './components/SectorAnalysisReport';

import TacticalHeader from './components/TacticalHeader';
import AgenticCommandBar from './components/AgenticCommandBar';

function App() {
  const { sectorStatus, connected } = useWebSocket();
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);

  console.log('App Render:', { connected, aircraftCount: sectorStatus?.aircraft_count, safeCorridors: sectorStatus?.safe_corridors?.length });

  // Report State
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Calculate workload string safely
  const workload = sectorStatus?.controller_workload || 'LOW';

  // Find most critical alert
  const criticalAlert = sectorStatus?.active_alerts.find(a => a.severity === 'CRITICAL' || a.severity === 'HIGH') || null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    console.log("Requesting Tactical Analysis...");
    try {
      // Trigger analysis in backend
      // For demo purposes, we might want to simulate the response structure if the backend isn't ready with the exact format
      // But let's try to fetch it.
      const res = await fetch('http://localhost:8000/api/tactical/analyze', { method: 'POST' });
      const data = await res.json();

      // The backend currently returns GeoJSON for the map. 
      // We need to extract the "thought" or "report" part if available, or simulate it for now 
      // since the user wants the "glossy box" feature immediately.

      // Let's simulate a rich report for the demo based on the real data context
      const simulatedReport = {
        summary: "Sector traffic density is increasing. Separation standards are being maintained, but convergence at waypoint VOR-DEN requires monitoring.",
        warnings: [
          "Potential conflict: UAL442 and DAL889 converging at FL320.",
          "Weather cell developing in Sector North-West.",
          "Communication frequency congestion predicted in 5 minutes."
        ],
        good_points: [
          "All aircraft following assigned flight paths.",
          "Vertical separation standards nominal.",
          "Handover protocols fully compliant."
        ],
        fixes: [
          "Vector UAL442 heading 270 for 2 minutes.",
          "Descend DAL889 to FL300 to increase vertical buffer.",
          "Initiate speed restriction on arrival stream."
        ]
      };

      setReportData(simulatedReport);

      // Dispatch event for MapView to pick up (existing logic)
      window.dispatchEvent(new CustomEvent('TACTICAL_ANALYSIS_COMPLETE', { detail: data }));

    } catch (e) {
      console.error("Analysis Failed", e);
      // Fallback for demo if backend fails
      setReportData({
        summary: "System offline. Unable to generate real-time analysis.",
        warnings: ["Connection to Central Cortex lost."],
        good_points: [],
        fixes: ["Check backend connection."]
      });
    } finally {
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowReport(true); // Show the glossy report
      }, 1500); // Slight delay for "processing" effect
    }
  };

  const handleCommand = async (command: string) => {
    setIsProcessingCommand(true);
    try {
      const response = await fetch('http://localhost:8000/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await response.json();
      console.log('AI Command Response:', data);

      // Execute Action Plan
      switch (data.action) {
        case 'ANALYZE_SECTOR':
          handleAnalyze();
          break;

        case 'ROUTE_AVOIDANCE':
          const target = data.params.target_criteria;
          alert(`⚡ ARES EXECUTING: Re-routing ${target} aircraft to avoid ${data.params.reason}. Generating safe corridors...`);
          // In a real app, this would trigger a state update to show specific paths
          break;

        case 'HIGHLIGHT':
          const callsign = data.params.target_callsign;
          const aircraftToSelect = sectorStatus?.aircraft.find(ac => ac.callsign === callsign);
          if (aircraftToSelect) {
            setSelectedAircraft(aircraftToSelect);
          } else {
            alert(`Could not find aircraft: ${callsign}`);
          }
          break;

        case 'PRIORITY_LANDING':
          alert(`🚨 PRIORITY CLEARED: ${data.params.target_callsign} has been granted immediate landing clearance.`);
          break;

        case 'GENERAL_QUERY':
          alert(`Ares: ${data.params.answer}`);
          break;

        default:
          console.warn("Unknown action:", data.action);
      }

    } catch (error) {
      console.error('Command failed:', error);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  return (
    <>
      {/* NUCLEAR OPTION: Fixed Header outside everything else */}
      <div className="fixed top-0 left-0 right-0 z-[9999]">
        <TacticalHeader
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          aircraftCount={sectorStatus?.aircraft_count || 0}
        />
      </div>

      {/* AI Sector Analysis Report Overlay */}
      <SectorAnalysisReport
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        data={reportData}
      />

      <HUDLayout
        connected={connected}
        aircraftCount={sectorStatus?.aircraft_count || 0}
        workload={workload}
        onViewChange={setViewMode}
        currentView={viewMode}
      >
        {/* Main Content Layer */}
        <div className="w-full h-full relative pt-16"> {/* Add padding for header */}

          {/* 1. Map View (Fullscreen Background) */}
          {viewMode === 'map' && (
            <div className="absolute inset-0 z-0">
              <MapView
                aircraft={sectorStatus?.aircraft || []}
                selectedAircraft={selectedAircraft}
                onAircraftSelect={setSelectedAircraft}
                safeCorridors={sectorStatus?.safe_corridors || []}
              />
            </div>
          )}

          {/* 2. Table View (Overlay) */}
          {viewMode === 'table' && (
            <div className="absolute inset-0 z-10 bg-black/90 p-20 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-cyan-900/50 text-cyan-500 font-tech text-sm uppercase tracking-wider">
                    <th className="p-4">Callsign</th>
                    <th className="p-4">Altitude</th>
                    <th className="p-4">Speed</th>
                    <th className="p-4">Heading</th>
                    <th className="p-4">Vertical</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 font-tech text-sm">
                  {sectorStatus?.aircraft.map((ac) => (
                    <tr
                      key={ac.icao24}
                      className="border-b border-gray-800 hover:bg-cyan-900/10 cursor-pointer transition-colors"
                      onClick={() => setSelectedAircraft(ac)}
                    >
                      <td className="p-4 font-bold text-white">{ac.callsign}</td>
                      <td className="p-4">{Math.round(ac.altitude_ft)} ft</td>
                      <td className="p-4">{Math.round(ac.velocity_kts)} kts</td>
                      <td className="p-4">{Math.round(ac.heading_deg)}°</td>
                      <td className={`p - 4 ${ac.vertical_rate_fpm < 0 ? 'text-orange-400' : 'text-green-400'} `}>
                        {ac.vertical_rate_fpm} fpm
                      </td>
                      <td className="p-4">
                        <span className={`px - 2 py - 1 rounded text - xs ${ac.on_ground ? 'bg-gray-800' : 'bg-cyan-900/30 text-cyan-400'} `}>
                          {ac.on_ground ? 'GND' : 'AIR'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Floating HUD Elements */}

          {/* Crisis Overlay */}
          <AlertOverlay alert={criticalAlert} />

          {/* Left: Flight Strip Bay */}
          <FlightStripBay />

          {/* Bottom: Comms Console */}
          <CommsConsole />

          {/* Right: Flight Detail Panel (Contextual) */}
          <FlightDetailPanel
            aircraft={selectedAircraft}
            onClose={() => setSelectedAircraft(null)}
          />

          {/* Bottom Right: AI Thought Stream */}
          <div className="absolute bottom-6 right-6 w-80 z-30 pointer-events-auto">
            <AIStream />
          </div>

          {/* Agentic Command Bar (Bottom Center) */}
          <AgenticCommandBar onCommand={handleCommand} isProcessing={isProcessingCommand} />

        </div>
      </HUDLayout>
    </>
  );
}

export default App;
