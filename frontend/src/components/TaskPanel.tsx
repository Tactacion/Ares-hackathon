import { useEffect, useState } from 'react';

interface Task {
  id: string;
  aircraft_icao24: string;
  aircraft_callsign: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  summary: string;
  description: string;
  ai_action?: string;
  pilot_message?: string;
  audio_file?: string;
  has_audio: boolean;
  fingerprint: string;
  created_at: string;
  last_seen: string;
  status: string;
}

export default function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/tasks');
        const data = await response.json();
        console.log('📋 Tasks received:', data.length);
        setTasks(data);
        setLoading(false);
      } catch (error) {
        console.error('❌ Error fetching tasks:', error);
        setLoading(false);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const resolveTask = async (taskId: string) => {
    try {
      await fetch(`http://localhost:8000/api/tasks/${taskId}/resolve`, {
        method: 'POST'
      });
      // Remove from UI
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error resolving task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'border-red-600 bg-red-900/30';
      case 'MEDIUM': return 'border-yellow-600 bg-yellow-900/30';
      case 'LOW': return 'border-blue-600 bg-blue-900/30';
      default: return 'border-gray-600 bg-gray-900/30';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '🔴';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🔵';
      default: return '⚪';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      SEPARATION: '✈️',
      ALTITUDE: '📏',
      SPEED: '⚡',
      HEADING: '🧭',
      WEATHER: '🌤️',
      CONFLICT: '⚠️',
      RUNWAY: '🛬',
      COMMUNICATION: '📻',
      OTHER: '📋'
    };
    return icons[category] || '📋';
  };

  const getTimeSince = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-6 h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-slate-400 text-sm">Loading tasks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-5 shadow-2xl h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📋 Active Tasks
              {tasks.length > 0 && (
                <span className="text-sm font-normal text-slate-400">
                  ({tasks.length})
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Actionable items from AI agents</p>
          </div>

          {/* Priority Summary */}
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1 bg-red-900/20 border border-red-800/50 rounded px-2 py-1">
              <span>🔴</span>
              <span className="text-red-400">{tasks.filter(t => t.priority === 'HIGH').length}</span>
            </div>
            <div className="flex items-center gap-1 bg-yellow-900/20 border border-yellow-800/50 rounded px-2 py-1">
              <span>🟡</span>
              <span className="text-yellow-400">{tasks.filter(t => t.priority === 'MEDIUM').length}</span>
            </div>
            <div className="flex items-center gap-1 bg-blue-900/20 border border-blue-800/50 rounded px-2 py-1">
              <span>🔵</span>
              <span className="text-blue-400">{tasks.filter(t => t.priority === 'LOW').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-slate-400 font-semibold">No active tasks</div>
            <div className="text-slate-500 text-sm mt-2">Tasks will appear when AI detects issues</div>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded-lg p-4 transition-all ${getPriorityColor(task.priority)} hover:shadow-lg`}
            >
              {/* Task Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{getPriorityIcon(task.priority)}</span>
                    <span className="text-xl">{getCategoryIcon(task.category)}</span>
                    <div>
                      <div className="font-bold text-white text-sm">
                        {task.aircraft_callsign}
                      </div>
                      <div className="text-xs text-slate-400">
                        {task.category} • {getTimeSince(task.last_seen)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Priority Badge */}
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  task.priority === 'HIGH' ? 'bg-red-600 text-white' :
                  task.priority === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                  'bg-blue-600 text-white'
                }`}>
                  {task.priority}
                </span>
              </div>

              {/* Summary */}
              <div className="text-white font-semibold mb-2 text-sm">
                {task.summary}
              </div>

              {/* Expandable Details */}
              {expandedTask === task.id ? (
                <div className="space-y-2 mb-3">
                  <div className="bg-slate-900/50 rounded p-3 text-xs text-slate-300">
                    <div className="font-semibold text-slate-200 mb-1">Description:</div>
                    {task.description}
                  </div>

                  {task.ai_action && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded p-3 text-xs">
                      <div className="font-semibold text-blue-300 mb-1">🤖 AI Action:</div>
                      <div className="text-blue-200">{task.ai_action}</div>
                    </div>
                  )}

                  {task.pilot_message && (
                    <div className="bg-purple-900/30 border border-purple-700 rounded p-3 text-xs">
                      <div className="font-semibold text-purple-300 mb-1">📻 Pilot Message:</div>
                      <div className="text-purple-200 font-mono">"{task.pilot_message}"</div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded text-xs font-semibold transition-all border border-slate-600"
                >
                  {expandedTask === task.id ? '▲ Less' : '▼ More'}
                </button>

                <button
                  onClick={() => resolveTask(task.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold transition-all shadow-lg"
                >
                  ✓ Resolve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
