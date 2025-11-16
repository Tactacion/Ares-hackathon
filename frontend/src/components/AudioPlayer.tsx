import { useState, useEffect, useRef } from 'react';

interface Transmission {
  id: string;
  callsign: string;
  message: string;
  priority: string;
  urgency: string;
  frequency: number;
  transmitted_at: string;
  audio_duration_ms: number;
  has_audio: boolean;
  audio_size_bytes: number;
}

export default function AudioPlayer() {
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastPlayedIdRef = useRef<string | null>(null);

  // Fetch transmitted audio every 2 seconds
  useEffect(() => {
    const fetchTransmissions = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/voice/transmitted');
        const data = await response.json();

        console.log('🎤 Voice data received:', data.transmissions?.length || 0, 'transmissions');

        if (data.transmissions && data.transmissions.length > 0) {
          setTransmissions(data.transmissions);

          // Auto-play newest transmission if autoPlay is enabled
          if (autoPlay && data.transmissions[0]) {
            const newestId = data.transmissions[0].id;

            // Only play if it's a new transmission (different from last played)
            if (newestId !== lastPlayedIdRef.current) {
              playAudio(newestId);
              lastPlayedIdRef.current = newestId;
            }
          }
        }
      } catch (error) {
        console.error('❌ Error fetching transmissions:', error);
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
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setCurrentlyPlaying(null);
      });
    }
  };

  const handleAudioEnded = () => {
    setCurrentlyPlaying(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'IMMEDIATE': return 'text-red-500';
      case 'URGENT': return 'text-orange-500';
      case 'ROUTINE': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'IMMEDIATE': return '🔴';
      case 'URGENT': return '🟠';
      case 'ROUTINE': return '🟢';
      default: return '⚪';
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          📻 Voice Transmissions
          {currentlyPlaying && (
            <span className="text-green-400 text-sm animate-pulse">● LIVE</span>
          )}
        </h3>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
            className="rounded"
          />
          Auto-play
        </label>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        className="hidden"
      />

      {/* Currently Playing */}
      {currentlyPlaying && transmissions.find(t => t.id === currentlyPlaying) && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-400 font-bold">🔊 NOW PLAYING</span>
            <span className="text-green-400 text-sm animate-pulse">●</span>
          </div>
          <div className="text-white font-bold">
            {transmissions.find(t => t.id === currentlyPlaying)?.callsign}
          </div>
          <div className="text-gray-300 text-sm">
            {transmissions.find(t => t.id === currentlyPlaying)?.message}
          </div>
        </div>
      )}

      {/* Transmission History */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {transmissions.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No transmissions yet. Click "Test ElevenLabs" to generate audio.
          </div>
        ) : (
          transmissions.map((transmission) => (
            <div
              key={transmission.id}
              className={`p-3 rounded-lg border transition-all ${
                currentlyPlaying === transmission.id
                  ? 'bg-green-900/20 border-green-500'
                  : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getPriorityIcon(transmission.priority)}</span>
                    <span className={`font-bold ${getPriorityColor(transmission.priority)}`}>
                      [{transmission.priority}]
                    </span>
                    <span className="text-white font-bold">{transmission.callsign}</span>
                    <span className="text-gray-400 text-xs">
                      {formatTime(transmission.transmitted_at)}
                    </span>
                  </div>
                  <div className="text-gray-300 text-sm mb-1 truncate">
                    {transmission.message}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{transmission.frequency} MHz</span>
                    <span>•</span>
                    <span>{formatDuration(transmission.audio_duration_ms)}</span>
                    <span>•</span>
                    <span>{(transmission.audio_size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button
                  onClick={() => playAudio(transmission.id)}
                  disabled={currentlyPlaying === transmission.id}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    currentlyPlaying === transmission.id
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {currentlyPlaying === transmission.id ? '▶ Playing' : '▶ Play'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
