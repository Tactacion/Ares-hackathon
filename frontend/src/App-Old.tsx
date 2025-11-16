import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { RiskAlert, Aircraft } from './types';
import MapView from './components/MapView';
import WorkloadMetrics from './components/WorkloadMetrics';
import ProfessionalFeatures from './components/ProfessionalFeatures';
import MultiAgentDashboard from './components/MultiAgentDashboard';

function App() {
  const { sectorStatus, connected, error, reconnectAttempt } = useWebSocket();
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-blue-500/30 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                  <span className="text-4xl"></span>
                  ARES
                </h1>
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse shadow-lg">
                   PRO
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Aerial Risk Evaluation System • AI-Powered ATC Safety • <span className="text-purple-400 font-semibold">Professional Edition</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md transition-all ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🗺️ Map View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                 Table View
              </button>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">Connection Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  connected
                    ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50'
                    : reconnectAttempt > 0
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-semibold">
                  {connected
                    ? 'Connected'
                    : reconnectAttempt > 0
                      ? `Reconnecting (${reconnectAttempt})...`
                      : 'Disconnected'
                  }
                </span>
              </div>
            </div>

            {sectorStatus && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Controller Workload</p>
                <p className={`text-2xl ${getWorkloadColor(sectorStatus.controller_workload)}`}>
                  {sectorStatus.controller_workload}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-200 font-bold mb-1"> WebSocket Connection Error</p>
              <p className="text-red-300 text-sm">{error}</p>
              <p className="text-red-400 text-xs mt-2">
                {reconnectAttempt > 0
                  ? `Attempting to reconnect (attempt ${reconnectAttempt})...`
                  : 'Connection lost. Will retry automatically.'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold text-sm transition-colors"
            >
              Force Reload
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 pb-20">
        {/* Left Sidebar - AI Copilot, Professional Features & Alerts */}
        <div className="lg:col-span-1 space-y-4">
          {/* Professional Features Panel - NEW! */}
          <ProfessionalFeatures />

          {/* Workload Metrics - NEW! */}
          <WorkloadMetrics />

          {/* MULTI-AGENT AUTONOMOUS ATC SYSTEM */}
          <MultiAgentDashboard />

          {/* Active Alerts */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl"></span>
              Active Alerts
              {sectorStatus?.active_alerts && sectorStatus.active_alerts.length > 0 && (
                <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs animate-pulse">
                  {sectorStatus.active_alerts.length}
                </span>
              )}
            </h2>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {sectorStatus?.active_alerts.length ? (
                sectorStatus.active_alerts.map((alert: RiskAlert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg p-4 border-l-4 shadow-lg ${
                      alert.severity === 'CRITICAL' ? 'bg-red-900/30 border-red-500 animate-pulse' : 'bg-slate-900/50 border-orange-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(alert.severity)} shadow-lg`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{alert.risk_type}</span>
                    </div>

                    <p className="text-sm mb-3 font-semibold">{alert.description}</p>

                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="bg-slate-800/50 p-2 rounded">
                        <p className="text-green-400"><strong>✅ Action:</strong></p>
                        <p className="mt-1">{alert.recommended_action}</p>
                      </div>

                      {alert.pilot_message && (
                        <div className="bg-yellow-900/30 p-2 rounded border border-yellow-600/30">
                          <p className="text-yellow-400"><strong>📡 Pilot Message:</strong></p>
                          <p className="mt-1 font-mono">{alert.pilot_message}</p>
                        </div>
                      )}

                      {alert.ntsb_reference && (
                        <div className="bg-blue-900/30 p-3 rounded border border-blue-600/30">
                          <p className="text-blue-300 font-bold mb-2">
                            📋 NTSB: {alert.ntsb_reference.event_id}
                          </p>
                          <p className="text-xs text-slate-300">{alert.ntsb_reference.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-6xl mb-4">✅</p>
                  <p className="text-xl font-bold mb-2">All Clear</p>
                  <p className="text-sm">No active alerts</p>
                </div>
              )}
            </div>
          </div>

          {/* Weather */}
          {sectorStatus?.weather && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 shadow-xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-2xl">🌤️</span>
                Weather - {sectorStatus.weather.airport}
              </h2>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 p-3 rounded">
                    <p className="text-slate-400 text-xs mb-1">Visibility</p>
                    <p className="text-2xl font-mono font-bold">{sectorStatus.weather.visibility_sm} <span className="text-sm">SM</span></p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded">
                    <p className="text-slate-400 text-xs mb-1">Temp</p>
                    <p className="text-2xl font-mono font-bold">{sectorStatus.weather.temperature_c}°<span className="text-sm">C</span></p>
                  </div>
                </div>

                <div className="bg-slate-900/50 p-3 rounded">
                  <p className="text-slate-400 text-xs mb-1">Wind</p>
                  <p className="font-mono text-lg">
                    {sectorStatus.weather.wind_direction_deg}° @ {sectorStatus.weather.wind_speed_kts}kts
                  </p>
                </div>

                {sectorStatus.weather.phenomena.length > 0 && (
                  <div className="bg-yellow-900/30 p-3 rounded border border-yellow-600/30">
                    <p className="text-yellow-400 text-xs font-bold mb-2"> Phenomena</p>
                    <div className="flex flex-wrap gap-2">
                      {sectorStatus.weather.phenomena.map((wx, idx) => (
                        <span key={idx} className="bg-yellow-800 px-2 py-1 rounded text-xs font-mono">
                          {wx}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 rounded p-3 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-2">RAW METAR</p>
                  <p className="text-xs text-green-400 font-mono leading-relaxed">
                    {sectorStatus.weather.raw_metar}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area - Map or Table */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 shadow-xl h-[calc(100vh-180px)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">{viewMode === 'map' ? '🗺️' : ''}</span>
                {viewMode === 'map' ? 'Live Aircraft Map' : 'Aircraft Table'}
                {sectorStatus && (
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                    {sectorStatus.aircraft_count} aircraft
                  </span>
                )}
              </h2>

              {sectorStatus && viewMode === 'table' && (
                <div className="text-xs text-slate-400">
                  <p>KDEN • 40nm radius • Updates every 2s</p>
                </div>
              )}
            </div>

            {viewMode === 'map' ? (
              /* Map View */
              <div className="h-full">
                {sectorStatus?.aircraft && sectorStatus.aircraft.length > 0 ? (
                  <MapView aircraft={sectorStatus.aircraft} />
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-900/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-7xl mb-4 animate-pulse">📡</div>
                      <p className="text-xl mb-2">Initializing Aircraft Data...</p>
                      <p className="text-sm text-slate-400">Connecting to ADS-B feed</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-auto h-full rounded-lg border border-slate-700/50">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gradient-to-r from-slate-900 to-blue-900 border-b border-slate-600 shadow-lg">
                    <tr className="text-left">
                      <th className="p-3 font-bold">Callsign</th>
                      <th className="p-3 font-bold">Altitude</th>
                      <th className="p-3 font-bold">Speed</th>
                      <th className="p-3 font-bold">Heading</th>
                      <th className="p-3 font-bold">Vert Rate</th>
                      <th className="p-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectorStatus?.aircraft.map((aircraft: Aircraft) => (
                      <tr
                        key={aircraft.icao24}
                        className="border-b border-slate-700/30 hover:bg-blue-900/20 transition-all cursor-pointer"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{aircraft.on_ground ? '🛬' : ''}</span>
                            <span className="font-mono font-bold text-cyan-400">{aircraft.callsign}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono bg-slate-900/50 px-2 py-1 rounded inline-block">
                            {Math.round(aircraft.altitude_ft).toLocaleString()}<span className="text-xs text-slate-400">ft</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono bg-slate-900/50 px-2 py-1 rounded inline-block">
                            {Math.round(aircraft.velocity_kts)}<span className="text-xs text-slate-400">kts</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono bg-slate-900/50 px-2 py-1 rounded inline-block">
                            {Math.round(aircraft.heading_deg)}°
                          </div>
                        </td>
                        <td className={`p-3 font-mono font-bold ${
                          aircraft.vertical_rate_fpm > 500 ? 'text-green-400' :
                          aircraft.vertical_rate_fpm < -500 ? 'text-yellow-400' :
                          'text-slate-400'
                        }`}>
                          <div className="flex items-center gap-1">
                            {aircraft.vertical_rate_fpm > 0 ? '↗️' : aircraft.vertical_rate_fpm < 0 ? '↘️' : '→'}
                            <span>{Math.abs(Math.round(aircraft.vertical_rate_fpm))}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                            aircraft.on_ground
                              ? 'bg-slate-600 text-white'
                              : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                          }`}>
                            {aircraft.on_ground ? '🛬 GROUND' : ' AIRBORNE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!sectorStatus?.aircraft.length && (
                  <div className="text-center py-16 text-slate-400">
                    <div className="text-7xl mb-4 animate-pulse">📡</div>
                    <p className="text-xl mb-2">Initializing Aircraft Data...</p>
                    <p className="text-sm">Connecting to ADS-B feed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900/80 backdrop-blur-sm border-t border-blue-500/30 px-6 py-3 fixed bottom-0 w-full shadow-lg z-50">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-6">
            <p className="flex items-center gap-2">
              <span className="text-green-500">●</span>
              ARES v1.0 | AI-Powered ATC Safety System
            </p>
            <p className="flex items-center gap-2">
              <span className="text-blue-400">🤖</span>
              Claude Sonnet 4 • NTSB Database • Real-Time Risk Analysis
            </p>
            <p className="flex items-center gap-2">
              <span className="text-purple-400">🗺️</span>
              Mapbox GL • Live 3D Visualization
            </p>
          </div>
          {sectorStatus && (
            <p className="font-mono">
              Last Update: {new Date(sectorStatus.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
