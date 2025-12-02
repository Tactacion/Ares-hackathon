import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Activity, Radio, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Transmission {
    id: string;
    callsign: string;
    message: string;
    priority: string;
    transmitted_at: string;
}

export default function CommsConsole() {
    const [transmissions, setTransmissions] = useState<Transmission[]>([]);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
    const [autoPlay, setAutoPlay] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);
    const lastPlayedIdRef = useRef<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    // Visualizer Loop
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            // Draw Center Line (always visible but faint)
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)'; // Cyan-500 with low opacity
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();

            // Draw Waveform
            ctx.beginPath();
            ctx.strokeStyle = currentlyPlaying ? '#22d3ee' : 'rgba(34, 211, 238, 0.2)'; // Cyan-400
            ctx.lineWidth = 2;
            ctx.shadowBlur = currentlyPlaying ? 8 : 0;
            ctx.shadowColor = '#22d3ee';

            const time = Date.now() / 50;

            for (let x = 0; x < width; x++) {
                const amplitude = currentlyPlaying ? height / 3 : height / 12; // Smaller amplitude when idle

                // Complex waveform simulation
                // If idle, use a slower, gentler wave
                const frequency = currentlyPlaying ? 0.05 : 0.02;
                const speed = currentlyPlaying ? time : time * 0.5;

                const y = height / 2 +
                    Math.sin(x * frequency + speed) * amplitude * (currentlyPlaying ? Math.random() * 0.8 + 0.2 : 1) +
                    Math.cos(x * (frequency * 2) - speed) * (amplitude / 3);

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [currentlyPlaying]);

    // Fetch transmitted audio
    useEffect(() => {
        const fetchTransmissions = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/voice/transmitted');
                const data = await response.json();

                if (data.transmissions && data.transmissions.length > 0) {
                    setTransmissions(data.transmissions);

                    if (autoPlay && data.transmissions[0]) {
                        const newestId = data.transmissions[0].id;
                        if (newestId !== lastPlayedIdRef.current) {
                            playAudio(newestId);
                            lastPlayedIdRef.current = newestId;
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching transmissions:', error);
            }
        };

        fetchTransmissions();
        const interval = setInterval(fetchTransmissions, 2000);
        return () => clearInterval(interval);
    }, [autoPlay]);

    const playAudio = (id: string) => {
        setCurrentlyPlaying(id);
        if (audioRef.current) {
            audioRef.current.src = `http://localhost:8000/api/voice/transmitted/${id}`;
            audioRef.current.play().catch(err => {
                console.warn("Audio playback failed (likely no audio source), simulating playback UI", err);
                // Even if playback fails, we keep the UI in "playing" state for a moment
                setTimeout(() => setCurrentlyPlaying(null), 3000);
            });
        }
    };

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[680px] h-28 z-40 pointer-events-auto perspective-1000">
            <div className="relative w-full h-full bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex items-center ring-1 ring-white/5">

                {/* Glass Reflection Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                {/* Left: Controls & Status */}
                <div className="w-20 h-full border-r border-white/10 flex flex-col items-center justify-center gap-3 bg-black/20 z-10">
                    <button
                        onClick={() => setAutoPlay(!autoPlay)}
                        className={`p-3 rounded-xl transition-all duration-300 ${autoPlay
                                ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                                : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700/50'
                            }`}
                        title={autoPlay ? "Mute Incoming" : "Enable Auto-Play"}
                    >
                        {autoPlay ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>

                    <div className={`flex flex-col items-center gap-1 transition-opacity duration-500 ${currentlyPlaying ? 'opacity-100' : 'opacity-30'}`}>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-[9px] font-bold text-green-500 tracking-wider">RX</span>
                    </div>
                </div>

                {/* Center: Visualizer */}
                <div className="flex-1 h-full relative bg-black/40 z-10 group">
                    {/* Frequency Badge */}
                    <div className="absolute top-3 left-4 flex items-center gap-2 px-2 py-1 rounded bg-cyan-950/30 border border-cyan-900/50 backdrop-blur-sm">
                        <Radio className="w-3 h-3 text-cyan-400" />
                        <span className="font-mono text-xs text-cyan-400 tracking-widest font-bold">118.500</span>
                    </div>

                    {/* Signal Strength */}
                    <div className="absolute top-3 right-4 flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-cyan-600" />
                        <span className="font-mono text-[10px] text-cyan-700">SIGNAL: 100%</span>
                    </div>

                    <canvas ref={canvasRef} width={400} height={112} className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Active TX Indicator */}
                    <AnimatePresence>
                        {currentlyPlaying && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-3 right-4 flex items-center gap-2"
                            >
                                <span className="font-mono text-[10px] font-bold text-cyan-400 tracking-widest">RECEIVING TRANSMISSION</span>
                                <Activity className="w-3 h-3 text-cyan-400 animate-bounce" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: Message Display */}
                <div className="w-64 h-full border-l border-white/10 bg-gradient-to-b from-slate-900/50 to-black/40 p-4 flex flex-col justify-center z-10 relative overflow-hidden">
                    <AnimatePresence mode='wait'>
                        {transmissions.length > 0 ? (
                            <motion.div
                                key={transmissions[0].id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="flex flex-col gap-1"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-sm font-bold text-white bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                        {transmissions[0].callsign}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500">
                                        {new Date(transmissions[0].transmitted_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="font-mono text-xs text-cyan-100/90 leading-relaxed line-clamp-3 relative">
                                    <span className="absolute -left-2 top-0 text-cyan-700 text-lg leading-none">"</span>
                                    {transmissions[0].message}
                                    <span className="text-cyan-700 text-lg leading-none ml-1">"</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center gap-2 text-slate-600"
                            >
                                <div className="w-12 h-0.5 bg-slate-800 rounded-full animate-pulse"></div>
                                <span className="font-mono text-[10px] tracking-[0.2em] uppercase">Awaiting Traffic</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <audio ref={audioRef} onEnded={() => setCurrentlyPlaying(null)} className="hidden" />
            </div>
        </div>
    );
}
