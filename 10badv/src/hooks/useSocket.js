'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(userId) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      // 서버가 세션 쿠키로 사용자를 인증한다
      withCredentials: true,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current.emit('authenticate', { userId });
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', () => {
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId]);

  return {
    socket: socketRef.current,
    isConnected,
  };
}
