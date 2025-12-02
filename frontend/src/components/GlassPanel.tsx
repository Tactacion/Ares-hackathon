import React from 'react';

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    variant?: 'dark' | 'light' | 'alert';
}

export default function GlassPanel({ children, className = '', title, variant = 'dark' }: GlassPanelProps) {
    const baseStyles = "relative overflow-hidden rounded-xl border backdrop-blur-xl transition-all duration-300";

    const variants = {
        dark: "bg-black/40 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]",
        light: "bg-white/5 border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]",
        alert: "bg-red-950/40 border-red-500/30 shadow-[0_0_30px_rgba(255,0,0,0.2)] animate-pulse-slow"
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`}>
            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Shine Effect */}
            <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-white/5 via-transparent to-transparent rotate-45 pointer-events-none"></div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col">
                {title && (
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <h3 className="font-tech text-xs tracking-[0.2em] text-cyan-400 uppercase">{title}</h3>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-cyan-500/50"></div>
                            <div className="w-1 h-1 rounded-full bg-cyan-500/30"></div>
                            <div className="w-1 h-1 rounded-full bg-cyan-500/10"></div>
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
