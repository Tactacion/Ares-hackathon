import React, { useState, useEffect } from 'react';

interface TacticalHeaderProps {
    onAnalyze: () => void;
    isAnalyzing: boolean;
    aircraftCount: number;
}

export default function TacticalHeader({ onAnalyze, isAnalyzing, aircraftCount }: TacticalHeaderProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="absolute top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-cyan-900/50 flex items-center justify-between px-6 z-50 shadow-[0_5px_20px_rgba(0,0,0,0.5)]">

            {/* Left: Branding & Clock */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_#00ffff]"></div>
                    <h1 className="text-2xl font-tech font-bold text-white tracking-[0.2em] text-shadow-cyan">
                        ARES <span className="text-cyan-500 text-sm font-normal tracking-normal opacity-80">v2.0</span>
                    </h1>
                </div>

                <div className="h-8 w-px bg-cyan-900/50"></div>

                <div className="font-mono text-cyan-400 text-sm">
                    {time.toLocaleTimeString('en-US', { hour12: false })} UTC
                </div>
            </div>

            {/* Center: Tactical Status */}
            <div className="flex items-center gap-8">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-cyan-600 uppercase tracking-widest">Sector Status</span>
                    <span className="text-cyan-400 font-tech tracking-widest">NOMINAL</span>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-cyan-600 uppercase tracking-widest">Traffic Volume</span>
                    <span className="text-white font-tech tracking-widest">{aircraftCount} AIRCRAFT</span>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onAnalyze}
                    disabled={isAnalyzing}
                    className={`
            relative px-6 py-2 bg-cyan-950/30 border border-cyan-500/50 
            text-cyan-400 font-tech text-sm tracking-widest uppercase
            hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white
            transition-all duration-300 group overflow-hidden
            ${isAnalyzing ? 'opacity-50 cursor-wait' : ''}
          `}
                >
                    <div className="absolute inset-0 bg-cyan-400/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative flex items-center gap-2">
                        {isAnalyzing ? (
                            <>
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                                ANALYZING SECTOR...
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                                AI SECTOR ANALYSIS
                            </>
                        )}
                    </span>
                </button>
            </div>
        </div>
    );
}
