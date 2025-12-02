import React, { useEffect, useState, useRef } from 'react';

interface LogEntry {
    id: string;
    timestamp: string;
    content: string;
    type: 'thought' | 'risk' | 'solution' | 'system';
}

export default function NeuralStream() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // WebSocket Connection
    useEffect(() => {
        const connect = () => {
            const ws = new WebSocket('ws://localhost:8000/ws/cortex');

            ws.onopen = () => {
                setConnected(true);
                addLog('SYSTEM', 'CORTEX UPLINK ESTABLISHED');
            };

            ws.onclose = () => {
                setConnected(false);
                addLog('SYSTEM', 'CORTEX UPLINK LOST - RETRYING...');
                setTimeout(connect, 3000);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'thought') {
                        addLog('thought', data.content);
                    } else if (data.type === 'risk') {
                        addLog('risk', data.content);
                    } else if (data.type === 'solution') {
                        addLog('solution', 'TACTICAL SOLUTION COMPUTED');
                        // Dispatch solution to MapView
                        window.dispatchEvent(new CustomEvent('CORTEX_SOLUTION', { detail: data.data }));
                    } else if (data.type === 'error') {
                        addLog('system', `ERROR: ${data.content}`);
                    }
                } catch (e) {
                    console.error("Failed to parse cortex message", e);
                }
            };

            socketRef.current = ws;
        };

        connect();

        return () => {
            socketRef.current?.close();
        };
    }, []);

    // Listen for Trigger Event
    useEffect(() => {
        const handleTrigger = () => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                addLog('system', 'INITIATING TACTICAL SCAN...');
                socketRef.current.send(JSON.stringify({ action: "INITIATE_SCAN" }));
            } else {
                addLog('system', 'CANNOT SCAN - CORTEX OFFLINE');
            }
        };

        window.addEventListener('TRIGGER_TACTICAL_ANALYSIS', handleTrigger);
        return () => window.removeEventListener('TRIGGER_TACTICAL_ANALYSIS', handleTrigger);
    }, []);

    const addLog = (type: LogEntry['type'], content: string) => {
        setLogs(prev => [...prev.slice(-50), { // Keep last 50 logs
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            content,
            type
        }]);
    };

    return (
        <div className="w-full h-full bg-black/90 border-l border-cyan-900/50 font-mono text-xs p-4 flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 border-b border-cyan-900/30 pb-2">
                <span className="text-cyan-500 font-bold tracking-widest">NEURAL STREAM</span>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            </div>

            {/* Logs */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                {logs.map(log => (
                    <div key={log.id} className={`
            flex gap-2 animate-fade-in
            ${log.type === 'thought' ? 'text-cyan-300/80' : ''}
            ${log.type === 'risk' ? 'text-orange-500 font-bold' : ''}
            ${log.type === 'solution' ? 'text-green-400 font-bold' : ''}
            ${log.type === 'system' ? 'text-gray-500 italic' : ''}
          `}>
                        <span className="text-cyan-900 shrink-0">[{log.timestamp}]</span>
                        <span className="break-words">
                            {log.type === 'thought' && '> '}
                            {log.content}
                        </span>
                    </div>
                ))}
                <div className="h-4"></div> {/* Spacer */}
            </div>

            {/* Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
        </div>
    );
}
