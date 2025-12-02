import React, { useState, useEffect } from 'react';
import { Shield, Map as MapIcon, Database } from 'lucide-react';
import { format } from 'date-fns';

interface HUDLayoutProps {
    children: React.ReactNode;
    connected: boolean;
    aircraftCount: number;
    workload: string;
    onViewChange: (view: 'map' | 'table') => void;
    currentView: 'map' | 'table';
}

export default function HUDLayout({
    children,
    connected,
    aircraftCount,
    workload,
    onViewChange,
    currentView
}: HUDLayoutProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black">
            {/* Background Layer (Map/Content) */}
            <div className="absolute inset-0 z-0">
                {children}
            </div>

            {/* CRT Overlay */}
            <div className="absolute inset-0 z-50 pointer-events-none scanlines opacity-20"></div>
            <div className="absolute inset-0 z-50 pointer-events-none" style={{
                background: 'radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.4) 100%)'
            }}></div>

            {/* Top Bar (HUD Header) */}
            <div className="absolute top-0 left-0 right-0 z-40 h-14 glass-panel border-b border-cyan-900/30 flex items-center justify-between px-6">

                {/* Left: Branding & System Status */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-cyan-400" />
                        <div>
                            <h1 className="font-tech text-xl text-cyan-400 tracking-[0.2em] leading-none">ARES</h1>
                            <div className="text-[10px] text-cyan-600 font-tech tracking-wider">AUTONOMOUS RISK EVALUATION SYSTEM</div>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-cyan-900/50"></div>

                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                        <span className="font-tech text-sm text-gray-400">{connected ? 'SYSTEM ONLINE' : 'CONNECTION LOST'}</span>
                    </div>
                </div>

                {/* Center: Metrics Ticker */}
                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-tech uppercase">Active Targets</span>
                        <span className="font-tech text-xl text-white">{aircraftCount}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-tech uppercase">Controller Load</span>
                        <span className={`font-tech text-xl ${workload === 'CRITICAL' ? 'text-red-500 animate-pulse' :
                            workload === 'HIGH' ? 'text-orange-500' : 'text-green-500'
                            }`}>{workload}</span>
                    </div>
                </div>

                {/* Right: Tools & Time */}
                <div className="flex items-center gap-6">
                    <div className="flex bg-black/40 rounded-lg p-1 border border-cyan-900/30">
                        <button
                            onClick={() => onViewChange('map')}
                            className={`p-2 rounded ${currentView === 'map' ? 'bg-cyan-900/50 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <MapIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onViewChange('table')}
                            className={`p-2 rounded ${currentView === 'table' ? 'bg-cyan-900/50 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Database className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="text-right">
                        <div className="font-tech text-xl text-white leading-none">
                            {format(time, 'HH:mm:ss')} <span className="text-xs text-cyan-500">Z</span>
                        </div>
                        <div className="font-tech text-xs text-gray-500">
                            {format(time, 'dd MMM yyyy').toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
