import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_CLIENT_SOCKET_URL;

export const useSocket = () => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Create socket connection
    const instance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    socketRef.current = instance;
    setSocket(instance);

    // Connection event handlers
    instance.on('connect', () => {
      console.log('✅ WebSocket connected:', instance.id);
    });

    instance.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    instance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      try {
        instance?.disconnect();
      } catch {
        // Swallow disconnect errors to avoid crashing unmount
      }
    };
  }, []);

  return socket;
};
