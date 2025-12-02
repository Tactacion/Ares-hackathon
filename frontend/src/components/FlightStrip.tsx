import React from 'react';
import { Task } from '../types';

interface FlightStripProps {
    task: Task;
    onResolve: (taskId: string) => void;
}

export default function FlightStrip({ task, onResolve }: FlightStripProps) {
    // Extract callsign and type from task description if possible, or use defaults
    const callsign = task.description.split(' ')[0] || 'UNK';
    const type = task.category === 'CONFLICT' ? 'CNFL' : task.category === 'WEATHER' ? 'WX' : 'TFC';

    // Determine strip color based on priority
    const stripColor = task.priority === 'CRITICAL' ? 'bg-red-900/40 border-red-500' :
        task.priority === 'HIGH' ? 'bg-amber-900/40 border-amber-500' :
            'bg-cyan-900/20 border-cyan-500';

    const textColor = task.priority === 'CRITICAL' ? 'text-red-100' :
        task.priority === 'HIGH' ? 'text-amber-100' :
            'text-cyan-100';

    return (
        <div className={`relative flex border-l-4 ${stripColor} bg-slate-900/80 mb-2 font-mono text-sm shadow-lg overflow-hidden group`}>
            {/* Left Section: Aircraft ID & Type */}
            <div className="w-16 border-r border-slate-700 p-2 flex flex-col justify-center items-center bg-black/20">
                <span className={`text-lg font-bold ${textColor}`}>{callsign}</span>
                <span className="text-xs text-slate-500">{type}</span>
            </div>

            {/* Middle Section: Route/Instruction */}
            <div className="flex-1 p-2 flex flex-col justify-center border-r border-slate-700 relative">
                <div className="text-xs text-slate-400 mb-1">INSTRUCTION</div>
                <div className={`font-bold ${textColor} leading-tight`}>
                    {task.description.replace(callsign, '').trim()}
                </div>

                {/* Scanline effect for this strip */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none opacity-20"></div>
            </div>

            {/* Right Section: Status & Actions */}
            <div className="w-24 flex flex-col">
                <div className="flex-1 flex items-center justify-center border-b border-slate-700 bg-black/20">
                    <span className={`text-xs font-bold ${task.status === 'PENDING' ? 'text-yellow-500 animate-pulse' : 'text-green-500'
                        }`}>
                        {task.status}
                    </span>
                </div>
                <button
                    onClick={() => onResolve(task.id)}
                    className="flex-1 bg-slate-800 hover:bg-cyan-700 transition-colors flex items-center justify-center text-xs text-cyan-300 hover:text-white uppercase tracking-wider font-bold"
                >
                    EXECUTE
                </button>
            </div>
        </div>
    );
}
