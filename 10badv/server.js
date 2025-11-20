const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// MySQL 연결 설정
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv'
};

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket.io 연결 관리
  const userSockets = new Map(); // userId -> socketId 매핑

  io.on('connection', (socket) => {
    console.log('✅ 소켓 연결:', socket.id);

    // 사용자 인증 및 룸 조인
    socket.on('authenticate', async (data) => {
      const { userId, roomId } = data;
      
      if (userId) {
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        console.log(`👤 사용자 ${userId} 인증 완료`);
      }

      if (roomId) {
        socket.join(`room:${roomId}`);
        console.log(`🚪 사용자 ${userId}가 방 ${roomId}에 입장`);
        
        // 다른 사용자에게 입장 알림
        socket.to(`room:${roomId}`).emit('user_joined', { userId });
      }
    });

    // 채팅방 입장
    socket.on('join_room', (roomId) => {
      socket.join(`room:${roomId}`);
      console.log(`🚪 소켓 ${socket.id}가 방 ${roomId}에 입장`);
    });

    // 메시지 전송
    socket.on('send_message', async (data) => {
      const { roomId, senderId, message, messageType = 'text', fileUrl = null, fileName = null, fileSize = null } = data;
      
      try {
        const connection = await mysql.createConnection(dbConfig);
        
        // 채팅방 정보 조회 (거래 ID 포함)
        const [rooms] = await connection.execute(
          'SELECT transaction_id, user1_id, user2_id FROM chat_rooms WHERE id = ?',
          [roomId]
        );
        
        // 메시지 DB에 저장 (파일 정보 포함)
        const [result] = await connection.execute(
          'INSERT INTO chat_messages (room_id, sender_id, message, message_type, file_url, file_name, file_size, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())',
          [roomId, senderId, message, messageType, fileUrl, fileName, fileSize]
        );

        const messageId = result.insertId;

        // 채팅방 마지막 메시지 업데이트
        const displayMessage = messageType === 'image' ? '📷 이미지' : (messageType === 'file' ? `📎 ${fileName || message}` : message);
        await connection.execute(
          'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW() WHERE id = ?',
          [displayMessage, roomId]
        );

        // 보낸 메시지 정보 조회
        const [messages] = await connection.execute(`
          SELECT 
            cm.id,
            cm.sender_id,
            cm.message,
            cm.message_type,
            cm.file_url,
            cm.file_name,
            cm.file_size,
            cm.created_at,
            u.username as sender_name
          FROM chat_messages cm
          LEFT JOIN users u ON cm.sender_id = u.id
          WHERE cm.id = ?
        `, [messageId]);

        await connection.end();

        // 같은 방의 모든 사용자에게 메시지 전송
        io.to(`room:${roomId}`).emit('new_message', messages[0]);
        
        console.log(`💬 메시지 전송 (방 ${roomId}, 타입: ${messageType}):`, message.substring(0, 50));
      } catch (error) {
        console.error('메시지 저장 실패:', error);
        socket.emit('message_error', { error: '메시지 전송에 실패했습니다.' });
      }
    });

    // 타이핑 중 이벤트
    socket.on('typing', (data) => {
      const { roomId, userId, username } = data;
      socket.to(`room:${roomId}`).emit('user_typing', { userId, username });
    });

    // 타이핑 중지 이벤트
    socket.on('stop_typing', (data) => {
      const { roomId, userId } = data;
      socket.to(`room:${roomId}`).emit('user_stop_typing', { userId });
    });

    // 메시지 읽음 처리
    socket.on('mark_as_read', async (data) => {
      const { roomId, userId } = data;
      
      try {
        const connection = await mysql.createConnection(dbConfig);
        
        await connection.execute(
          'UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND sender_id != ? AND is_read = 0',
          [roomId, userId]
        );
        
        await connection.end();
        
        // 상대방에게 읽음 알림
        socket.to(`room:${roomId}`).emit('messages_read', { userId });
      } catch (error) {
        console.error('읽음 처리 실패:', error);
      }
    });

    // 연결 해제
    socket.on('disconnect', () => {
      console.log('❌ 소켓 연결 해제:', socket.id);
      
      if (socket.userId) {
        userSockets.delete(socket.userId);
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log('🔌 Socket.io 서버 시작됨');
    });
});
