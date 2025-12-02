import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Mic } from 'lucide-react';

interface AgenticCommandBarProps {
    onCommand: (command: string) => void;
    isProcessing: boolean;
}

export default function AgenticCommandBar({ onCommand, isProcessing }: AgenticCommandBarProps) {
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut (Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onCommand(input);
            setInput('');
        }
    };

    return (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
            <div
                className={`
          relative overflow-hidden rounded-2xl transition-all duration-300 ease-out
          ${isFocused ? 'shadow-[0_0_40px_rgba(0,255,255,0.3)] scale-105' : 'shadow-2xl scale-100'}
          backdrop-blur-xl border border-white/10
        `}
                style={{
                    background: 'linear-gradient(135deg, rgba(10, 20, 30, 0.9) 0%, rgba(0, 10, 20, 0.95) 100%)',
                }}
            >
                {/* Glowing Border Effect */}
                <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isProcessing ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                </div>

                <form onSubmit={handleSubmit} className="relative flex items-center p-2">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl transition-colors ${isProcessing ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`}>
                        <Sparkles size={24} />
                    </div>

                    {/* Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Ask Ares to route traffic, clear conflicts, or analyze weather..."
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 text-lg px-4 font-tech tracking-wide"
                        disabled={isProcessing}
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-2 pr-2">
                        <button
                            type="button"
                            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                        >
                            <Mic size={20} />
                        </button>
                        <button
                            type="submit"
                            disabled={!input.trim() || isProcessing}
                            className={`
                p-2 rounded-lg transition-all duration-200
                ${input.trim() && !isProcessing
                                    ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                                    : 'bg-white/5 text-slate-600 cursor-not-allowed'}
              `}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>

                {/* Helper Text */}
                {isFocused && (
                    <div className="px-4 pb-2 text-xs text-slate-500 flex justify-between items-center font-tech">
                        <span>Try "Route heavy jets around the storm"</span>
                        <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">⌘K</span>
                    </div>
                )}
            </div>
        </div>
    );
}
