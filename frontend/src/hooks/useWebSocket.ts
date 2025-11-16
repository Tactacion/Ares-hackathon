import { useEffect, useState, useRef } from 'react';
import { SectorStatus, WebSocketMessage } from '../types';

const WS_URL = 'ws://localhost:8000/ws';

export const useWebSocket = () => {
  const [sectorStatus, setSectorStatus] = useState<SectorStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    console.log('🔌 Initializing WebSocket connection to:', WS_URL);

    const connect = () => {
      // Prevent multiple simultaneous connection attempts
      if (isConnectingRef.current) {
        console.log('⏳ Connection already in progress, skipping...');
        return;
      }

      // Close existing connection if any
      if (wsRef.current) {
        console.log('🧹 Cleaning up existing WebSocket connection');
        wsRef.current.close();
        wsRef.current = null;
      }

      isConnectingRef.current = true;
      setError(null);

      try {
        console.log(`🔄 Connecting to WebSocket (attempt ${reconnectAttempt + 1})...`);
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ WebSocket connected successfully!');
          setConnected(true);
          setError(null);
          setReconnectAttempt(0);
          isConnectingRef.current = false;
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);

            if (message.type === 'sector_update') {
              // Throttled logging - only log occasionally
              if (Math.random() < 0.05) { // 5% of messages
                console.log(`📨 Received sector update: ${message.data.aircraft_count} aircraft`);
              }
              setSectorStatus(message.data);
            }
          } catch (err) {
            console.error('❌ Error parsing WebSocket message:', err);
            console.error('Raw message:', event.data);
          }
        };

        ws.onerror = (event) => {
          console.error('❌ WebSocket error occurred:', event);
          const errorMsg = `WebSocket error (attempt ${reconnectAttempt + 1})`;
          console.error(errorMsg);
          setError(errorMsg);
          isConnectingRef.current = false;
        };

        ws.onclose = (event) => {
          console.log(`❌ WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
          setConnected(false);
          isConnectingRef.current = false;

          // Clean reconnect on normal closure
          if (event.code === 1000) {
            console.log('✅ WebSocket closed normally');
            return;
          }

          // Attempt to reconnect with exponential backoff
          const backoffTime = Math.min(3000 * Math.pow(1.5, reconnectAttempt), 30000);
          console.log(`🔄 Will attempt to reconnect in ${backoffTime}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connect();
          }, backoffTime);
        };

      } catch (err) {
        console.error('❌ Error creating WebSocket:', err);
        setError(`Failed to create WebSocket: ${err instanceof Error ? err.message : 'Unknown error'}`);
        isConnectingRef.current = false;

        // Retry after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
          connect();
        }, 5000);
      }
    };

    connect();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        // Close with normal closure code
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }

      isConnectingRef.current = false;
    };
  }, []); // Empty dependency array - only run once on mount

  return { sectorStatus, connected, error, reconnectAttempt };
};
