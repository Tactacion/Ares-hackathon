import { useState, useEffect } from 'react';

interface AgentStats {
  actions: number;
  conflicts_resolved?: number;
  sequences_optimized?: number;
  handoffs_executed?: number;
  anomalies_detected?: number;
  redistributions?: number;
}

interface MultiAgentStats {
  system_active: boolean;
  last_analysis: string | null;
  total_actions: number;
  agent_stats: {
    separation_manager: AgentStats;
    traffic_sequencer: AgentStats;
    handoff_coordinator: AgentStats;
    safety_monitor: AgentStats;
    workload_balancer: AgentStats;
  };
  recent_actions: number;
}

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

export default function AgentDashboard() {
  const [stats, setStats] = useState<MultiAgentStats | null>(null);
  const [actions, setActions] = useState<AIAction[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch multi-agent statistics
        const statsResponse = await fetch('http://localhost:8000/api/ai/statistics');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('📊 Stats received:', statsData);
          setStats(statsData);
        } else {
          console.error('Stats response not ok:', statsResponse.status);
        }

        // Fetch recent AI actions
        const actionsResponse = await fetch('http://localhost:8000/api/ai/actions');
        if (actionsResponse.ok) {
          const actionsData = await actionsResponse.json();
          console.log('🎬 Actions received:', actionsData.actions?.length || 0, 'actions');
          setActions(actionsData.actions ? actionsData.actions.slice(0, 10) : []); // Last 10 actions
        } else {
          console.error('Actions response not ok:', actionsResponse.status);
        }
      } catch (error) {
        console.error('❌ Error fetching agent data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const getAgentIcon = (agent: string) => {
    const icons: Record<string, string> = {
      separation_manager: '🛡️',
      traffic_sequencer: '🔄',
      handoff_coordinator: '🤝',
      safety_monitor: '⚠️',
      workload_balancer: '⚖️',
    };
    return icons[agent] || '🤖';
  };

  const getAgentName = (agent: string) => {
    const names: Record<string, string> = {
      separation_manager: 'Separation Manager',
      traffic_sequencer: 'Traffic Sequencer',
      handoff_coordinator: 'Handoff Coordinator',
      safety_monitor: 'Safety Monitor',
      workload_balancer: 'Workload Balancer',
    };
    return names[agent] || agent;
  };

  const getAgentStatus = (agentKey: string) => {
    if (!stats) return '⚫ OFFLINE';
    const agentStats = stats.agent_stats[agentKey as keyof typeof stats.agent_stats];

    // Check if agent just generated actions (within last 5 seconds)
    const recentActions = actions.filter(a => a.agent === agentKey);
    const hasRecentAction = recentActions.length > 0 && recentActions[0];

    if (hasRecentAction) {
      const actionTime = new Date(hasRecentAction.timestamp).getTime();
      const now = new Date().getTime();
      if (now - actionTime < 5000) {
        return '🔴 EXECUTING';
      }
    }

    if (agentStats && agentStats.actions > 0) {
      return '🟢 ACTIVE';
    }
    return '🟡 MONITORING';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'IMMEDIATE': return 'text-red-500';
      case 'URGENT': return 'text-orange-500';
      case 'ROUTINE': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* System Status */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          🤖 MULTI-AGENT STATUS
          {stats?.system_active && (
            <span className="text-green-400 text-sm animate-pulse">● OPERATIONAL</span>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats && Object.entries(stats.agent_stats).map(([agentKey, agentStats]) => {
            const status = getAgentStatus(agentKey);
            const isExecuting = status === '🔴 EXECUTING';

            return (
            <div
              key={agentKey}
              className={`bg-gray-700/50 rounded-lg p-3 border transition-all ${
                isExecuting
                  ? 'border-red-500 shadow-lg shadow-red-500/30 animate-pulse'
                  : 'border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getAgentIcon(agentKey)}</span>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {getAgentName(agentKey)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {getAgentStatus(agentKey)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Actions:</span>
                  <span className="font-bold text-blue-400">{agentStats.actions}</span>
                </div>
                {agentStats.conflicts_resolved !== undefined && (
                  <div className="flex justify-between">
                    <span>Conflicts Resolved:</span>
                    <span className="font-bold text-green-400">{agentStats.conflicts_resolved}</span>
                  </div>
                )}
                {agentStats.sequences_optimized !== undefined && (
                  <div className="flex justify-between">
                    <span>Sequences Optimized:</span>
                    <span className="font-bold text-green-400">{agentStats.sequences_optimized}</span>
                  </div>
                )}
                {agentStats.handoffs_executed !== undefined && (
                  <div className="flex justify-between">
                    <span>Handoffs:</span>
                    <span className="font-bold text-green-400">{agentStats.handoffs_executed}</span>
                  </div>
                )}
                {agentStats.anomalies_detected !== undefined && (
                  <div className="flex justify-between">
                    <span>Anomalies Detected:</span>
                    <span className="font-bold text-yellow-400">{agentStats.anomalies_detected}</span>
                  </div>
                )}
                {agentStats.redistributions !== undefined && (
                  <div className="flex justify-between">
                    <span>Redistributions:</span>
                    <span className="font-bold text-green-400">{agentStats.redistributions}</span>
                  </div>
                )}
              </div>
            </div>
          );
          })}
        </div>

        {stats && (
          <div className="mt-3 pt-3 border-t border-gray-600 flex items-center justify-between text-sm text-gray-400">
            <div>Total Actions: <span className="font-bold text-blue-400">{stats.total_actions}</span></div>
            <div>Pending: <span className="font-bold text-yellow-400">{stats.recent_actions}</span></div>
            {stats.last_analysis && (
              <div className="text-xs">Last Analysis: {formatTime(stats.last_analysis)}</div>
            )}
          </div>
        )}
      </div>

      {/* Recent AI Actions */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-3">
          📋 Recent AI Actions
        </h3>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {actions.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No AI actions yet. Create a scenario to see agents in action.
            </div>
          ) : (
            actions.map((action) => (
              <div
                key={action.id}
                className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{getAgentIcon(action.agent)}</span>
                      <span className="text-xs text-gray-400">{getAgentName(action.agent)}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-400">{formatTime(action.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{action.callsign}</span>
                      <span className={`text-xs font-bold ${getPriorityColor(action.priority)}`}>
                        [{action.priority}]
                      </span>
                    </div>
                    <div className="text-sm text-blue-400 mb-1">
                      {action.clearance}
                    </div>
                    <div className="text-xs text-gray-400">
                      Reason: {action.reason}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-1 rounded ${
                      action.transmitted
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-yellow-900/50 text-yellow-400'
                    }`}>
                      {action.transmitted ? '📻 Transmitted' : '⏳ Pending'}
                    </span>
                    <span className="text-xs text-gray-500">{action.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
