import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../api'
import { io as ioClient } from 'socket.io-client'
import EmojiPicker from 'emoji-picker-react'

export default function Chat(){
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const socketRef = useRef(null)
  const messagesRef = useRef(null)
  const emojiPickerRef = useRef(null)

  useEffect(()=>{
    if (!token) return
    
    let mounted = true
    let socket = null
    
    // Load data immediately
    Promise.all([
      api.getGroupMessages(token, groupId),
      api.getGroupDetails(token, groupId)
    ]).then(([msgs, groupData]) => {
      if (!mounted) return
      setMessages(msgs)
      setGroup(groupData)
      setMembers(groupData.members || [])
      setLoading(false)
    }).catch(err=>{
      console.error('Load error:', err)
      setLoading(false)
    })

    console.log('Connecting to socket with token:', token ? 'present' : 'missing')
    
    socket = ioClient(import.meta.env.VITE_API_BASE || 'http://localhost:3000', {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: true
    })

    socket.on('connect', ()=>{
      console.log('✅ Socket connected:', socket.id)
      console.log('🔔 Joining group:', groupId)
      socket.emit('join_group', { groupId })
    })

    socket.on('user_joined_group', (data)=>{
      console.log('👤 User joined group:', data)
    })

    socket.on('new_message', (msg)=>{
      console.log('📨 NEW MESSAGE RECEIVED:', msg)
      console.log('Message ID:', msg.id)
      console.log('From user:', msg.user_id, msg.username)
      
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) {
          console.log('⚠️ Duplicate message, skipping')
          return prev
        }
        console.log('✅ Adding message to state')
        return [...prev, msg]
      })
    })

    socket.on('message_updated', (msg)=>{
      console.log('✏️ Message updated:', msg)
      setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
    })

    socket.on('user_online', (data)=>{
      console.log('🟢 User online:', data.username)
      setMembers(prev => prev.map(m => m.id === data.userId ? { ...m, is_online: true } : m))
    })

    socket.on('user_disconnected', (data)=>{
      console.log('⚫ User offline:', data.username)
      setMembers(prev => prev.map(m => m.id === data.userId ? { ...m, is_online: false } : m))
    })

    socket.on('message_deleted', (data)=>{
      console.log('🗑️ Message deleted:', data)
      setMessages(prev => prev.filter(m => m.id !== data.messageId))
    })

    socket.on('error', (error)=>{
      console.error('❌ Socket error:', error)
    })

    socket.on('disconnect', (reason)=>{
      console.log('🔌 Socket disconnected:', reason)
    })

    socket.on('connect_error', (error)=>{
      console.error('❌ Connection error:', error)
    })

    socket.io.on('reconnect', (attempt) => {
      console.log('🔄 Reconnected after', attempt, 'attempts')
      socket.emit('join_group', { groupId })
    })

    socketRef.current = socket

    return ()=>{
      mounted = false
      if (socket && socket.connected) {
        console.log('👋 Leaving group and disconnecting')
        socket.emit('leave_group', { groupId })
        socket.disconnect()
      }
    }
  }, [token, groupId])

  useEffect(()=>{
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    function handleClickOutside(e) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleEmojiClick(e) {
    setText(prev => prev + e.emoji)
    setShowEmojiPicker(false)
  }

  async function send(){
    if (!text.trim()) return
    
    const messageText = text
    setText('')
    
    try{
      const sentMessage = await api.sendMessage(token, groupId, { 
        content: messageText, 
        isAnonymous: false 
      })
      
      console.log('Message sent successfully:', sentMessage)
    }catch(err){
      console.error('Send message error:', err)
      setText(messageText)
      alert('Failed to send message')
    }
  }

  function handleKeyPress(e){
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function getLastSeen(lastSeenDate) {
    if (!lastSeenDate) return 'Never'
    const now = new Date()
    const lastSeen = new Date(lastSeenDate)
    const diffMs = now - lastSeen
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="chat-page">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading chat...</p>
        </div>
        <style jsx>{`
          .chat-page {
            min-height: calc(100vh - 70px);
            background: #f5f7fb;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading-screen {
            text-align: center;
            color: #667eea;
          }
          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #e5e7eb;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <div className="chat-layout">
        {/* Mobile Header */}
        <div className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setShowSidebar(!showSidebar)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{members.length} members</span>
          </button>
          <div className="mobile-group-info">
            <h3>{group?.name || 'Group'}</h3>
          </div>
        </div>

        {/* Sidebar */}
        <aside className={`sidebar-wrapper ${showSidebar ? 'show' : ''}`}>
          <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}></div>
          <div className="sidebar-panel">
            <div className="panel-header">
              <div className="header-left">
                <div className="group-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="group-title">{group?.name || 'Group'}</h3>
                  <div className="group-status">
                    <span className="status-dot"></span>
                    <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              <button className="members-link-btn" onClick={() => navigate(`/group/${groupId}/members`)} title="Manage members">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4.35418C12.7329 3.52375 13.8053 3 15 3C17.2091 3 19 4.79086 19 7C19 9.20914 17.2091 11 15 11C13.8053 11 12.7329 10.4762 12 9.64582M15 21H3V20C3 16.6863 5.68629 14 9 14C12.3137 14 15 16.6863 15 20V21ZM15 21H21V20C21 16.6863 18.3137 14 15 14C13.9071 14 12.8825 14.2922 12 14.8027M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="mobile-close-btn" onClick={() => setShowSidebar(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="panel-content">
              <div className="members-section">
                <div className="section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Members ({members.length})
                </div>
                {members.length === 0 ? (
                  <div className="empty-members">
                    <p>No members yet</p>
                  </div>
                ) : (
                  <div className="members-mini-list">
                    {members.map(m => (
                      <div key={m.id} className="member-mini">
                        <div className="member-avatar-wrapper">
                          <div className="mini-avatar">{(m.display_name || m.username || 'U').charAt(0).toUpperCase()}</div>
                          <div className={`status-indicator ${m.is_online ? 'online' : 'offline'}`}></div>
                        </div>
                        <div className="mini-info">
                          <div className="mini-name">{m.display_name || m.username}</div>
                          <div className={`mini-status ${m.is_online ? 'online' : 'offline'}`}>
                            {m.is_online ? (
                              <span className="status-text online">● Online</span>
                            ) : (
                              <span className="status-text offline">● Last seen {getLastSeen(m.last_seen)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Chat Main */}
        <section className="chat-main-wrapper">
          <div className="chat-main">
            <div className="chat-header">
              <div className="header-content">
                <div className="header-title">
                  <h2>💬 {group?.name || 'Group Messages'}</h2>
                  <span className="header-subtitle">Chat with your team members</span>
                </div>
                <div className="header-badge">{messages.length}</div>
              </div>
            </div>

            <div ref={messagesRef} className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p>No messages yet</p>
                  <span>Start the conversation!</span>
                </div>
              ) : (
                messages.map((m, idx)=> {
                  const isOwn = m.user_id === user?.id
                  const showAvatar = idx === 0 || messages[idx-1]?.user_id !== m.user_id
                  
                  return (
                    <div key={m.id} className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
                      {!isOwn && showAvatar && (
                        <div className="message-avatar">
                          {(m.is_anonymous ? 'A' : (m.display_name || m.username || 'U').charAt(0).toUpperCase())}
                        </div>
                      )}
                      {!isOwn && !showAvatar && <div className="message-avatar-spacer"></div>}
                      
                      <div className="message-bubble">
                        {showAvatar && (
                          <div className="message-sender">
                            {m.is_anonymous ? '🎭 Anonymous' : m.display_name || m.username}
                          </div>
                        )}
                        <div className="message-content">{m.content}</div>
                        <div className="message-time">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="input-container">
              <div className="input-wrapper">
                <div className="emoji-picker-container" ref={emojiPickerRef}>
                  <button 
                    className="icon-button" 
                    title="Add emoji"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    😊
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker-popup">
                      <EmojiPicker 
                        onEmojiClick={handleEmojiClick}
                        theme="light"
                        width={300}
                        height={400}
                      />
                    </div>
                  )}
                </div>
                <input 
                  className="message-input" 
                  value={text} 
                  onChange={e=>setText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..." 
                />
                <button className="send-button" onClick={send} disabled={!text.trim()}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M18.3332 1.66675L9.1665 10.8334M18.3332 1.66675L12.4998 18.3334L9.1665 10.8334M18.3332 1.66675L1.6665 7.50008L9.1665 10.8334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .chat-page {
          background: #f5f7fb;
          min-height: 100vh;
          padding-bottom: 60px;
        }

        .chat-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 24px;
          max-width: 1600px;
          margin: 0 auto;
          padding: 24px;
          max-height: calc(100vh - 94px);
          position: relative;
        }

        /* Mobile Header - Hidden on Desktop */
        .mobile-header {
          display: none;
        }

        .sidebar-wrapper {
          display: flex;
          flex-direction: column;
        }

        .sidebar-overlay {
          display: none;
        }

        .mobile-close-btn {
          display: none;
        }

        .sidebar-panel {
          background: white;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
          max-height: calc(100vh - 142px);
        }

        .panel-header {
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 20px 20px 0 0;
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 0;
        }

        .group-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .group-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .group-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          opacity: 0.9;
          margin-top: 4px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .members-link-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .members-link-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .panel-content {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }

        .panel-content::-webkit-scrollbar {
          width: 8px;
        }

        .panel-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .panel-content::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }

        .panel-content::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }

        .members-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #667eea;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .empty-members {
          padding: 40px 20px;
          text-align: center;
        }

        .empty-members p {
          font-size: 13px;
          color: #9ca3af;
          margin: 0;
        }

        .members-mini-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .member-mini {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fafbfc;
          border: 2px solid #f0f1f3;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .member-mini:hover {
          background: white;
          border-color: #e5e7eb;
          transform: translateX(4px);
        }

        .member-avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .mini-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }

        .status-indicator {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }

        .status-indicator.online {
          background: #10b981;
          animation: pulse-indicator 2s infinite;
        }

        .status-indicator.offline {
          background: #ef4444;
        }

        @keyframes pulse-indicator {
          0%, 100% { 
            opacity: 1; 
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% { 
            opacity: 0.8;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
          }
        }

        .mini-info {
          flex: 1;
          min-width: 0;
        }

        .mini-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 4px;
        }

        .mini-status {
          font-size: 11px;
        }

        .status-text {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }

        .status-text.online {
          color: #10b981;
        }

        .status-text.offline {
          color: #ef4444;
        }

        .chat-main-wrapper {
          display: flex;
          flex-direction: column;
        }

        .chat-main {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
          max-height: calc(100vh - 142px);
        }

        .chat-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: white;
          border-radius: 20px 20px 0 0;
          flex-shrink: 0;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .header-title {
          flex: 1;
          min-width: 0;
        }

        .header-title h2 {
          margin: 0 0 4px 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-subtitle {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
        }

        .header-badge {
          background: linear-gradient(135deg, #f0f4ff 0%, #e5edff 100%);
          color: #667eea;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #d1d9ff;
          white-space: nowrap;
          min-width: 40px;
          text-align: center;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background: #fafbfc;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }

        .messages-container::-webkit-scrollbar {
          width: 10px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #9ca3af;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state p {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #6b7280;
        }

        .empty-state span {
          font-size: 14px;
        }

        .message-wrapper {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          animation: messageSlide 0.3s ease-out;
        }

        @keyframes messageSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-wrapper.own {
          flex-direction: row-reverse;
          margin-left: auto;
          max-width: 70%;
        }

        .message-wrapper.other {
          flex-direction: row;
          margin-right: auto;
          max-width: 70%;
        }

        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .message-avatar-spacer {
          width: 36px;
          flex-shrink: 0;
        }

        .message-bubble {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 100%;
        }

        .message-sender {
          font-size: 12px;
          font-weight: 600;
          color: #667eea;
          padding: 0 4px;
        }

        .message-wrapper.own .message-sender {
          color: #10b981;
          text-align: right;
        }

        .message-content {
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
          word-break: break-word;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .message-wrapper.own .message-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message-wrapper.other .message-content {
          background: white;
          color: #111827;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 4px;
        }

        .message-time {
          font-size: 11px;
          color: #9ca3af;
          padding: 0 4px;
        }

        .message-wrapper.own .message-time {
          text-align: right;
        }

        .input-container {
          padding: 20px 24px;
          background: white;
          border-top: 1px solid #e5e7eb;
          border-radius: 0 0 20px 20px;
          flex-shrink: 0;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 24px;
          padding: 8px 12px;
          transition: all 0.3s ease;
        }

        .input-wrapper:focus-within {
          background: white;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .emoji-picker-container {
          position: relative;
          flex-shrink: 0;
        }

        .emoji-picker-popup {
          position: absolute;
          bottom: 100%;
          left: 0;
          z-index: 1000;
          margin-bottom: 12px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.16);
          border: 1px solid #e5e7eb;
          animation: popupSlide 0.2s ease-out;
        }

        @keyframes popupSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .emoji-picker-popup :global(.epr-main) {
          border-radius: 16px;
        }

        .emoji-picker-popup :global(.epr-header) {
          border-bottom: 1px solid #e5e7eb;
        }

        .emoji-picker-popup :global(.epr-emoji) {
          cursor: pointer;
          transition: transform 0.1s ease;
        }

        .emoji-picker-popup :global(.epr-emoji:hover) {
          transform: scale(1.2);
        }

        .icon-button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .icon-button:hover {
          transform: scale(1.1);
        }

        .message-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          padding: 8px;
          outline: none;
          color: #111827;
          min-width: 0;
        }

        .message-input::placeholder {
          color: #9ca3af;
        }

        .send-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          flex-shrink: 0;
        }

        .send-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .send-button:active:not(:disabled) {
          transform: scale(0.95);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Large Desktop */
        @media (min-width: 1400px) {
          .chat-layout {
            grid-template-columns: 380px 1fr;
          }
        }

        /* Desktop to Tablet */
        @media (max-width: 1200px) {
          .chat-layout {
            grid-template-columns: 300px 1fr;
            gap: 20px;
            padding: 20px;
          }

          .sidebar-panel {
            max-height: calc(100vh - 120px);
          }

          .chat-main {
            max-height: calc(100vh - 120px);
          }
        }

        /* Tablet */
        @media (max-width: 1024px) {
          .chat-page {
            padding-bottom: 0;
          }

          .chat-layout {
            grid-template-columns: 1fr;
            padding: 16px;
            max-height: none;
          }

          .mobile-header {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: white;
            border-radius: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .mobile-menu-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .mobile-menu-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          .mobile-group-info h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #111827;
          }

          .sidebar-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            pointer-events: none;
            transition: all 0.3s ease;
          }

          .sidebar-wrapper.show {
            pointer-events: all;
          }

          .sidebar-overlay {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .sidebar-wrapper.show .sidebar-overlay {
            opacity: 1;
          }

          .sidebar-panel {
            position: absolute;
            left: 0;
            top: 0;
            width: 320px;
            max-width: 85vw;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0 20px 20px 0;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .sidebar-wrapper.show .sidebar-panel {
            transform: translateX(0);
          }

          .mobile-close-btn {
            display: flex;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 10px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            backdrop-filter: blur(10px);
          }

          .mobile-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .chat-main {
            max-height: calc(100vh - 160px);
          }

          .message-wrapper {
            max-width: 85%;
          }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .chat-layout {
            padding: 12px;
          }

          .mobile-header {
            padding: 12px;
            margin-bottom: 12px;
          }

          .mobile-menu-btn {
            padding: 8px 12px;
            font-size: 12px;
          }

          .mobile-menu-btn svg {
            width: 18px;
            height: 18px;
          }

          .mobile-group-info h3 {
            font-size: 14px;
          }

          .chat-main {
            border-radius: 16px;
            max-height: calc(100vh - 144px);
          }

          .chat-header {
            padding: 16px 20px;
          }

          .header-title h2 {
            font-size: 16px;
          }

          .header-subtitle {
            font-size: 12px;
          }

          .header-badge {
            padding: 6px 10px;
            font-size: 12px;
          }

          .messages-container {
            padding: 16px;
            gap: 10px;
          }

          .message-wrapper {
            max-width: 90%;
          }

          .message-content {
            padding: 10px 14px;
            font-size: 13px;
          }

          .message-avatar, .message-avatar-spacer {
            width: 32px;
            height: 32px;
            font-size: 13px;
          }

          .input-container {
            padding: 16px;
          }

          .input-wrapper {
            padding: 6px 10px;
            gap: 10px;
          }

          .icon-button {
            font-size: 18px;
          }

          .message-input {
            font-size: 13px;
            padding: 6px;
          }

          .send-button {
            width: 36px;
            height: 36px;
          }

          .send-button svg {
            width: 18px;
            height: 18px;
          }

          .sidebar-panel {
            width: 280px;
          }

          .panel-header {
            padding: 20px;
          }

          .group-icon {
            width: 40px;
            height: 40px;
          }

          .group-title {
            font-size: 16px;
          }

          .panel-content {
            padding: 16px;
          }

          .member-mini {
            padding: 10px;
          }

          .mini-avatar {
            width: 36px;
            height: 36px;
            font-size: 13px;
          }
        }

        /* Small Mobile */
        @media (max-width: 480px) {
          .chat-layout {
            padding: 8px;
          }

          .mobile-header {
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 16px;
          }

          .chat-main {
            border-radius: 12px;
            max-height: calc(100vh - 130px);
          }

          .chat-header {
            padding: 12px 16px;
          }

          .header-title h2 {
            font-size: 14px;
            gap: 6px;
          }

          .header-subtitle {
            display: none;
          }

          .messages-container {
            padding: 12px;
            gap: 8px;
          }

          .message-wrapper {
            max-width: 92%;
            gap: 8px;
          }

          .message-content {
            padding: 8px 12px;
            font-size: 12px;
          }

          .message-avatar, .message-avatar-spacer {
            width: 28px;
            height: 28px;
            font-size: 12px;
          }

          .message-time {
            font-size: 10px;
          }

          .input-container {
            padding: 12px;
          }

          .input-wrapper {
            padding: 5px 8px;
            gap: 8px;
          }

          .icon-button {
            font-size: 16px;
            padding: 2px;
          }

          .message-input {
            font-size: 12px;
            padding: 4px;
          }

          .send-button {
            width: 32px;
            height: 32px;
          }

          .send-button svg {
            width: 16px;
            height: 16px;
          }

          .sidebar-panel {
            width: 260px;
          }
        }
      `}</style>
    </div>
  )
}