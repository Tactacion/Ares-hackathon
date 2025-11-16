import { useState } from 'react';

interface TestResult {
  test_name: string;
  timestamp: string;
  status: 'PASSED' | 'FAILED' | 'PARTIAL' | 'PENDING' | 'SKIPPED';
  details: string[];
  error?: string;
  audio_size_bytes?: number;
  audio_duration_ms?: number;
  urgency_tests?: Array<{
    urgency: string;
    success: boolean;
    size_bytes: number;
  }>;
  agent_activity?: Record<string, any>;
}

interface ComprehensiveTestResult {
  total_tests: number;
  passed: number;
  partial: number;
  failed: number;
  timestamp: string;
  overall_status: string;
  test_results: TestResult[];
}

export default function TestingPanel() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [comprehensiveResults, setComprehensiveResults] = useState<ComprehensiveTestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'tests' | 'helpers'>('tests');

  // Helper states
  const [separationCalc, setSeparationCalc] = useState<any>(null);
  const [quickRef, setQuickRef] = useState<any>(null);

  const runTest = async (endpoint: string, testName: string) => {
    setIsRunning(true);

    try {
      const response = await fetch(`http://localhost:8000/api/testing/${endpoint}`, {
        method: 'POST'
      });

      const result = await response.json();
      setTestResults(prev => [...prev, result]);
    } catch (error) {
      console.error(`Test ${testName} failed:`, error);
      setTestResults(prev => [...prev, {
        test_name: testName,
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        details: [],
        error: String(error)
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setComprehensiveResults(null);

    try {
      const response = await fetch('http://localhost:8000/api/testing/run-all', {
        method: 'POST'
      });

      const results = await response.json();
      setComprehensiveResults(results);
      setTestResults(results.test_results || []);
    } catch (error) {
      console.error('Comprehensive test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setComprehensiveResults(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED': return 'bg-green-900/30 border-green-600 text-green-300';
      case 'FAILED': return 'bg-red-900/30 border-red-600 text-red-300';
      case 'PARTIAL': return 'bg-yellow-900/30 border-yellow-600 text-yellow-300';
      case 'SKIPPED': return 'bg-gray-900/30 border-gray-600 text-gray-400';
      default: return 'bg-blue-900/30 border-blue-600 text-blue-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED': return '✓';
      case 'FAILED': return '✗';
      case 'PARTIAL': return '◐';
      case 'SKIPPED': return '○';
      default: return '•';
    }
  };

  const loadQuickReference = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/helper/quick-reference');
      const data = await response.json();
      setQuickRef(data);
    } catch (error) {
      console.error('Failed to load quick reference:', error);
    }
  };

  const calculateSeparation = async () => {
    // Example calculation between first two aircraft
    try {
      const response = await fetch('http://localhost:8000/api/sector/status');
      const data = await response.json();

      if (data.aircraft && data.aircraft.length >= 2) {
        const ac1 = data.aircraft[0];
        const ac2 = data.aircraft[1];

        const sepResponse = await fetch('http://localhost:8000/api/helper/calculate-separation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aircraft1_lat: ac1.latitude,
            aircraft1_lon: ac1.longitude,
            aircraft1_alt: ac1.altitude_ft,
            aircraft2_lat: ac2.latitude,
            aircraft2_lon: ac2.longitude,
            aircraft2_alt: ac2.altitude_ft
          })
        });

        const result = await sepResponse.json();
        setSeparationCalc({
          ...result,
          ac1_callsign: ac1.callsign,
          ac2_callsign: ac2.callsign
        });
      }
    } catch (error) {
      console.error('Failed to calculate separation:', error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-5 shadow-2xl h-full overflow-hidden flex flex-col">

      {/* Header */}
      <div className="mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">System Testing & Helper Tools</h2>
            <p className="text-xs text-slate-400 mt-1">Comprehensive diagnostics and ATC utilities</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'tests'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Testing Suite
            </button>
            <button
              onClick={() => setActiveTab('helpers')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'helpers'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              ATC Helpers
            </button>
          </div>
        </div>
      </div>

      {/* Testing Suite Tab */}
      {activeTab === 'tests' && (
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Test Control Buttons */}
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={runAllTests}
                disabled={isRunning}
                className="col-span-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </button>

              <button
                onClick={() => runTest('elevenlabs-basic', 'ElevenLabs Basic')}
                disabled={isRunning}
                className="bg-purple-900/50 hover:bg-purple-900/70 text-purple-300 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-50 border border-purple-700"
              >
                Test Voice (Basic)
              </button>

              <button
                onClick={() => runTest('elevenlabs-urgency', 'ElevenLabs Urgency')}
                disabled={isRunning}
                className="bg-purple-900/50 hover:bg-purple-900/70 text-purple-300 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-50 border border-purple-700"
              >
                Test Urgency
              </button>

              <button
                onClick={() => runTest('voice-queue', 'Voice Queue')}
                disabled={isRunning}
                className="bg-purple-900/50 hover:bg-purple-900/70 text-purple-300 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-50 border border-purple-700"
              >
                Test Queue
              </button>

              <button
                onClick={() => runTest('separation', 'Separation Detection')}
                disabled={isRunning}
                className="bg-red-900/50 hover:bg-red-900/70 text-red-300 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-50 border border-red-700"
              >
                Test Separation
              </button>

              <button
                onClick={() => runTest('multi-agent', 'Multi-Agent System')}
                disabled={isRunning}
                className="bg-blue-900/50 hover:bg-blue-900/70 text-blue-300 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-50 border border-blue-700"
              >
                Test Agents
              </button>

              <button
                onClick={() => runTest('workload', 'Workload Calculation')}
                disabled={isRunning}
                className="bg-yellow-900/50 hover:bg-yellow-900/70 text-yellow-300 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-50 border border-yellow-700"
              >
                Test Workload
              </button>

              <button
                onClick={() => runTest('weather', 'Weather Integration')}
                disabled={isRunning}
                className="bg-cyan-900/50 hover:bg-cyan-900/70 text-cyan-300 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-50 border border-cyan-700"
              >
                Test Weather
              </button>

              <button
                onClick={() => runTest('flight-tracking', 'Flight Tracking')}
                disabled={isRunning}
                className="bg-indigo-900/50 hover:bg-indigo-900/70 text-indigo-300 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-50 border border-indigo-700"
              >
                Test Tracking
              </button>

              <button
                onClick={clearResults}
                className="col-span-3 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded text-xs font-semibold transition-all border border-slate-600"
              >
                Clear Results
              </button>
            </div>
          </div>

          {/* Comprehensive Results Summary */}
          {comprehensiveResults && (
            <div className="mb-4 bg-slate-800/50 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Test Summary</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  comprehensiveResults.overall_status === 'PASSED'
                    ? 'bg-green-600 text-white'
                    : comprehensiveResults.overall_status === 'PARTIAL'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-red-600 text-white'
                }`}>
                  {comprehensiveResults.overall_status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-green-900/20 border border-green-800/50 rounded p-2">
                  <div className="text-2xl font-bold text-green-400">{comprehensiveResults.passed}</div>
                  <div className="text-xs text-slate-400">Passed</div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-800/50 rounded p-2">
                  <div className="text-2xl font-bold text-yellow-400">{comprehensiveResults.partial}</div>
                  <div className="text-xs text-slate-400">Partial</div>
                </div>
                <div className="bg-red-900/20 border border-red-800/50 rounded p-2">
                  <div className="text-2xl font-bold text-red-400">{comprehensiveResults.failed}</div>
                  <div className="text-xs text-slate-400">Failed</div>
                </div>
                <div className="bg-blue-900/20 border border-blue-800/50 rounded p-2">
                  <div className="text-2xl font-bold text-blue-400">{comprehensiveResults.total_tests}</div>
                  <div className="text-xs text-slate-400">Total</div>
                </div>
              </div>
            </div>
          )}

          {/* Test Results */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {testResults.length === 0 ? (
              <div className="bg-slate-800/30 rounded-lg p-8 text-center">
                <div className="text-slate-400 text-sm mb-2">No tests run yet</div>
                <div className="text-slate-500 text-xs">Click "Run All Tests" or test individual features</div>
              </div>
            ) : (
              testResults.map((result, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-4 transition-all ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getStatusIcon(result.status)}</span>
                      <div>
                        <h4 className="font-bold text-white">{result.test_name}</h4>
                        <p className="text-xs text-slate-400">{new Date(result.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold`}>
                      {result.status}
                    </span>
                  </div>

                  {result.error && (
                    <div className="bg-red-900/30 border border-red-700 rounded p-2 mb-2">
                      <p className="text-xs text-red-200">Error: {result.error}</p>
                    </div>
                  )}

                  {result.details && result.details.length > 0 && (
                    <div className="bg-slate-900/50 rounded p-3 space-y-1">
                      {result.details.map((detail, i) => (
                        <div key={i} className="text-xs text-slate-300 font-mono">{detail}</div>
                      ))}
                    </div>
                  )}

                  {result.audio_size_bytes && (
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-purple-300">Audio: {(result.audio_size_bytes / 1024).toFixed(1)} KB</span>
                      {result.audio_duration_ms && (
                        <span className="text-purple-300">Duration: ~{(result.audio_duration_ms / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  )}

                  {result.urgency_tests && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {result.urgency_tests.map((test, i) => (
                        <div key={i} className="bg-slate-900/50 rounded p-2">
                          <div className="text-xs font-bold text-white">{test.urgency}</div>
                          <div className="text-xs text-slate-400">
                            {test.success ? '✓' : '✗'} {(test.size_bytes / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.agent_activity && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.entries(result.agent_activity).map(([agent, stats]: [string, any]) => (
                        <div key={agent} className="bg-slate-900/50 rounded p-2">
                          <div className="text-xs font-bold text-white capitalize">
                            {agent.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-slate-400">
                            {stats.actions} actions
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ATC Helpers Tab */}
      {activeTab === 'helpers' && (
        <div className="flex-1 overflow-y-auto space-y-4">

          {/* Quick Reference */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">ATC Quick Reference</h3>
              <button
                onClick={loadQuickReference}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold transition-all"
              >
                Load Reference
              </button>
            </div>

            {quickRef && (
              <div className="space-y-3">
                <div className="bg-slate-900/50 rounded p-3">
                  <h4 className="text-sm font-bold text-blue-300 mb-2">Separation Standards (Radar)</h4>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>Horizontal: {quickRef.separation_standards.radar.horizontal}</div>
                    <div>Vertical: {quickRef.separation_standards.radar.vertical}</div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded p-3">
                  <h4 className="text-sm font-bold text-yellow-300 mb-2">Emergency Squawk Codes</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {Object.entries(quickRef.emergency_frequencies.squawk_codes).map(([type, code]) => (
                      <div key={type} className="bg-slate-800 rounded p-2">
                        <div className="text-slate-400 capitalize">{type.replace('_', ' ')}</div>
                        <div className="text-white font-mono font-bold">{code as string}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded p-3">
                  <h4 className="text-sm font-bold text-green-300 mb-2">Altitude Assignments</h4>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>IFR Eastbound: {quickRef.altitude_assignments.IFR_eastbound}</div>
                    <div>IFR Westbound: {quickRef.altitude_assignments.IFR_westbound}</div>
                    <div>VFR Eastbound: {quickRef.altitude_assignments.VFR_eastbound}</div>
                    <div>VFR Westbound: {quickRef.altitude_assignments.VFR_westbound}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Separation Calculator */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Separation Calculator</h3>
              <button
                onClick={calculateSeparation}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold transition-all"
              >
                Calculate (First 2 Aircraft)
              </button>
            </div>

            {separationCalc && (
              <div className="space-y-3">
                <div className="bg-slate-900/50 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-white">
                      {separationCalc.ac1_callsign} ↔ {separationCalc.ac2_callsign}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      separationCalc.status === 'SAFE'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {separationCalc.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-800 rounded p-2">
                      <div className="text-slate-400 mb-1">Horizontal</div>
                      <div className={`font-bold font-mono ${
                        separationCalc.meets_horizontal_standard ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {separationCalc.horizontal_separation_nm} nm
                      </div>
                      <div className="text-slate-500 text-xs">Min: 3.0 nm</div>
                    </div>

                    <div className="bg-slate-800 rounded p-2">
                      <div className="text-slate-400 mb-1">Vertical</div>
                      <div className={`font-bold font-mono ${
                        separationCalc.meets_vertical_standard ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {separationCalc.vertical_separation_ft} ft
                      </div>
                      <div className="text-slate-500 text-xs">Min: 1000 ft</div>
                    </div>
                  </div>

                  {!separationCalc.legal_separation && (
                    <div className="mt-2 bg-red-900/30 border border-red-700 rounded p-2">
                      <p className="text-xs text-red-200 font-bold">SEPARATION VIOLATION</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
            <h4 className="text-sm font-bold text-blue-300 mb-2">About ATC Helpers</h4>
            <div className="text-xs text-slate-300 space-y-2">
              <p>These tools provide instant access to critical ATC reference data and calculations.</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Quick Reference: Standards, codes, and procedures</li>
                <li>Separation Calculator: Real-time distance calculations</li>
                <li>Clearance Generator: Proper phraseology templates</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
