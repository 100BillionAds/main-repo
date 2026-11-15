const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const { decode } = require('next-auth/jwt');
require('dotenv').config({ path: '.env.local' });

// Render 등 플랫폼이 주는 공개 주소를 NextAuth 기본 주소로 사용한다 (직접 설정한 값이 우선).
if (!process.env.NEXTAUTH_URL) {
  const platformUrl = process.env.RENDER_EXTERNAL_URL
    || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');
  if (platformUrl) process.env.NEXTAUTH_URL = platformUrl;
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return value === true || value === 'true' || value === '1';
}

function buildSslConfig() {
  const sslEnabled = toBoolean(process.env.DATABASE_SSL, false);
  if (!sslEnabled) {
    return undefined;
  }

  const sslConfig = {
    rejectUnauthorized: toBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, true)
  };

  if (process.env.DATABASE_SSL_CA) {
    sslConfig.ca = process.env.DATABASE_SSL_CA;
  }

  return sslConfig;
}

function buildDatabaseConfig() {
  const ssl = buildSslConfig();

  const baseConfig = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };

  if (process.env.DATABASE_URL) {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const databaseNameFromUrl = (databaseUrl.pathname || '').replace(/^\/+/, '');

    const configFromUrl = {
      host: databaseUrl.hostname || process.env.DATABASE_HOST || 'localhost',
      port: parseInt(databaseUrl.port || process.env.DATABASE_PORT || '3306', 10),
      user: decodeURIComponent(databaseUrl.username || process.env.DATABASE_USER || 'root'),
      password: decodeURIComponent(databaseUrl.password || process.env.DATABASE_PASSWORD || ''),
      database: databaseNameFromUrl || process.env.DATABASE_NAME || '10badv'
    };

    if (ssl) {
      configFromUrl.ssl = ssl;
    }

    return {
      ...baseConfig,
      ...configFromUrl
    };
  }

  const configFromDiscreteEnv = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || '10badv'
  };

  if (ssl) {
    configFromDiscreteEnv.ssl = ssl;
  }

  return {
    ...baseConfig,
    ...configFromDiscreteEnv
  };
}

// MySQL 풀 설정 (db.js와 동일한 설정 — server.js는 CommonJS이므로 별도 풀 필요)
const dbPool = mysql.createPool(buildDatabaseConfig());

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
      origin: process.env.NEXT_PUBLIC_SOCKET_URL || (dev ? 'http://localhost:3000' : undefined),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // ---- Socket.io 인증 ----
  // 클라이언트가 보내는 userId 는 믿지 않는다. 핸드셰이크의 NextAuth 세션 쿠키(JWT)를
  // 서버에서 직접 검증해 얻은 사용자 ID만 사용한다.
  const SESSION_COOKIE_NAMES = ['__Secure-next-auth.session-token', 'next-auth.session-token'];

  function readSessionToken(cookieHeader) {
    if (!cookieHeader) return null;

    const cookies = {};
    for (const part of cookieHeader.split(';')) {
      const index = part.indexOf('=');
      if (index === -1) continue;
      cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    }

    for (const name of SESSION_COOKIE_NAMES) {
      if (cookies[name]) return cookies[name];
      // NextAuth 는 큰 쿠키를 name.0, name.1 … 로 나눠 저장한다.
      let chunked = '';
      for (let i = 0; cookies[`${name}.${i}`] !== undefined; i++) {
        chunked += cookies[`${name}.${i}`];
      }
      if (chunked) return chunked;
    }
    return null;
  }

  io.use(async (socket, nextMiddleware) => {
    try {
      const token = readSessionToken(socket.handshake.headers.cookie);
      const session = token
        ? await decode({ token, secret: process.env.NEXTAUTH_SECRET })
        : null;
      const userId = Number(session?.id);

      if (!Number.isSafeInteger(userId) || userId <= 0) {
        return nextMiddleware(new Error('unauthorized'));
      }

      socket.data.userId = userId;
      socket.data.username = session.username || session.name || '';
      return nextMiddleware();
    } catch (error) {
      return nextMiddleware(new Error('unauthorized'));
    }
  });

  const MESSAGE_TYPES = ['text', 'image', 'file'];
  const MAX_MESSAGE_LENGTH = 5000;

  function toRoomId(value) {
    const roomId = Number(value);
    return Number.isSafeInteger(roomId) && roomId > 0 ? roomId : null;
  }

  // 채팅방 참여자인지 DB 로 확인한 뒤에만 소켓 룸에 넣는다.
  async function joinRoomIfMember(socket, rawRoomId) {
    const roomId = toRoomId(rawRoomId);
    if (!roomId) return null;

    if (socket.rooms.has(`room:${roomId}`)) return roomId;

    const [rooms] = await dbPool.execute(
      'SELECT id FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [roomId, socket.data.userId, socket.data.userId]
    );
    if (rooms.length === 0) return null;

    socket.join(`room:${roomId}`);
    return roomId;
  }

  function joinedRoomId(socket, rawRoomId) {
    const roomId = toRoomId(rawRoomId);
    return roomId && socket.rooms.has(`room:${roomId}`) ? roomId : null;
  }

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    // 하위 호환: 기존 클라이언트는 연결 직후 authenticate 를 보낸다. 전달된 userId 는 무시한다.
    socket.on('authenticate', async (data) => {
      try {
        const roomId = await joinRoomIfMember(socket, data?.roomId);
        if (roomId) {
          socket.to(`room:${roomId}`).emit('user_joined', { userId });
        }
      } catch (error) {
        console.error('채팅방 입장 실패:', error);
      }
    });

    // 채팅방 입장
    socket.on('join_room', async (rawRoomId) => {
      try {
        const roomId = await joinRoomIfMember(socket, rawRoomId);
        if (!roomId) {
          socket.emit('message_error', { error: '채팅방에 접근할 수 없습니다.' });
        }
      } catch (error) {
        console.error('채팅방 입장 실패:', error);
      }
    });

    // 메시지 전송 (발신자는 항상 인증된 사용자)
    socket.on('send_message', async (data) => {
      const { message, fileUrl = null, fileName = null, fileSize = null } = data || {};
      const messageType = MESSAGE_TYPES.includes(data?.messageType) ? data.messageType : 'text';

      let connection;
      try {
        const roomId = await joinRoomIfMember(socket, data?.roomId);
        if (!roomId) {
          socket.emit('message_error', { error: '채팅방에 접근할 수 없습니다.' });
          return;
        }

        const text = typeof message === 'string' ? message.slice(0, MAX_MESSAGE_LENGTH) : '';
        if (messageType === 'text' && !text.trim()) {
          return;
        }

        connection = await dbPool.getConnection();

        // 메시지 DB에 저장 (파일 정보 포함)
        const [result] = await connection.execute(
          'INSERT INTO chat_messages (room_id, sender_id, message, message_type, file_url, file_name, file_size, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())',
          [
            roomId,
            userId,
            text,
            messageType,
            typeof fileUrl === 'string' ? fileUrl : null,
            typeof fileName === 'string' ? fileName.slice(0, 255) : null,
            Number.isSafeInteger(fileSize) ? fileSize : null,
          ]
        );

        const messageId = result.insertId;

        // 채팅방 마지막 메시지 업데이트
        const displayMessage = messageType === 'image' ? '📷 이미지' : (messageType === 'file' ? `📎 ${fileName || text}` : text);
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

        // 같은 방의 모든 사용자에게 메시지 전송
        io.to(`room:${roomId}`).emit('new_message', messages[0]);
      } catch (error) {
        console.error('메시지 저장 실패:', error);
        socket.emit('message_error', { error: '메시지 전송에 실패했습니다.' });
      } finally {
        if (connection) connection.release();
      }
    });

    // 타이핑 중 이벤트 (입장한 방에만)
    socket.on('typing', (data) => {
      const roomId = joinedRoomId(socket, data?.roomId);
      if (!roomId) return;
      socket.to(`room:${roomId}`).emit('user_typing', { userId, username: socket.data.username });
    });

    // 타이핑 중지 이벤트
    socket.on('stop_typing', (data) => {
      const roomId = joinedRoomId(socket, data?.roomId);
      if (!roomId) return;
      socket.to(`room:${roomId}`).emit('user_stop_typing', { userId });
    });

    // 메시지 읽음 처리
    socket.on('mark_as_read', async (data) => {
      try {
        const roomId = await joinRoomIfMember(socket, data?.roomId);
        if (!roomId) return;

        await dbPool.execute(
          'UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND sender_id != ? AND is_read = 0',
          [roomId, userId]
        );

        // 상대방에게 읽음 알림
        socket.to(`room:${roomId}`).emit('messages_read', { userId });
      } catch (error) {
        console.error('읽음 처리 실패:', error);
      }
    });
  });

  // ---- 에스크로 자동정산 스케줄러 ----
  // CRON_SECRET 이 설정된 경우에만 동작한다. 주기적으로 자기 자신의 정산 API 를 호출한다.
  // 인스턴스가 여러 개여도 정산은 행 잠금으로 한 번만 일어난다.
  function startSettlementScheduler() {
    const secret = process.env.CRON_SECRET;
    const minutes = Number(process.env.SETTLEMENT_INTERVAL_MINUTES || 10);

    if (!secret || !Number.isFinite(minutes) || minutes <= 0) {
      console.log('⏸  자동정산 스케줄러 비활성화 (CRON_SECRET 미설정 또는 주기 0)');
      return;
    }

    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/cron/settle`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${secret}` },
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error('자동정산 실패:', response.status, body.error || '');
        } else if (body.confirmed || body.cancelled || body.failed) {
          console.log(`💸 자동정산: 구매확정 ${body.confirmed}건, 자동취소 ${body.cancelled}건, 실패 ${body.failed}건`);
        }
      } catch (error) {
        console.error('자동정산 호출 오류:', error.message);
      } finally {
        running = false;
      }
    };

    setTimeout(run, 30 * 1000).unref();
    setInterval(run, minutes * 60 * 1000).unref();
    console.log(`⏱  자동정산 스케줄러 시작 (${minutes}분 주기)`);
  }

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log('🔌 Socket.io 서버 시작됨');
      startSettlementScheduler();
    });
});
