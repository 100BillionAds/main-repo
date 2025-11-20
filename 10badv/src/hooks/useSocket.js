'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(userId) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Socket.io 연결
    socketRef.current = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket 연결됨:', socketRef.current.id);
      setIsConnected(true);
      
      // 사용자 인증
      socketRef.current.emit('authenticate', { userId });
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket 연결 해제');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket 연결 오류:', error);
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
