import { useEffect, useState } from 'react';

interface AIAction {
  id: string;
  timestamp: string;
  agent: string;
  type: string;
  callsign: string;
  clearance: string;
  reason: string;
  priority: string;
  status: string;
  transmitted: boolean;
}

interface AgentStats {
  actions: number;
  conflicts_resolved?: number;
  sequences_optimized?: number;
  handoffs_executed?: number;
  anomalies_detected?: number;
  redistributions?: number;
}

interface AIStatus {
  active: boolean;
  last_analysis: string;
  total_actions: number;
  pending_actions: number;
  transmitted_actions: number;
  agent_statistics: {
    separation_manager: AgentStats;
    traffic_sequencer: AgentStats;
    safety_monitor: AgentStats;
    workload_balancer: AgentStats;
  };
}

interface VoiceQueueStatus {
  queue_length: number;
  emergency_count: number;
  critical_count: number;
  routine_count: number;
  successful_transmissions_today: number;
}

export default function MultiAgentDashboard() {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [voiceQueue, setVoiceQueue] = useState<VoiceQueueStatus | null>(null);
  const [autopilot, setAutopilot] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [actionsRes, voiceRes] = await Promise.all([
          fetch('http://localhost:8000/api/ai/actions'),
          fetch('http://localhost:8000/api/voice/queue')
        ]);

        const actionsData = await actionsRes.json();
        const voiceData = await voiceRes.json();

        setActions(actionsData.actions || []);
        setStatus(actionsData.status);
        setVoiceQueue(voiceData);
      } catch (error) {
        console.error('Failed to fetch multi-agent data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);

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

  const testElevenLabs = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/voice/test-transmission', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert(`ElevenLabs Test Successful!\nQueued: "${data.text}"\nPosition in queue: ${data.queue_position}`);
      } else {
        alert(`ElevenLabs Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to test ElevenLabs - check backend logs');
    }
  };

  const createScenario = async (scenario: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/simulation/create-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      const data = await response.json();
      alert(`Scenario Created: ${data.description}\n\nExpected Actions:\n${data.expected_actions?.join('\n') || 'N/A'}\n\n${data.separation || ''}`);
    } catch (error) {
      alert('Failed to create scenario');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      'IMMEDIATE': 'bg-red-600 text-white',
      'URGENT': 'bg-orange-600 text-white',
      'ROUTINE': 'bg-blue-600 text-white'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-600 text-white';
  };

  const getAgentColor = (agent: string) => {
    const colors = {
      'separation_manager': 'text-red-400',
      'traffic_sequencer': 'text-blue-400',
      'safety_monitor': 'text-yellow-400',
      'workload_balancer': 'text-purple-400'
    };
    return colors[agent as keyof typeof colors] || 'text-gray-400';
  };

  const getAgentName = (agent: string) => {
    const names = {
      'separation_manager': 'Separation Manager',
      'traffic_sequencer': 'Traffic Sequencer',
      'safety_monitor': 'Safety Monitor',
      'workload_balancer': 'Workload Balancer'
    };
    return names[agent as keyof typeof names] || agent;
  };

  const filteredActions = filter === 'all' ? actions : actions.filter(a => a.agent === filter);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-5 shadow-2xl">
      {/* Header */}
      <div className="mb-5 pb-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-white">Multi-Agent Autonomous ATC System</h2>
            <p className="text-xs text-slate-400 mt-1">Specialized AI agents working in parallel</p>
          </div>

          <button
            onClick={toggleAutopilot}
            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
              autopilot
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {autopilot ? 'AUTOPILOT ACTIVE' : 'AUTOPILOT INACTIVE'}
          </button>
        </div>

        {/* Test & Simulation Buttons */}
        <div className="flex gap-2">
          <button
            onClick={testElevenLabs}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold transition-colors"
          >
            Test ElevenLabs Voice
          </button>
          <button
            onClick={() => createScenario('separation_violation')}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
          >
            Simulate Separation Violation
          </button>
          <button
            onClick={() => createScenario('traffic_surge')}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold transition-colors"
          >
            Simulate Traffic Surge
          </button>
        </div>
      </div>

      {/* Agent Statistics */}
      {status && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="bg-red-900/20 border border-red-800/50 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-red-300">Separation Manager</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{status.agent_statistics.separation_manager.actions}</div>
            <div className="text-xs text-slate-400 mt-1">
              {status.agent_statistics.separation_manager.conflicts_resolved || 0} conflicts resolved
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-800/50 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-300">Traffic Sequencer</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{status.agent_statistics.traffic_sequencer.actions}</div>
            <div className="text-xs text-slate-400 mt-1">
              {status.agent_statistics.traffic_sequencer.sequences_optimized || 0} sequences optimized
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-800/50 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-yellow-300">Safety Monitor</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{status.agent_statistics.safety_monitor.actions}</div>
            <div className="text-xs text-slate-400 mt-1">
              {status.agent_statistics.safety_monitor.anomalies_detected || 0} anomalies detected
            </div>
          </div>

          <div className="bg-purple-900/20 border border-purple-800/50 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-300">Workload Balancer</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">{status.agent_statistics.workload_balancer.actions}</div>
            <div className="text-xs text-slate-400 mt-1">
              {status.agent_statistics.workload_balancer.redistributions || 0} redistributions
            </div>
          </div>
        </div>
      )}

      {/* Voice Queue Status */}
      {voiceQueue && voiceQueue.queue_length > 0 && (
        <div className="bg-indigo-900/20 border border-indigo-800/50 rounded p-3 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-indigo-300">ElevenLabs Voice Transmission Queue</span>
              <div className="flex gap-4 mt-2 text-xs">
                {voiceQueue.emergency_count > 0 && (
                  <span className="text-red-400">{voiceQueue.emergency_count} EMERGENCY</span>
                )}
                {voiceQueue.critical_count > 0 && (
                  <span className="text-orange-400">{voiceQueue.critical_count} CRITICAL</span>
                )}
                {voiceQueue.routine_count > 0 && (
                  <span className="text-blue-400">{voiceQueue.routine_count} ROUTINE</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-400">{voiceQueue.queue_length}</div>
              <div className="text-xs text-slate-400">queued</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Today: {voiceQueue.successful_transmissions_today} successful transmissions
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            filter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          All Agents
        </button>
        <button
          onClick={() => setFilter('separation_manager')}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            filter === 'separation_manager' ? 'bg-red-900 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Separation
        </button>
        <button
          onClick={() => setFilter('traffic_sequencer')}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            filter === 'traffic_sequencer' ? 'bg-blue-900 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Sequencing
        </button>
        <button
          onClick={() => setFilter('safety_monitor')}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            filter === 'safety_monitor' ? 'bg-yellow-900 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Safety
        </button>
        <button
          onClick={() => setFilter('workload_balancer')}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            filter === 'workload_balancer' ? 'bg-purple-900 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Workload
        </button>
      </div>

      {/* Actions Feed */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredActions.length === 0 ? (
          <div className="bg-slate-800 rounded p-6 text-center">
            <div className="text-slate-400 text-sm">
              {filter === 'all' ? 'Multi-agent system monitoring... awaiting situation analysis' : 'No actions from this agent yet'}
            </div>
            <div className="text-slate-500 text-xs mt-2">Cycle interval: 15 seconds</div>
          </div>
        ) : (
          filteredActions.map((action) => (
            <div
              key={action.id}
              className="bg-slate-800 border border-slate-700 rounded p-3 hover:bg-slate-750 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{action.callsign}</span>
                    <span className={`text-xs font-semibold ${getAgentColor(action.agent)}`}>
                      [{getAgentName(action.agent)}]
                    </span>
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                      {action.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPriorityBadge(action.priority)}`}>
                    {action.priority}
                  </span>
                  {action.transmitted && (
                    <span className="bg-green-900 text-green-300 px-2 py-0.5 rounded text-xs font-semibold">
                      TRANSMITTED
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 rounded p-2 mb-2">
                <p className="text-sm text-slate-200 leading-relaxed">{action.clearance}</p>
              </div>

              <div className="text-xs text-slate-400">
                <span className="font-semibold">Reason:</span> {action.reason}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {status && (
        <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
          <div className="flex gap-4">
            <span className="text-slate-400">
              Total: <span className="text-white font-semibold">{status.total_actions}</span>
            </span>
            <span className="text-slate-400">
              Pending: <span className="text-yellow-400 font-semibold">{status.pending_actions}</span>
            </span>
            <span className="text-slate-400">
              Transmitted: <span className="text-green-400 font-semibold">{status.transmitted_actions}</span>
            </span>
          </div>
          <div className="text-slate-500">
            Last analysis: {status.last_analysis ? new Date(status.last_analysis).toLocaleTimeString() : 'N/A'}
          </div>
        </div>
      )}
    </div>
  );
}
