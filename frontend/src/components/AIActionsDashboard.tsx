import { useEffect, useState } from 'react';

interface AIAction {
  id: string;
  timestamp: string;
  type: string;
  callsign: string;
  clearance: string;
  reason: string;
  priority: string;
  status: string;
  transmitted: boolean;
}

interface AIStatus {
  active: boolean;
  last_analysis: string;
  total_actions: number;
  pending_actions: number;
  transmitted_actions: number;
}

export default function AIActionsDashboard() {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [autopilot, setAutopilot] = useState(true);

  useEffect(() => {
    const fetchActions = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/ai/actions');
        const data = await response.json();
        setActions(data.actions || []);
        setStatus(data.status);
      } catch (error) {
        console.error('Failed to fetch AI actions:', error);
      }
    };

    fetchActions();
    const interval = setInterval(fetchActions, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const toggleAutopilot = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ai/autopilot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !autopilot })
      });
      const data = await response.json();
      if (data.success) {
        setAutopilot(!autopilot);
      }
    } catch (error) {
      console.error('Failed to toggle autopilot:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'IMMEDIATE': return 'text-red-400 bg-red-900/30 border-red-500';
      case 'URGENT': return 'text-orange-400 bg-orange-900/30 border-orange-500';
      case 'ROUTINE': return 'text-blue-400 bg-blue-900/30 border-blue-500';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLEARANCE': return '✈️';
      case 'WARNING': return '⚠️';
      case 'HANDOFF': return '🔄';
      case 'SEQUENCING': return '📊';
      default: return '📡';
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-lg border border-indigo-500/30 p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🤖</span>
          <div>
            <h3 className="text-lg font-bold text-indigo-300">AUTONOMOUS AI CONTROLLER</h3>
            <p className="text-xs text-slate-400">Claude Sonnet 4 • Real-Time Decision Making</p>
          </div>
        </div>

        {/* Autopilot Toggle */}
        <button
          onClick={toggleAutopilot}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            autopilot
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50 animate-pulse'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {autopilot ? '✅ AUTOPILOT ON' : '❌ AUTOPILOT OFF'}
        </button>
      </div>

      {/* Status Bar */}
      {status && (
        <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-slate-400 mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <p className="text-white font-bold">{status.active ? 'ACTIVE' : 'INACTIVE'}</p>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-slate-400 mb-1">Total Actions</p>
            <p className="text-white font-bold text-lg">{status.total_actions}</p>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-slate-400 mb-1">Pending</p>
            <p className="text-yellow-400 font-bold text-lg">{status.pending_actions}</p>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-slate-400 mb-1">Transmitted</p>
            <p className="text-green-400 font-bold text-lg">{status.transmitted_actions}</p>
          </div>
        </div>
      )}

      {/* Actions Feed */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {actions.length === 0 ? (
          <div className="bg-slate-900/50 rounded p-8 text-center">
            <div className="text-4xl mb-2">🤖</div>
            <p className="text-slate-400 text-sm">AI is monitoring... waiting for situations to analyze</p>
            <p className="text-slate-500 text-xs mt-2">Cycles every 20 seconds</p>
          </div>
        ) : (
          actions.map((action) => (
            <div
              key={action.id}
              className={`rounded-lg p-4 border-l-4 ${getPriorityColor(action.priority)} backdrop-blur-sm`}
            >
              {/* Action Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTypeIcon(action.type)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-lg">{action.callsign}</span>
                      <span className="text-xs bg-slate-800 px-2 py-1 rounded font-mono">
                        {action.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Priority Badge */}
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    action.priority === 'IMMEDIATE' ? 'bg-red-600 text-white animate-pulse' :
                    action.priority === 'URGENT' ? 'bg-orange-600 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {action.priority}
                  </span>
                  {action.transmitted && (
                    <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                      <span>🎤</span> TRANSMITTED
                    </span>
                  )}
                </div>
              </div>

              {/* Clearance/Message */}
              <div className="bg-slate-900/70 rounded p-3 mb-2">
                <p className="text-indigo-200 font-medium leading-relaxed">
                  "{action.clearance}"
                </p>
              </div>

              {/* Reason */}
              <div className="flex items-start gap-2 text-xs">
                <span className="text-slate-400">Reason:</span>
                <span className="text-slate-300">{action.reason}</span>
              </div>

              {/* Status */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className={`px-2 py-1 rounded ${
                  action.status === 'TRANSMITTED' ? 'bg-green-900/50 text-green-300' :
                  action.status === 'ACKNOWLEDGED' ? 'bg-blue-900/50 text-blue-300' :
                  'bg-yellow-900/50 text-yellow-300'
                }`}>
                  Status: {action.status}
                </span>

                {action.status === 'PENDING' && !action.transmitted && (
                  <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                    Transmit Now
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      {status && status.last_analysis && (
        <div className="mt-4 pt-3 border-t border-indigo-500/20 text-xs text-slate-400 flex items-center justify-between">
          <span>
            Last AI analysis: {new Date(status.last_analysis).toLocaleTimeString()}
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Updates every 20s
          </span>
        </div>
      )}
    </div>
  );
}
