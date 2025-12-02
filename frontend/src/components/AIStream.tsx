import React, { useEffect, useState, useRef } from 'react';
import GlassPanel from './GlassPanel';

const THOUGHTS = [
    "Analyzing sector density...",
    "Optimizing separation vectors...",
    "Monitoring weather cells...",
    "Calculating fuel efficiency...",
    "Predicting conflict probability...",
    "Scanning for unauthorized drones...",
    "Syncing with NTSB database...",
    "Updating trajectory models...",
    "Verifying voice synthesis integrity...",
    "Checking pilot readbacks..."
];

export default function AIStream() {
    const [logs, setLogs] = useState<{ id: number, text: string, time: string }[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const thought = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
            const now = new Date();
            const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;

            setLogs(prev => {
                const newLogs = [...prev, { id: Date.now(), text: thought, time }];
                if (newLogs.length > 20) return newLogs.slice(newLogs.length - 20);
                return newLogs;
            });
        }, 800); // New thought every 800ms

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <GlassPanel title="CORTEX STREAM" className="h-48 w-full font-mono text-[10px]">
            <div ref={scrollRef} className="p-3 space-y-1 h-full overflow-y-auto scrollbar-hide">
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-cyan-500/80 hover:text-cyan-400 transition-colors cursor-default">
                        <span className="opacity-50 select-none">{log.time}</span>
                        <span className="text-cyan-300/90">
                            <span className="mr-2 opacity-50">{'>'}</span>
                            {log.text}
                        </span>
                    </div>
                ))}
                <div className="animate-pulse text-cyan-500">_</div>
            </div>
        </GlassPanel>
    );
}
