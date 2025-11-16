import { useEffect, useState } from 'react';

interface WeatherForecast {
  hour: number;
  time: string;
  visibility_sm: number;
  wind_speed_kts: number;
  wind_direction_deg: number;
  phenomena: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export default function WeatherTimeline() {
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        // Generate mock 6-hour forecast (in production, this would come from API)
        const now = new Date();
        const mockForecast: WeatherForecast[] = [];

        for (let i = 0; i < 7; i++) {
          const time = new Date(now.getTime() + i * 60 * 60 * 1000);
          const hour = i;

          // Simulate degrading weather conditions
          const visibility = Math.max(1, 10 - i * 1.2);
          const windSpeed = 15 + i * 3;

          let risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
          const phenomena: string[] = [];

          if (visibility < 3) {
            risk_level = 'CRITICAL';
            phenomena.push('Heavy Rain', 'Low Visibility');
          } else if (visibility < 5) {
            risk_level = 'HIGH';
            phenomena.push('Rain', 'Reduced Visibility');
          } else if (visibility < 7) {
            risk_level = 'MEDIUM';
            phenomena.push('Light Rain');
          }

          if (windSpeed > 25) {
            phenomena.push('Strong Winds');
            if (risk_level === 'LOW') risk_level = 'MEDIUM';
          }

          mockForecast.push({
            hour,
            time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            visibility_sm: visibility,
            wind_speed_kts: windSpeed,
            wind_direction_deg: 270 + i * 10,
            phenomena,
            risk_level
          });
        }

        setForecast(mockForecast);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching weather forecast:', error);
        setLoading(false);
      }
    };

    fetchForecast();
    const interval = setInterval(fetchForecast, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-600 border-red-500';
      case 'HIGH': return 'bg-orange-600 border-orange-500';
      case 'MEDIUM': return 'bg-yellow-600 border-yellow-500';
      case 'LOW': return 'bg-green-600 border-green-500';
      default: return 'bg-gray-600 border-gray-500';
    }
  };

  const getRiskTextColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-400';
      case 'HIGH': return 'text-orange-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="text-slate-400 text-sm">Loading weather forecast...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-4 shadow-2xl">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">🌤️</span>
          6-Hour Weather Forecast
        </h3>
        <p className="text-xs text-slate-400 mt-1">Hourly conditions and risk assessment</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline connector */}
        <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-slate-700"></div>

        {/* Forecast items */}
        <div className="space-y-4">
          {forecast.map((item) => (
            <div key={item.hour} className="relative pl-12">
              {/* Timeline dot */}
              <div className={`absolute left-0 top-1 w-11 h-11 rounded-full border-4 ${getRiskColor(item.risk_level)} flex items-center justify-center text-xs font-bold text-white shadow-lg z-10`}>
                {item.hour === 0 ? 'NOW' : `+${item.hour}h`}
              </div>

              {/* Content card */}
              <div className={`bg-slate-800/50 rounded-lg p-3 border-l-4 ${getRiskColor(item.risk_level)} hover:bg-slate-800/70 transition-all`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-white text-sm">{item.time}</div>
                    <div className={`text-xs font-semibold ${getRiskTextColor(item.risk_level)}`}>
                      {item.risk_level} RISK
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Visibility</div>
                    <div className="text-sm font-bold text-cyan-400">{item.visibility_sm.toFixed(1)} SM</div>
                  </div>
                </div>

                {/* Weather details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/50 rounded px-2 py-1">
                    <div className="text-slate-400">Wind</div>
                    <div className="text-white font-mono">
                      {item.wind_direction_deg}° @ {Math.round(item.wind_speed_kts)}kts
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded px-2 py-1">
                    <div className="text-slate-400">Phenomena</div>
                    <div className="text-white font-semibold">
                      {item.phenomena.length > 0 ? item.phenomena.join(', ') : 'Clear'}
                    </div>
                  </div>
                </div>

                {/* Risk indicators */}
                {item.phenomena.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {item.phenomena.map((phenom, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-0.5 rounded ${getRiskColor(item.risk_level)} text-white font-semibold`}
                      >
                        {phenom}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
