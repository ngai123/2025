import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_CLIENT_SOCKET_URL;

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Validate SOCKET_URL before connecting
    if (!SOCKET_URL) {
      console.error('❌ VITE_CLIENT_SOCKET_URL is not defined in .env file');
      return;
    }

    console.log('🔌 Initializing WebSocket connection to:', SOCKET_URL);

    // Create single socket connection
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
      setIsConnected(true);
    });

    instance.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    instance.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
    });

    instance.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      try {
        instance?.disconnect();
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context.socket;
};

// Hook to check connection status
export const useSocketStatus = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketStatus must be used within a SocketProvider');
  }
  return context.isConnected;
};
