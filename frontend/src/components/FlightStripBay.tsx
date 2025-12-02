import { useState, useEffect } from 'react';
import { Task } from '../types';
import { Clock, RefreshCw } from 'lucide-react';

export default function FlightStripBay() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/ai/actions');
                const data = await response.json();

                const formattedTasks: Task[] = (data.actions || []).map((action: any) => ({
                    id: action.id,
                    description: action.clearance, // Use clearance as main description
                    priority: action.priority,
                    status: action.status,
                    category: action.agent, // Use agent name as category
                    created_at: action.timestamp
                }));

                setTasks(formattedTasks);
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch tasks:', error);
                setLoading(false);
            }
        };

        fetchTasks();
        const interval = setInterval(fetchTasks, 2000);
        return () => clearInterval(interval);
    }, []);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'IMMEDIATE': return 'border-l-4 border-red-500 bg-red-950/20';
            case 'URGENT': return 'border-l-4 border-orange-500 bg-orange-950/20';
            default: return 'border-l-4 border-cyan-500 bg-cyan-950/10';
        }
    };

    return (
        <div className="absolute top-16 left-4 bottom-4 w-80 glass-panel rounded-lg flex flex-col z-40 pointer-events-auto">
            <div className="p-3 border-b border-cyan-900/30 flex justify-between items-center bg-black/40">
                <h2 className="font-tech text-cyan-400 text-sm tracking-wider uppercase flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Flight Strip Bay
                </h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-tech">{tasks.length} ACT</span>
                    <RefreshCw className={`w-3 h-3 text-cyan-600 ${loading ? 'animate-spin' : ''}`} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {tasks.length === 0 ? (
                    <div className="text-center py-10 text-gray-600 font-tech text-sm">
                        NO ACTIVE TASKS
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`relative p-3 rounded border border-cyan-900/20 transition-all hover:bg-cyan-900/20 group ${getPriorityColor(task.priority)}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-tech text-xs text-gray-400 uppercase tracking-wider">
                                    {task.category.replace('_', ' ')}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-tech ${task.status === 'TRANSMITTED' ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-400'
                                    }`}>
                                    {task.status}
                                </span>
                            </div>

                            <div className="font-tech text-sm text-gray-200 leading-tight mb-2">
                                {task.description}
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-600 font-tech">
                                    {new Date(task.created_at).toLocaleTimeString()}
                                </span>
                                {task.status !== 'TRANSMITTED' && (
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 text-[10px] px-2 py-1 rounded font-tech uppercase border border-cyan-700/50">
                                        Execute
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
