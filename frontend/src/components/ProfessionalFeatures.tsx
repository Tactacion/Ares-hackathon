import { useEffect, useState } from 'react';

interface RiskScoringInfo {
  tiers: {
    [key: string]: {
      score_range: string;
      action_time_seconds: number;
      auto_transmit: boolean;
      buzzer: boolean;
      description: string;
    };
  };
  scoring_formula: string;
  ntsb_frequencies: { [key: string]: number };
  ntsb_case_counts: { [key: string]: number };
}

interface VoiceQueue {
  queue_length: number;
  emergency_count: number;
  critical_count: number;
  routine_count: number;
  successful_transmissions_today: number;
  incorrect_readback_rate: number;
}

export default function ProfessionalFeatures() {
  const [riskInfo, setRiskInfo] = useState<RiskScoringInfo | null>(null);
  const [voiceQueue, setVoiceQueue] = useState<VoiceQueue | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [riskRes, voiceRes] = await Promise.all([
          fetch('http://localhost:8000/api/risk/scoring-info'),
          fetch('http://localhost:8000/api/voice/queue')
        ]);

        const riskData = await riskRes.json();
        const voiceData = await voiceRes.json();

        setRiskInfo(riskData);
        setVoiceQueue(voiceData);
      } catch (error) {
        console.error('Failed to fetch professional features data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (!riskInfo || !voiceQueue) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-blue-300 flex items-center gap-2">
          PROFESSIONAL FEATURES
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded">
            ACTIVE
          </span>
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showDetails ? '▼ Hide' : '▶ Details'}
        </button>
      </div>

      {/* Feature Summary */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Risk Scoring */}
        <div className="bg-slate-900/50 rounded p-3 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">Risk Scoring:</span>
            <div>
              <p className="text-xs text-green-400 font-bold">Risk Scoring</p>
              <p className="text-xs text-slate-400">NTSB-Weighted</p>
            </div>
          </div>
          <div className="text-xs text-green-300">
            <div className="flex justify-between">
              <span>Formula:</span>
              <span className="font-mono">4-Factor</span>
            </div>
            <div className="flex justify-between">
              <span>Tiers:</span>
              <span className="font-bold">4 Levels</span>
            </div>
          </div>
        </div>

        {/* Voice System */}
        <div className="bg-slate-900/50 rounded p-3 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">Voice System:</span>
            <div>
              <p className="text-xs text-purple-400 font-bold">Voice System</p>
              <p className="text-xs text-slate-400">ElevenLabs Pro</p>
            </div>
          </div>
          <div className="text-xs text-purple-300">
            <div className="flex justify-between">
              <span>Queue:</span>
              <span className="font-bold">{voiceQueue.queue_length} items</span>
            </div>
            <div className="flex justify-between">
              <span>Today:</span>
              <span className="font-bold">{voiceQueue.successful_transmissions_today} tx</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="border-t border-blue-500/20 pt-3 space-y-3">
          {/* Risk Tiers */}
          <div>
            <p className="text-sm text-blue-300 font-semibold mb-2">Risk Tier System</p>
            <div className="space-y-1 text-xs">
              {Object.entries(riskInfo.tiers).map(([tier, info]) => (
                <div key={tier} className="flex items-center justify-between bg-slate-800/50 rounded px-2 py-1">
                  <span className={`font-bold ${
                    tier === 'CRITICAL' ? 'text-red-400' :
                    tier === 'HIGH' ? 'text-orange-400' :
                    tier === 'MEDIUM' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>{tier}</span>
                  <span className="text-slate-400">{info.score_range}</span>
                  <span className="text-slate-300">{info.action_time_seconds}s</span>
                  {info.auto_transmit && <span className="text-green-400">✓ Auto-TX</span>}
                </div>
              ))}
            </div>
          </div>

          {/* NTSB Frequencies */}
          <div>
            <p className="text-sm text-blue-300 font-semibold mb-2">NTSB Frequency Data</p>
            <div className="space-y-1 text-xs">
              {Object.entries(riskInfo.ntsb_frequencies).map(([type, freq]) => (
                <div key={type} className="flex items-center justify-between bg-slate-800/50 rounded px-2 py-1">
                  <span className="text-slate-300 text-[10px]">{type.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-400 h-1.5 rounded-full"
                        style={{ width: `${freq * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-blue-300 font-bold w-10">{(freq * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Queue */}
          {voiceQueue.queue_length > 0 && (
            <div>
              <p className="text-sm text-purple-300 font-semibold mb-2">Voice Transmission Queue</p>
              <div className="bg-purple-900/30 rounded p-2 text-xs">
                {voiceQueue.emergency_count > 0 && (
                  <div className="text-red-300"> {voiceQueue.emergency_count} EMERGENCY</div>
                )}
                {voiceQueue.critical_count > 0 && (
                  <div className="text-orange-300"> {voiceQueue.critical_count} CRITICAL</div>
                )}
                {voiceQueue.routine_count > 0 && (
                  <div className="text-blue-300"> {voiceQueue.routine_count} ROUTINE</div>
                )}
              </div>
            </div>
          )}

          {/* Formula */}
          <div className="bg-blue-900/30 rounded p-2">
            <p className="text-[10px] text-blue-200 font-mono leading-relaxed">
              {riskInfo.scoring_formula}
            </p>
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400 font-semibold">System Active</span>
        </div>
        <span className="text-slate-500">v2.0 Professional</span>
      </div>
    </div>
  );
}
