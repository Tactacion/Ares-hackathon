import React from 'react';
import { Aircraft } from '../types';

interface FlightDetailPanelProps {
    aircraft: Aircraft | null;
    onClose: () => void;
}

export default function FlightDetailPanel({ aircraft, onClose }: FlightDetailPanelProps) {
    if (!aircraft) return null;

    // Simulated NTSB Analysis (In a real app, this would come from the backend analysis)
    const riskLevel = aircraft.altitude_ft < 2000 && aircraft.vertical_rate_fpm < -1000 ? 'HIGH' : 'LOW';
    const ntsbMatch = riskLevel === 'HIGH' ? 'MATCH: CFIT Profile (NTSB-AAR-14-01)' : 'None';

    return (
        <div className="absolute top-4 right-4 w-96 glass-panel rounded-lg flex flex-col z-50 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-lg">
                <div>
                    <h2 className="text-xl font-bold font-mono text-white">{aircraft.callsign}</h2>
                    <div className="text-xs text-gray-400 font-mono">{aircraft.icao24.toUpperCase()}</div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto max-h-[80vh]">

                {/* Status Indicators */}
                <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2 rounded border ${riskLevel === 'HIGH' ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
                        <div className="text-xs text-gray-400 mb-1">RISK PROFILE</div>
                        <div className={`font-bold ${riskLevel === 'HIGH' ? 'text-red-400' : 'text-green-400'}`}>
                            {riskLevel}
                        </div>
                    </div>
                    <div className="p-2 rounded border border-gray-700 bg-gray-800/30">
                        <div className="text-xs text-gray-400 mb-1">PHASE</div>
                        <div className="font-bold text-blue-400">
                            {aircraft.on_ground ? 'GROUND' : aircraft.vertical_rate_fpm < -500 ? 'DESCENT' : aircraft.vertical_rate_fpm > 500 ? 'CLIMB' : 'CRUISE'}
                        </div>
                    </div>
                </div>

                {/* Telemetry Grid */}
                <div>
                    <h3 className="data-grid-header">Live Telemetry</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="data-label">ALTITUDE</div>
                            <div className="data-value text-xl">{Math.round(aircraft.altitude_ft).toLocaleString()} <span className="text-xs text-gray-500">ft</span></div>
                        </div>
                        <div>
                            <div className="data-label">GROUND SPEED</div>
                            <div className="data-value text-xl">{Math.round(aircraft.velocity_kts)} <span className="text-xs text-gray-500">kts</span></div>
                        </div>
                        <div>
                            <div className="data-label">VERTICAL RATE</div>
                            <div className={`data-value ${aircraft.vertical_rate_fpm < 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                                {aircraft.vertical_rate_fpm > 0 ? '+' : ''}{Math.round(aircraft.vertical_rate_fpm)} <span className="text-xs text-gray-500">fpm</span>
                            </div>
                        </div>
                        <div>
                            <div className="data-label">HEADING</div>
                            <div className="data-value">{Math.round(aircraft.heading_deg)}°</div>
                        </div>
                    </div>
                </div>

                {/* NTSB Analysis Section */}
                <div className="border-t border-gray-700 pt-4">
                    <h3 className="data-grid-header flex items-center gap-2">
                        <span className="text-amber-500">⚠️</span> Safety Analysis
                    </h3>
                    <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-400">NTSB DATABASE MATCH</span>
                            {riskLevel === 'HIGH' && <span className="text-xs bg-red-900 text-red-200 px-1 rounded animate-pulse">ALERT</span>}
                        </div>
                        <div className={`font-mono text-sm ${riskLevel === 'HIGH' ? 'text-red-300' : 'text-gray-500'}`}>
                            {ntsbMatch}
                        </div>
                        {riskLevel === 'HIGH' && (
                            <div className="mt-2 text-xs text-gray-400">
                                Simulated similarity to historical accident data. Monitor closely.
                            </div>
                        )}
                    </div>
                </div>

                {/* Aircraft Details */}
                <div className="border-t border-gray-700 pt-4">
                    <h3 className="data-grid-header">Aircraft Registry</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="data-label">TYPE</span>
                            <span className="data-value text-sm">{getAircraftType(aircraft)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="data-label">OPERATOR</span>
                            <span className="data-value text-sm">{getOperator(aircraft.callsign)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="data-label">ESTIMATED ROUTE</span>
                            <span className="data-value text-sm">KDEN → {getDestination(aircraft.heading_deg)}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// Helper functions for dynamic data
function getAircraftType(ac: Aircraft): string {
    if (ac.velocity_kts < 160 && ac.altitude_ft < 15000) return 'C172 (Cessna Skyhawk)';
    if (ac.velocity_kts > 400 && ac.altitude_ft > 30000) return 'B748 (Boeing 747-8)';
    return 'B738 (Boeing 737-800)';
}

function getOperator(callsign: string): string {
    if (callsign.startsWith('UAL')) return 'United Airlines';
    if (callsign.startsWith('AAL')) return 'American Airlines';
    if (callsign.startsWith('DAL')) return 'Delta Air Lines';
    if (callsign.startsWith('SWA')) return 'Southwest Airlines';
    if (callsign.startsWith('BAW')) return 'British Airways';
    if (callsign.startsWith('N')) return 'Private Owner';
    return 'Unknown Operator';
}

function getDestination(heading: number): string {
    if (heading > 315 || heading <= 45) return 'KORD (Chicago)'; // North
    if (heading > 45 && heading <= 135) return 'KJFK (New York)'; // East
    if (heading > 135 && heading <= 225) return 'KDFW (Dallas)'; // South
    return 'KLAX (Los Angeles)'; // West
}
