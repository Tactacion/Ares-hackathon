import { useState, useEffect } from 'react';
import { Task } from '../types';
import FlightStrip from './FlightStrip';

export default function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll for tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/ai/actions');
        if (response.ok) {
          const data = await response.json();
          // Transform actions into tasks for display
          const newTasks = data.actions.map((action: any, index: number) => ({
            id: `task-${index}-${Date.now()}`, // Generate unique ID
            description: `${action.aircraft_id} ${action.action} ${action.parameters?.value || ''}`,
            priority: action.type === 'COLLISION_AVOIDANCE' ? 'CRITICAL' : 'HIGH',
            status: 'PENDING',
            category: action.type === 'COLLISION_AVOIDANCE' ? 'CONFLICT' : 'TRAFFIC',
            created_at: new Date().toISOString()
          }));

          // Only update if we have new tasks (simple check)
          if (newTasks.length > 0) {
            setTasks(prev => {
              // Keep last 5 tasks, add new ones at top
              const combined = [...newTasks, ...prev].slice(0, 5);
              return combined;
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 flex flex-col h-96">
      <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
        <h2 className="text-lg font-bold text-cyan-400 tracking-wider flex items-center gap-2">
          <span className="text-xl">📑</span> FLIGHT STRIPS
        </h2>
        <span className="text-xs font-mono text-slate-400">PENDING: {tasks.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading && tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 animate-pulse font-mono">
            AWAITING FLIGHT DATA...
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono">
            NO ACTIVE STRIPS
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map(task => (
              <FlightStrip key={task.id} task={task} onResolve={handleResolve} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
