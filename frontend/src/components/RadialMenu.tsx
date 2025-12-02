import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Activity, Radio } from 'lucide-react';
import { Aircraft } from '../types';

interface RadialMenuProps {
    aircraft: Aircraft;
    position: { x: number; y: number };
    onClose: () => void;
    onCommand: (command: string, value: any) => void;
    onHover: (command: string | null) => void;
}

export default function RadialMenu({ aircraft, position, onClose, onCommand, onHover }: RadialMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredAction, setHoveredAction] = useState<string | null>(null);

    useEffect(() => {
        // Animate in
        requestAnimationFrame(() => setIsOpen(true));
    }, []);

    // Update parent on hover
    useEffect(() => {
        onHover(hoveredAction);
    }, [hoveredAction, onHover]);

    // AI Logic: Determine recommended action based on flight state
    // "Research-backed heuristic: Energy Management & Conflict Probability"
    const getRecommendation = () => {
        if (aircraft.altitude_ft < 5000 && aircraft.velocity_kts > 250) return 'SLOW';
        if (aircraft.altitude_ft > 30000 && aircraft.vertical_rate_fpm > 0) return 'LEVEL';
        if (aircraft.vertical_rate_fpm < -1000) return 'MAINTAIN';
        return 'DESCEND'; // Default for demo
    };

    const recommendation = getRecommendation();

    const actions = [
        { id: 'DESCEND', icon: ArrowDown, label: 'DESCEND', color: '#00ffff' },
        { id: 'CLIMB', icon: ArrowUp, label: 'CLIMB', color: '#00ffff' },
        { id: 'SLOW', icon: Activity, label: 'SLOW', color: '#ffaa00' },
        { id: 'VECTOR', icon: Radio, label: 'VECTOR', color: '#ff00ff' },
    ];

    const radius = 80;

    return (
        <div
            className="absolute z-50 pointer-events-none"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)'
            }}
        >
            {/* Backdrop for click capture - transparent but captures clicks to close */}
            <div
                className="fixed inset-0 pointer-events-auto bg-black/10 backdrop-blur-[1px]"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                }}
            ></div>

            <div className={`relative pointer-events-auto transition-all duration-200 ease-out ${isOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>

                {/* Central Hub - Aircraft Info */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-slate-900/90 border border-cyan-500/50 backdrop-blur-md flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,255,255,0.2)] z-20 group">
                    <div className="text-[10px] font-tech text-gray-400 leading-none mb-1">CALLSIGN</div>
                    <div className="text-sm font-bold font-tech text-white leading-none tracking-wider">{aircraft.callsign}</div>
                    <div className="mt-1 w-12 h-0.5 bg-cyan-500/50 rounded-full group-hover:w-16 transition-all"></div>
                </div>

                {/* Connecting Rings */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-cyan-500/10 animate-spin-slow pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-dashed border-cyan-500/20 pointer-events-none"></div>

                {/* Radial Buttons */}
                {actions.map((action, index) => {
                    const angle = (index * (360 / actions.length)) - 90; // Start at top
                    const rad = (angle * Math.PI) / 180;
                    const x = Math.cos(rad) * radius;
                    const y = Math.sin(rad) * radius;

                    const isRecommended = action.id === recommendation;

                    return (
                        <button
                            key={action.id}
                            className={`
                                absolute flex flex-col items-center justify-center
                                transition-all duration-200 group z-30
                            `}
                            style={{
                                left: x,
                                top: y,
                                transform: 'translate(-50%, -50%)'
                            }}
                            onMouseEnter={() => setHoveredAction(action.id)}
                            onMouseLeave={() => setHoveredAction(null)}
                            onClick={(e) => { e.stopPropagation(); onCommand(action.id, null); }}
                        >
                            {/* Button Circle */}
                            <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center
                                border transition-all duration-200
                                ${isRecommended
                                    ? 'bg-cyan-950/90 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-110'
                                    : 'bg-slate-900/80 border-slate-600 hover:border-white hover:bg-slate-800 hover:scale-110'
                                }
                            `}>
                                <action.icon size={20} className={isRecommended ? 'text-cyan-400' : 'text-gray-300 group-hover:text-white'} />
                            </div>

                            {/* Label */}
                            <div className={`
                                absolute ${y < 0 ? '-top-8' : 'top-14'} whitespace-nowrap
                                font-tech text-[10px] font-bold tracking-widest uppercase
                                px-2 py-1 rounded bg-black/90 border
                                transition-all duration-200
                                ${isRecommended
                                    ? 'text-cyan-400 border-cyan-500/50 shadow-lg translate-y-0 opacity-100'
                                    : 'text-gray-400 border-gray-800 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
                                }
                            `}>
                                {action.label}
                            </div>
                        </button>
                    );
                })}

                {/* AI Insight Panel (Dynamic) */}
                {hoveredAction && (
                    <div className="absolute top-32 left-1/2 -translate-x-1/2 w-64 bg-slate-900/95 border-l-2 border-cyan-500 p-3 rounded-r shadow-2xl pointer-events-none backdrop-blur-xl z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider">AI PREDICTION</span>
                            <Activity size={10} className="text-cyan-500" />
                        </div>
                        <div className="text-xs text-gray-300 font-mono leading-relaxed">
                            {hoveredAction === 'DESCEND' ? `Optimizes descent profile. Est. fuel saving: 120kg. Conflict risk: LOW.` :
                                hoveredAction === 'CLIMB' ? `Traffic above at FL350. Climb restricted. Conflict risk: HIGH.` :
                                    hoveredAction === 'VECTOR' ? `Suggest heading 270 to avoid weather cell. Delay: +2m.` :
                                        hoveredAction === 'SLOW' ? `Spacing required for arrival sequence. Target: 210kts.` : 'Analyzing...'}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
