import { useEffect, useState } from 'react';

interface WorkloadData {
  aircraft_count: number;
  active_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  low_alerts: number;
  workload_score: number;
  workload_level: string;
  capacity_percentage: number;
  projected_workload_15min: number;
  projected_workload_30min: number;
  workload_recommendations: string[];
}

export default function WorkloadMetrics() {
  const [workload, setWorkload] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkload = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/risk/workload');
        const data = await response.json();
        setWorkload(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch workload metrics:', error);
        setLoading(false);
      }
    };

    fetchWorkload();
    const interval = setInterval(fetchWorkload, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!workload) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600 font-bold animate-pulse';
      case 'HIGH': return 'text-orange-500 font-bold';
      case 'MODERATE': return 'text-yellow-500';
      case 'LOW': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
          <span className="text-lg"></span>
          PROFESSIONAL WORKLOAD METRICS
          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded">NEW</span>
        </h3>
      </div>

      {/* Workload Score Gauge */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-slate-400">Workload Score</span>
          <span className={`text-3xl font-bold ${getScoreColor(workload.workload_score)}`}>
            {workload.workload_score.toFixed(1)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all ${
              workload.workload_score >= 80 ? 'bg-red-500' :
              workload.workload_score >= 60 ? 'bg-orange-500' :
              workload.workload_score >= 40 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(workload.workload_score, 100)}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Status & Level */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-900/50 rounded p-2">
          <p className="text-xs text-slate-400 mb-1">Level</p>
          <p className={`text-lg font-bold ${getWorkloadColor(workload.workload_level)}`}>
            {workload.workload_level}
          </p>
        </div>

        <div className="bg-slate-900/50 rounded p-2">
          <p className="text-xs text-slate-400 mb-1">Capacity</p>
          <p className="text-lg font-bold text-blue-400">
            {workload.capacity_percentage.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Aircraft & Alerts */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-slate-800/50 rounded p-2">
          <span className="text-slate-400">Aircraft:</span>
          <span className="text-white font-bold ml-1">{workload.aircraft_count}</span>
        </div>
        <div className="bg-slate-800/50 rounded p-2">
          <span className="text-slate-400">Alerts:</span>
          <span className="text-white font-bold ml-1">{workload.active_alerts}</span>
        </div>
      </div>

      {/* Alert Breakdown */}
      {workload.active_alerts > 0 && (
        <div className="mb-3 text-xs space-y-1">
          {workload.critical_alerts > 0 && (
            <div className="flex justify-between bg-red-900/30 rounded px-2 py-1">
              <span className="text-red-300">Critical</span>
              <span className="text-red-200 font-bold">{workload.critical_alerts}</span>
            </div>
          )}
          {workload.high_alerts > 0 && (
            <div className="flex justify-between bg-orange-900/30 rounded px-2 py-1">
              <span className="text-orange-300">High</span>
              <span className="text-orange-200 font-bold">{workload.high_alerts}</span>
            </div>
          )}
          {workload.medium_alerts > 0 && (
            <div className="flex justify-between bg-yellow-900/30 rounded px-2 py-1">
              <span className="text-yellow-300">Medium</span>
              <span className="text-yellow-200 font-bold">{workload.medium_alerts}</span>
            </div>
          )}
        </div>
      )}

      {/* Projections */}
      <div className="border-t border-purple-500/20 pt-3 space-y-2">
        <p className="text-xs text-purple-300 font-semibold">Projections</p>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">15 min:</span>
          <span className={`font-bold ${getScoreColor(workload.projected_workload_15min)}`}>
            {workload.projected_workload_15min.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">30 min:</span>
          <span className={`font-bold ${getScoreColor(workload.projected_workload_30min)}`}>
            {workload.projected_workload_30min.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Recommendations */}
      {workload.workload_recommendations.length > 0 && (
        <div className="mt-3 bg-yellow-900/30 border border-yellow-600/30 rounded p-2">
          <p className="text-xs text-yellow-300 font-bold mb-1"> Recommendations</p>
          {workload.workload_recommendations.map((rec, idx) => (
            <p key={idx} className="text-xs text-yellow-200">{rec}</p>
          ))}
        </div>
      )}
    </div>
  );
}
