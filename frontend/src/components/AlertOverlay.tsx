import React, { useEffect, useState } from 'react';
import { AlertTriangle, XOctagon } from 'lucide-react';
import { RiskAlert } from '../types';

interface AlertOverlayProps {
    alert: RiskAlert | null;
}

export default function AlertOverlay({ alert }: AlertOverlayProps) {
    const [visible, setVisible] = useState(false);
    const [typedText, setTypedText] = useState('');

    useEffect(() => {
        if (alert && (alert.severity === 'CRITICAL' || alert.severity === 'HIGH')) {
            setVisible(true);
            setTypedText('');

            // Typewriter effect for description
            let i = 0;
            const text = alert.description;
            const timer = setInterval(() => {
                setTypedText(text.substring(0, i + 1));
                i++;
                if (i === text.length) clearInterval(timer);
            }, 30); // Speed of typing

            return () => clearInterval(timer);
        } else {
            setVisible(false);
        }
    }, [alert]);

    if (!visible || !alert) return null;

    const isCritical = alert.severity === 'CRITICAL';
    const colorClass = isCritical ? 'text-red-500 border-red-500 bg-red-950/90' : 'text-orange-500 border-orange-500 bg-orange-950/90';

    return (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
            {/* Full screen pulse effect */}
            <div className={`absolute inset-0 ${isCritical ? 'animate-pulse bg-red-900/20' : 'bg-orange-900/10'}`}></div>

            {/* Alert Box */}
            <div className={`
        relative max-w-2xl w-full mx-4 p-8 
        border-4 ${colorClass} 
        backdrop-blur-md rounded-lg 
        shadow-[0_0_50px_rgba(255,0,0,0.5)]
        transform transition-all duration-300 scale-100
      `}>
                {/* Header */}
                <div className="flex items-center gap-4 mb-6 border-b border-red-500/30 pb-4">
                    {isCritical ? <XOctagon className="w-12 h-12 text-red-500 animate-bounce" /> : <AlertTriangle className="w-12 h-12 text-orange-500" />}
                    <div>
                        <h2 className="text-4xl font-black font-tech tracking-widest text-white uppercase">
                            {isCritical ? 'CRITICAL ALERT' : 'WARNING'}
                        </h2>
                        <div className="text-xl font-mono text-red-300 tracking-wider">
                            {alert.risk_type.replace('_', ' ')} DETECTED
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {/* Main Description (Typewriter) */}
                    <div className="font-mono text-2xl text-white leading-relaxed min-h-[4rem]">
                        {typedText}<span className="animate-pulse">_</span>
                    </div>

                    {/* NTSB Match */}
                    {alert.ntsb_reference && (
                        <div className="bg-black/50 p-4 rounded border border-red-500/50">
                            <div className="text-xs text-red-400 font-tech uppercase mb-1">HISTORICAL PRECEDENT MATCH</div>
                            <div className="text-lg font-bold text-white">{alert.ntsb_reference.event_id}</div>
                            <div className="text-sm text-gray-300 italic">"{alert.ntsb_reference.description}"</div>
                        </div>
                    )}

                    {/* Action */}
                    <div className="flex items-center gap-4 mt-6">
                        <div className="flex-1 bg-red-600/20 border border-red-500 p-4 rounded text-center">
                            <div className="text-xs text-red-300 uppercase mb-1">RECOMMENDED ACTION</div>
                            <div className="text-xl font-bold text-white animate-pulse">{alert.recommended_action}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
