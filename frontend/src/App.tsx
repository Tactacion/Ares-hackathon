import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { RiskAlert, Aircraft } from './types';
import MapView from './components/MapView';
import WorkloadMetrics from './components/WorkloadMetrics';
import ProfessionalFeatures from './components/ProfessionalFeatures';
import AudioPlayer from './components/AudioPlayer';
import AgentDashboard from './components/AgentDashboard';
import TaskPanel from './components/TaskPanel';
import WeatherTimeline from './components/WeatherTimeline';
import ConflictTimeline from './components/ConflictTimeline';

function App() {
  const { sectorStatus, connected, error } = useWebSocket();
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');

  const loadScenario = async (scenarioId: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/simulation/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId })
      });
      if (response.ok) {
        console.log(`Loaded scenario: ${scenarioId}`);
      }
    } catch (error) {
      console.error('Failed to load scenario:', error);
    }
  };

  // Auto-load critical scenario on startup for instant demo
  useEffect(() => {
    if (connected) {
      const timer = setTimeout(() => {
        loadScenario('separation_violation');
        console.log('🚨 Auto-loaded CRITICAL scenario for instant demo');
      }, 2000); // Wait 2s after connection for backend to be ready

      return () => clearTimeout(timer);
    }
  }, [connected]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white border-red-400';
      case 'HIGH': return 'bg-orange-500 text-white border-orange-400';
      case 'MEDIUM': return 'bg-yellow-500 text-black border-yellow-400';
      case 'LOW': return 'bg-blue-500 text-white border-blue-400';
      default: return 'bg-gray-500 text-white border-gray-400';
    }
  };

  const getWorkloadColor = (workload: string) => {
    switch (workload) {
      case 'CRITICAL': return 'text-red-600 font-bold animate-pulse';
      case 'HIGH': return 'text-orange-500 font-bold';
      case 'MODERATE': return 'text-yellow-500';
      case 'LOW': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ATC-Style Header */}
      <header className="bg-gray-950 border-b-2 border-cyan-500/50 px-6 py-2 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
              <h1 className="text-xl font-bold text-cyan-400 tracking-wider font-mono">
                ARES AUTONOMOUS ATC
              </h1>
            </div>
            <span className="text-xs text-gray-500 font-mono">MULTI-AGENT CONTROL SYSTEM</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Scenario Quick Load */}
            <div className="flex gap-2 bg-gray-900 p-1 rounded border border-gray-700">
              <button
                onClick={() => loadScenario('separation_violation')}
                className="px-3 py-1 text-xs font-mono rounded bg-red-900/50 text-red-300 hover:bg-red-800 border border-red-700 transition-all"
              >
                🚨 CRITICAL
              </button>
              <button
                onClick={() => loadScenario('high_workload')}
                className="px-3 py-1 text-xs font-mono rounded bg-orange-900/50 text-orange-300 hover:bg-orange-800 border border-orange-700 transition-all"
              >
                ⚡ HIGH TRAFFIC
              </button>
              <button
                onClick={() => loadScenario('approach_sequence')}
                className="px-3 py-1 text-xs font-mono rounded bg-blue-900/50 text-blue-300 hover:bg-blue-800 border border-blue-700 transition-all"
              >
                🛬 ARRIVALS
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-900 p-1 rounded border border-gray-700">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                  viewMode === 'map' ? 'bg-cyan-600 text-white' : 'text-gray-400'
                }`}
              >
                RADAR
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                  viewMode === 'table' ? 'bg-cyan-600 text-white' : 'text-gray-400'
                }`}
              >
                DATA
              </button>
            </div>

            {/* System Status */}
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded border border-gray-700">
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-400 font-mono">
                {connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Aircraft Count */}
            {sectorStatus && (
              <div className="bg-gray-900 px-3 py-1 rounded border border-cyan-700/50">
                <span className="text-xs text-cyan-400 font-mono">ACFT: </span>
                <span className="text-sm font-bold text-white font-mono">{sectorStatus.aircraft_count}</span>
              </div>
            )}

            {/* Workload */}
            {sectorStatus && (
              <div className="bg-gray-900 px-3 py-1 rounded border border-gray-700">
                <span className="text-xs text-gray-400 font-mono">LOAD: </span>
                <span className={`text-sm font-bold font-mono ${getWorkloadColor(sectorStatus.controller_workload)}`}>
                  {sectorStatus.controller_workload}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-900/50 border border-red-500 rounded text-sm">
          <p className="text-red-200 font-semibold">Connection Error: {error}</p>
        </div>
      )}

      {/* ATC 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-70px)] bg-gradient-to-br from-gray-950 via-black to-gray-950">

        {/* LEFT COLUMN - Multi-Agent Dashboard + Tasks + Audio Player + Workload (40% width) */}
        <div className="col-span-5 flex flex-col gap-4 overflow-y-auto">

          {/* Agent Dashboard with Statistics */}
          <AgentDashboard />

          {/* Task Panel - NEW! */}
          <TaskPanel />

          {/* Audio Player - PROMINENT */}
          <AudioPlayer />

          {/* Workload + Professional Features Row */}
          <div className="grid grid-cols-2 gap-4">
            <WorkloadMetrics />
            <ProfessionalFeatures />
          </div>

          {/* Timeline Predictors */}
          <div className="grid grid-cols-2 gap-4">
            <ConflictTimeline />
            <WeatherTimeline />
          </div>

        </div>

        {/* RIGHT COLUMN - Map/Table + Alerts (60% width) */}
        <div className="col-span-7 flex flex-col gap-4">

          {/* Map or Table View - LARGE */}
          <div className="flex-1 bg-slate-800/50 rounded-lg border border-slate-700 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">
                {viewMode === 'map' ? 'Live Traffic Map' : 'Aircraft Table'}
              </h2>
              {sectorStatus && (
                <span className="text-sm text-slate-400">
                  {sectorStatus.aircraft_count} aircraft tracked
                </span>
              )}
            </div>

            <div className="h-[calc(100%-40px)]">
              {viewMode === 'map' ? (
                <MapView aircraft={sectorStatus?.aircraft || []} />
              ) : (
                <div className="h-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900 sticky top-0">
                      <tr className="border-b border-slate-700">
                        <th className="p-2 text-left">Callsign</th>
                        <th className="p-2 text-left">Altitude</th>
                        <th className="p-2 text-left">Speed</th>
                        <th className="p-2 text-left">Heading</th>
                        <th className="p-2 text-left">V/S</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectorStatus?.aircraft.map((aircraft: Aircraft) => (
                        <tr key={aircraft.icao24} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                          <td className="p-2 font-mono font-bold text-cyan-400">{aircraft.callsign}</td>
                          <td className="p-2 font-mono">{Math.round(aircraft.altitude_ft).toLocaleString()}ft</td>
                          <td className="p-2 font-mono">{Math.round(aircraft.velocity_kts)}kts</td>
                          <td className="p-2 font-mono">{Math.round(aircraft.heading_deg)}°</td>
                          <td className="p-2 font-mono">
                            <span className={aircraft.vertical_rate_fpm > 0 ? 'text-green-400' : aircraft.vertical_rate_fpm < 0 ? 'text-red-400' : 'text-slate-400'}>
                              {aircraft.vertical_rate_fpm > 0 ? '↑' : aircraft.vertical_rate_fpm < 0 ? '↓' : '→'} {Math.abs(Math.round(aircraft.vertical_rate_fpm))}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              aircraft.on_ground ? 'bg-slate-600' : 'bg-blue-600'
                            }`}>
                              {aircraft.on_ground ? 'GROUND' : 'AIRBORNE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Active Alerts - Bottom */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 max-h-64 overflow-y-auto">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              Active Alerts
              {sectorStatus?.active_alerts && sectorStatus.active_alerts.length > 0 && (
                <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs">
                  {sectorStatus.active_alerts.length}
                </span>
              )}
            </h2>

            <div className="space-y-2">
              {sectorStatus?.active_alerts.length ? (
                sectorStatus.active_alerts.map((alert: RiskAlert) => (
                  <div
                    key={alert.id}
                    className="bg-slate-900 rounded p-3 border-l-4 border-red-500"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{alert.risk_type}</span>
                    </div>
                    <p className="text-sm text-slate-200">{alert.description}</p>
                    {alert.aircraft_involved && alert.aircraft_involved.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {alert.aircraft_involved.map((ac, idx) => (
                          <span key={idx} className="bg-blue-900/50 px-2 py-0.5 rounded text-xs font-mono text-blue-300">
                            {ac}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  No active alerts
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
