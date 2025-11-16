import { useEffect, useState } from 'react';

interface ConflictPrediction {
  timepoint: 'NOW' | '5min' | '10min' | '15min';
  minutes: number;
  aircraft_pairs: Array<{
    callsign1: string;
    callsign2: string;
    predicted_separation_nm: number;
    risk_level: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  }>;
  total_conflicts: number;
}

export default function ConflictTimeline() {
  const [predictions, setPredictions] = useState<ConflictPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        // Generate mock conflict predictions (in production, this would come from API)
        const mockPredictions: ConflictPrediction[] = [
          {
            timepoint: 'NOW',
            minutes: 0,
            aircraft_pairs: [],
            total_conflicts: 0
          },
          {
            timepoint: '5min',
            minutes: 5,
            aircraft_pairs: [
              {
                callsign1: 'UAL456',
                callsign2: 'DAL789',
                predicted_separation_nm: 4.2,
                risk_level: 'CAUTION'
              }
            ],
            total_conflicts: 1
          },
          {
            timepoint: '10min',
            minutes: 10,
            aircraft_pairs: [
              {
                callsign1: 'UAL456',
                callsign2: 'DAL789',
                predicted_separation_nm: 2.8,
                risk_level: 'WARNING'
              },
              {
                callsign1: 'SWA123',
                callsign2: 'AAL987',
                predicted_separation_nm: 4.5,
                risk_level: 'CAUTION'
              }
            ],
            total_conflicts: 2
          },
          {
            timepoint: '15min',
            minutes: 15,
            aircraft_pairs: [
              {
                callsign1: 'UAL456',
                callsign2: 'DAL789',
                predicted_separation_nm: 1.9,
                risk_level: 'CRITICAL'
              }
            ],
            total_conflicts: 1
          }
        ];

        setPredictions(mockPredictions);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching conflict predictions:', error);
        setLoading(false);
      }
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-600 border-red-500';
      case 'WARNING': return 'bg-orange-600 border-orange-500';
      case 'CAUTION': return 'bg-yellow-600 border-yellow-500';
      case 'SAFE': return 'bg-green-600 border-green-500';
      default: return 'bg-gray-600 border-gray-500';
    }
  };

  const getTimepointColor = (conflicts: number) => {
    if (conflicts === 0) return 'bg-green-600 border-green-500';
    if (conflicts === 1) return 'bg-yellow-600 border-yellow-500';
    if (conflicts === 2) return 'bg-orange-600 border-orange-500';
    return 'bg-red-600 border-red-500';
  };

  const getWorstRisk = (pairs: ConflictPrediction['aircraft_pairs']): string => {
    if (pairs.length === 0) return 'SAFE';
    const risks = pairs.map(p => p.risk_level);
    if (risks.includes('CRITICAL')) return 'CRITICAL';
    if (risks.includes('WARNING')) return 'WARNING';
    if (risks.includes('CAUTION')) return 'CAUTION';
    return 'SAFE';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="text-slate-400 text-sm">Loading conflict predictions...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-4 shadow-2xl">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          Conflict Timeline Predictor
        </h3>
        <p className="text-xs text-slate-400 mt-1">Predicted separation conflicts over next 15 minutes</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline connector */}
        <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-slate-700"></div>

        {/* Prediction items */}
        <div className="space-y-4">
          {predictions.map((pred) => {
            const worstRisk = getWorstRisk(pred.aircraft_pairs);
            const hasConflicts = pred.total_conflicts > 0;

            return (
              <div key={pred.timepoint} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1 w-11 h-11 rounded-full border-4 ${getTimepointColor(pred.total_conflicts)} flex items-center justify-center text-xs font-bold text-white shadow-lg z-10`}>
                  {pred.timepoint === 'NOW' ? 'NOW' : `+${pred.minutes}m`}
                </div>

                {/* Content card */}
                <div className={`bg-slate-800/50 rounded-lg p-3 border-l-4 ${getTimepointColor(pred.total_conflicts)} hover:bg-slate-800/70 transition-all`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-white text-sm">
                        {pred.timepoint}
                        {pred.timepoint !== 'NOW' && <span className="text-slate-400 ml-1 font-normal">(+{pred.minutes} min)</span>}
                      </div>
                      {hasConflicts ? (
                        <div className="text-xs font-semibold text-orange-400">
                          {pred.total_conflicts} CONFLICT{pred.total_conflicts > 1 ? 'S' : ''} PREDICTED
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-green-400">
                          NO CONFLICTS
                        </div>
                      )}
                    </div>
                    {hasConflicts && (
                      <div className={`px-2 py-1 rounded text-xs font-bold ${getRiskColor(worstRisk)} text-white`}>
                        {worstRisk}
                      </div>
                    )}
                  </div>

                  {/* Conflict details */}
                  {pred.aircraft_pairs.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {pred.aircraft_pairs.map((pair, idx) => (
                        <div key={idx} className={`bg-slate-900/50 rounded p-2 border-l-2 ${getRiskColor(pair.risk_level)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-cyan-400 font-mono font-bold text-xs">{pair.callsign1}</span>
                              <span className="text-slate-500">↔</span>
                              <span className="text-cyan-400 font-mono font-bold text-xs">{pair.callsign2}</span>
                            </div>
                            <div className={`text-xs font-bold ${
                              pair.predicted_separation_nm < 3 ? 'text-red-400' :
                              pair.predicted_separation_nm < 5 ? 'text-orange-400' :
                              'text-yellow-400'
                            }`}>
                              {pair.predicted_separation_nm.toFixed(1)} nm
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400">Risk:</span>
                            <span className={`font-semibold ${
                              pair.risk_level === 'CRITICAL' ? 'text-red-400' :
                              pair.risk_level === 'WARNING' ? 'text-orange-400' :
                              pair.risk_level === 'CAUTION' ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {pair.risk_level}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Safe status */}
                  {pred.total_conflicts === 0 && (
                    <div className="text-center py-2 text-green-400 text-xs">
                      ✓ All aircraft safely separated
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>Total predicted conflicts:</span>
            <span className="font-bold text-white">
              {predictions.reduce((sum, p) => sum + p.total_conflicts, 0)}
            </span>
          </div>
          <div className="mt-1 text-slate-500">
            Predictions updated every 10 seconds
          </div>
        </div>
      </div>
    </div>
  );
}
