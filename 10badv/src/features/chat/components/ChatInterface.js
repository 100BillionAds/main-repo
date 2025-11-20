'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import styles from './ChatInterface.module.css';

export default function ChatInterface() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket(session?.user?.id);
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 채팅방 목록 불러오기
  useEffect(() => {
    if (session) {
      fetchChatRooms();
    }
  }, [session]);

  // URL 파라미터로 특정 채팅방 열기
  useEffect(() => {
    const roomId = searchParams.get('room');
    if (roomId && chatRooms.length > 0) {
      const room = chatRooms.find(r => r.id === parseInt(roomId));
      if (room) {
        setSelectedRoom(room);
      }
    }
  }, [searchParams, chatRooms]);

  // 선택된 채팅방의 메시지 불러오기
  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
      
      // Socket.io 방 입장
      if (socket && isConnected) {
        socket.emit('join_room', selectedRoom.id);
        socket.emit('mark_as_read', {
          roomId: selectedRoom.id,
          userId: session?.user?.id
        });
      }
    }
  }, [selectedRoom, socket, isConnected]);

  // Socket.io 이벤트 리스너
  useEffect(() => {
    if (!socket || !isConnected || !selectedRoom) return;

    // 새 메시지 수신
    const handleNewMessage = (message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
      
      // 읽음 처리
      if (message.sender_id !== session?.user?.id) {
        socket.emit('mark_as_read', {
          roomId: selectedRoom.id,
          userId: session?.user?.id
        });
      }
    };

    // 타이핑 중 표시
    const handleUserTyping = (data) => {
      if (data.userId !== session?.user?.id) {
        setIsTyping(true);
        setTypingUser(data.username);
      }
    };

    // 타이핑 중지
    const handleUserStopTyping = (data) => {
      if (data.userId !== session?.user?.id) {
        setIsTyping(false);
        setTypingUser(null);
      }
    };

    // 거래 상태 변경 알림
    const handleTransactionStatusChanged = (data) => {
      if (data.transactionId === selectedRoom.transaction_id) {
        // 채팅방 목록과 선택된 방 업데이트
        setSelectedRoom(prev => ({
          ...prev,
          transaction_status: data.status
        }));
        fetchChatRooms(); // 목록 새로고침
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('transaction_status_changed', handleTransactionStatusChanged);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('transaction_status_changed', handleTransactionStatusChanged);
    };
  }, [socket, isConnected, selectedRoom, session]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chat/rooms');
      const data = await response.json();
      
      if (data.success) {
        setChatRooms(data.rooms);
      }
    } catch (error) {
      console.error('채팅방 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('메시지 조회 실패:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !socket || !isConnected) return;

    const messageText = newMessage;
    setNewMessage('');
    
    // 타이핑 중지 알림
    socket.emit('stop_typing', {
      roomId: selectedRoom.id,
      userId: session.user.id
    });

    // Socket.io로 메시지 전송
    socket.emit('send_message', {
      roomId: selectedRoom.id,
      senderId: session.user.id,
      message: messageText
    });
  };

  // 타이핑 이벤트 처리
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!socket || !isConnected || !selectedRoom) return;
    
    // 타이핑 중 알림
    socket.emit('typing', {
      roomId: selectedRoom.id,
      userId: session.user.id,
      username: session.user.username
    });
    
    // 타이핑 중지 타이머
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        roomId: selectedRoom.id,
        userId: session.user.id
      });
    }, 1000);
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', selectedRoom.id);

      // 파일 업로드
      const uploadRes = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (uploadData.success) {
        // 업로드된 파일 정보로 메시지 전송
        const messageType = file.type.startsWith('image/') ? 'image' : 'file';
        
        if (socket && isConnected) {
          socket.emit('send_message', {
            roomId: selectedRoom.id,
            senderId: session.user.id,
            message: file.name,
            messageType,
            fileUrl: uploadData.fileUrl,
            fileName: uploadData.fileName,
            fileSize: uploadData.fileSize
          });
        }
      } else {
        alert(uploadData.error || '파일 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    
    if (!confirm('이 대화방을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/chat/rooms/${selectedRoom.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('대화방이 삭제되었습니다.');
        setSelectedRoom(null);
        fetchChatRooms();
      } else {
        alert(data.error || '대화방 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('대화방 삭제 실패:', error);
      alert('대화방 삭제 중 오류가 발생했습니다.');
    }
  };

  // 디자이너: 디자인 완료 (in_progress -> awaiting_confirmation)
  const handleCompleteDesign = async () => {
    if (!selectedRoom?.transaction_id) return;
    
    if (!confirm('디자인 작업이 완료되었나요? 광고주에게 최종 확인을 요청합니다.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/transactions/${selectedRoom.transaction_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'awaiting_confirmation' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('광고주에게 최종 확인을 요청했습니다.');
        // 상태 업데이트는 소켓 이벤트로 처리됨
      } else {
        alert(data.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 광고주: 최종 거래 완료 (awaiting_confirmation -> completed)
  const handleFinalComplete = async () => {
    if (!selectedRoom?.transaction_id) return;
    
    if (!confirm('작업물을 확인하셨나요? 거래를 최종 완료하고 정산을 진행합니다.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/transactions/${selectedRoom.transaction_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('거래가 완료되었습니다! 디자이너에게 포인트가 지급되었습니다.');
        // 상태 업데이트는 소켓 이벤트로 처리됨
      } else {
        alert(data.error || '거래 완료에 실패했습니다.');
      }
    } catch (error) {
      console.error('거래 완료 실패:', error);
      alert('거래 완료 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>채팅 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.chatWrapper}>
        {/* 채팅방 목록 */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>💬 채팅</h2>
            <Link href="/dashboard" className={styles.backButton}>
              ← 대시보드
            </Link>
          </div>

          <div className={styles.roomList}>
            {chatRooms.length === 0 ? (
              <div className={styles.emptyState}>
                <p>아직 채팅방이 없습니다</p>
                <p className={styles.emptyStateHint}>포트폴리오에서 문의하기를 눌러보세요</p>
              </div>
            ) : (
              chatRooms.map((room) => (
                <div
                  key={room.id}
                  className={`${styles.roomItem} ${selectedRoom?.id === room.id ? styles.roomItemActive : ''}`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className={styles.roomAvatar}>
                    👤
                  </div>
                  <div className={styles.roomInfo}>
                    <div className={styles.roomNameWrapper}>
                      <div className={styles.roomName}>{room.other_user_name}</div>
                      {room.other_is_buyer && (
                        <span className={styles.buyerBadge}>✓ 구매자</span>
                      )}
                      {room.i_am_buyer && (
                        <span className={styles.sellerBadge}>✓ 내가 구매</span>
                      )}
                    </div>
                    <div className={styles.roomLastMessage}>{room.last_message || '메시지 없음'}</div>
                    {room.unread_count > 0 && (
                      <span className={styles.unreadBadge}>{room.unread_count}</span>
                    )}
                  </div>
                  <div className={styles.roomMeta}>
                    <div className={styles.roomTime}>
                      {room.last_message_time ? new Date(room.last_message_time).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 채팅 영역 */}
        <div className={styles.chatArea}>
          {selectedRoom ? (
            <>
              {/* 채팅방 헤더 */}
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderInfo}>
                  <div className={styles.chatRoomNameWrapper}>
                    <h3 className={styles.chatRoomName}>{selectedRoom.other_user_name}</h3>
                    {selectedRoom.other_is_buyer && (
                      <span className={styles.buyerBadgeHeader}>✓ 구매자</span>
                    )}
                    {selectedRoom.i_am_buyer && (
                      <span className={styles.myBuyerBadgeHeader}>✓ 내가 구매</span>
                    )}
                  </div>
                  <p className={styles.chatRoomStatus}>
                    {selectedRoom.portfolio_title && `📋 ${selectedRoom.portfolio_title}`}
                  </p>
                  {selectedRoom.transaction_id && selectedRoom.transaction_status && (
                    <div className={styles.transactionStatus}>
                      <span className={`${styles.statusBadge} ${styles[`status_${selectedRoom.transaction_status}`]}`}>
                        {selectedRoom.transaction_status === 'pending' && '⏳ 결제대기'}
                        {selectedRoom.transaction_status === 'in_progress' && '🔨 진행중'}
                        {selectedRoom.transaction_status === 'awaiting_confirmation' && '⏰ 완료대기'}
                        {selectedRoom.transaction_status === 'completed' && '✅ 거래완료'}
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.headerActions}>
                  {/* 디자이너: 진행중일 때 완료 버튼 */}
                  {selectedRoom.transaction_id && 
                   selectedRoom.transaction_designer_id === session?.user?.id &&
                   selectedRoom.transaction_status === 'in_progress' && (
                    <button 
                      onClick={handleCompleteDesign}
                      className={styles.actionButton}
                      style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                    >
                      🎨 디자인 완료
                    </button>
                  )}
                  {/* 광고주: 완료대기일 때 최종 완료 버튼 */}
                  {selectedRoom.transaction_id && 
                   selectedRoom.transaction_buyer_id === session?.user?.id &&
                   selectedRoom.transaction_status === 'awaiting_confirmation' && (
                    <button 
                      onClick={handleFinalComplete}
                      className={styles.actionButton}
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      ✅ 최종 거래 완료
                    </button>
                  )}
                  <button 
                    onClick={handleDeleteRoom}
                    className={styles.deleteRoomButton}
                    title="대화방 삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* 메시지 영역 */}
              <div className={styles.messagesArea}>
                {messages.length === 0 ? (
                  <div className={styles.emptyMessages}>
                    <p>메시지가 없습니다</p>
                    <p className={styles.emptyMessagesHint}>첫 메시지를 보내보세요!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === session?.user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`${styles.message} ${isMe ? styles.messageMe : styles.messageOther}`}
                        >
                          <div className={styles.messageContent}>
                            <div className={styles.messageBubble}>
                              {msg.message_type === 'image' && msg.file_url ? (
                                <div className={styles.messageImage}>
                                  <img src={msg.file_url} alt="전송된 이미지" />
                                </div>
                              ) : msg.message_type === 'file' && msg.file_url ? (
                                (() => {
                                  const fileExt = msg.file_url.split('.').pop()?.toLowerCase();
                                  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
                                  const isImage = imageExtensions.includes(fileExt);
                                  
                                  if (isImage) {
                                    return (
                                      <div className={styles.messageImage}>
                                        <img src={msg.file_url} alt="이미지" />
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={styles.messageFile}>
                                        📎 {msg.file_name || msg.message}
                                      </a>
                                    );
                                  }
                                })()
                              ) : (
                                <p>{msg.message}</p>
                              )}
                            </div>
                            <div className={styles.messageTime}>
                              {new Date(msg.created_at).toLocaleString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isTyping && typingUser && (
                      <div className={styles.typingIndicator}>
                        <span>{typingUser}님이 입력 중</span>
                        <span className={styles.typingDots}>
                          <span>.</span><span>.</span><span>.</span>
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 입력 영역 */}
              <form onSubmit={handleSendMessage} className={styles.inputArea}>
                {!isConnected && (
                  <div className={styles.connectionStatus}>
                    연결 중...
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className={styles.fileInput}
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.attachButton}
                  disabled={uploading || !isConnected}
                  title="파일 첨부"
                >
                  {uploading ? '⏳' : '📎'}
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="메시지를 입력하세요..."
                  className={styles.messageInput}
                  disabled={!isConnected || uploading}
                />
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={!newMessage.trim() || !isConnected || uploading}
                >
                  보내기
                </button>
              </form>
            </>
          ) : (
            <div className={styles.emptyChatArea}>
              <div className={styles.emptyChatContent}>
                <span className={styles.emptyChatIcon}>💬</span>
                <p className={styles.emptyChatTitle}>채팅방을 선택해주세요</p>
                <p className={styles.emptyChatDescription}>
                  왼쪽 목록에서 대화를 시작할 채팅방을 선택하세요
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
