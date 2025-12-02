
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, X, Activity, Brain, Plane, Clock, Wind, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SectorAnalysisReportProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
}

export default function SectorAnalysisReport({ isOpen, onClose, data }: SectorAnalysisReportProps) {

    // Animation Variants
    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    const boxVariants = {
        hidden: { scale: 0.95, opacity: 0, y: 20 },
        visible: {
            scale: 1,
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30,
                delay: 0.1
            }
        },
        exit: { scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.2 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: (i: number) => ({
            opacity: 1,
            x: 0,
            transition: { delay: 0.2 + (i * 0.1) }
        })
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={overlayVariants}
                    onClick={onClose}
                >
                    <motion.div
                        className="relative w-[900px] max-h-[85vh] overflow-hidden bg-slate-900/90 border border-cyan-500/30 rounded-xl shadow-[0_0_60px_rgba(6,182,212,0.2)] flex flex-col"
                        variants={boxVariants}
                        onClick={(e) => e.stopPropagation()}
                    >

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-black/40 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                    <Brain className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-tech font-bold text-white tracking-[0.2em] leading-none">NEURAL SECTOR AUDIT</h2>
                                    <div className="flex items-center gap-3 text-[10px] text-cyan-400/60 font-mono mt-1">
                                        <span className="flex items-center gap-1"><Activity size={10} /> LIVE ANALYSIS</span>
                                        <span>•</span>
                                        <span>GEMINI-PRO-VISION</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded transition-colors group"
                            >
                                <X className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* Main Content Grid */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-12 gap-6">

                            {/* LEFT COLUMN: Timeline & Status (4 cols) */}
                            <div className="col-span-4 space-y-6">

                                {/* Executive Summary Card */}
                                <motion.div
                                    custom={0}
                                    variants={itemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="p-4 rounded bg-cyan-950/20 border border-cyan-500/20"
                                >
                                    <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Summary
                                    </h3>
                                    <p className="text-xs text-cyan-100/80 font-mono leading-relaxed">
                                        {data?.summary || "Analyzing sector telemetry..."}
                                    </p>
                                </motion.div>

                                {/* Conflict Timeline Visualization */}
                                <motion.div
                                    custom={1}
                                    variants={itemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="p-4 rounded bg-black/40 border border-gray-800"
                                >
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> Predicted Timeline
                                    </h3>

                                    <div className="relative h-48 border-l border-gray-700 ml-2 space-y-6">
                                        {/* Timeline Item 1 */}
                                        <div className="relative pl-6">
                                            <div className="absolute -left-1 top-1 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                            <span className="text-[10px] text-emerald-500 font-mono absolute -left-12 top-0">NOW</span>
                                            <div className="text-xs text-gray-300 font-tech">Sector Nominal</div>
                                            <div className="text-[10px] text-gray-600 font-mono">Traffic volume stable</div>
                                        </div>

                                        {/* Timeline Item 2 (Warning) */}
                                        {data?.warnings?.length > 0 && (
                                            <div className="relative pl-6">
                                                <div className="absolute -left-1 top-1 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                                <span className="text-[10px] text-amber-500 font-mono absolute -left-12 top-0">+2m</span>
                                                <div className="text-xs text-amber-200 font-tech">Potential Convergence</div>
                                                <div className="text-[10px] text-gray-500 font-mono">UAL442 / DAL889</div>
                                            </div>
                                        )}

                                        {/* Timeline Item 3 (Future) */}
                                        <div className="relative pl-6">
                                            <div className="absolute -left-1 top-1 w-2 h-2 rounded-full bg-cyan-500/50"></div>
                                            <span className="text-[10px] text-cyan-700 font-mono absolute -left-12 top-0">+15m</span>
                                            <div className="text-xs text-gray-500 font-tech">Shift Change</div>
                                        </div>
                                    </div>
                                </motion.div>

                            </div>

                            {/* RIGHT COLUMN: Actionable Insights (8 cols) */}
                            <div className="col-span-8 space-y-6">

                                {/* Critical Alerts Section */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                                        <AlertTriangle className="w-3 h-3" /> Critical Anomalies
                                    </h3>

                                    {data?.warnings?.length > 0 ? (
                                        data.warnings.map((warning: string, i: number) => (
                                            <motion.div
                                                key={i}
                                                custom={i + 2}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                className="flex items-start gap-4 p-3 rounded bg-red-950/10 border border-red-500/20 hover:bg-red-950/20 transition-colors group"
                                            >
                                                <div className="p-2 bg-red-500/10 rounded text-red-400 group-hover:text-red-200 group-hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all">
                                                    <Plane className="w-4 h-4 rotate-45" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-red-200 font-tech tracking-wide">{warning}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono">SEPARATION</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-gray-500 font-mono">FL320</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500 font-mono italic p-2">No critical anomalies detected.</div>
                                    )}
                                </div>

                                {/* Recommended Fixes Section */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                        <Radio className="w-3 h-3" /> Tactical Recommendations
                                    </h3>

                                    {data?.fixes?.length > 0 ? (
                                        data.fixes.map((fix: string, i: number) => (
                                            <motion.div
                                                key={i}
                                                custom={i + 4}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                className="flex items-center justify-between p-3 rounded bg-cyan-950/10 border border-cyan-500/20 hover:border-cyan-400/40 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-mono text-xs border border-cyan-500/20">
                                                        {i + 1}
                                                    </div>
                                                    <p className="text-sm text-cyan-100/90 font-tech tracking-wide">{fix}</p>
                                                </div>
                                                <button className="px-4 py-1.5 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500 hover:text-black transition-all font-tech font-bold tracking-wider shadow-[0_0_10px_transparent] hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                                                    EXECUTE
                                                </button>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500 font-mono italic p-2">No tactical actions required.</div>
                                    )}
                                </div>

                                {/* System Status (Compact) */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                                    <div className="p-3 rounded bg-emerald-950/10 border border-emerald-500/10 flex items-center gap-3">
                                        <Shield className="w-4 h-4 text-emerald-500" />
                                        <div>
                                            <div className="text-[10px] text-emerald-700 uppercase font-bold">System Integrity</div>
                                            <div className="text-xs text-emerald-400 font-mono">100% OPERATIONAL</div>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded bg-blue-950/10 border border-blue-500/10 flex items-center gap-3">
                                        <Wind className="w-4 h-4 text-blue-500" />
                                        <div>
                                            <div className="text-[10px] text-blue-700 uppercase font-bold">Weather Radar</div>
                                            <div className="text-xs text-blue-400 font-mono">CLEAR 50NM</div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-cyan-500/20 bg-black/40 flex justify-between items-center shrink-0">
                            <div className="text-[10px] text-gray-600 font-mono">
                                SESSION ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={onClose} className="px-4 py-2 text-xs font-tech text-gray-500 hover:text-white transition-colors">
                                    DISMISS REPORT
                                </button>
                                <button className="px-6 py-2 bg-cyan-500 text-black text-xs font-bold font-tech rounded hover:bg-cyan-400 transition-colors shadow-[0_0_20px_rgba(6,182,212,0.3)] tracking-wider">
                                    EXPORT LOGS
                                </button>
                            </div>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

