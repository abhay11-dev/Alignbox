import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../api'

export default function Dashboard(){
  const { token, user } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const navigate = useNavigate()

  useEffect(()=>{
    let mounted = true
    if (!token) return
    api.getGroups(token).then(res => {
      if (!mounted) return
      setGroups(res)
    }).catch(()=>{}).finally(()=>mounted && setLoading(false))
    return ()=> mounted = false
  }, [token])

  async function create(e){
    e.preventDefault()
    if (!name.trim()) return
    setIsCreating(true)
    try{
      const g = await api.createGroup(token, { name })
      navigate(`/group/${g.id}`)
    }catch(err){
      console.error(err)
      alert('Failed to create group')
    } finally {
      setIsCreating(false)
    }
  }

  const getGroupColor = (index) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Mobile Header */}
        <div className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setShowSidebar(!showSidebar)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Your Groups</span>
            <span className="mobile-count">{groups.length}</span>
          </button>
          <h2 className="mobile-title">Dashboard</h2>
        </div>

        <aside className={`sidebar-wrapper ${showSidebar ? 'show' : ''}`}>
          <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}></div>
          <div className="sidebar">
            <div className="sidebar-header">
              <div className="header-content">
                <div className="header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Your Groups</h3>
              </div>
              <div className="header-actions">
                <div className="groups-count">{groups.length}</div>
                <button className="mobile-close-btn" onClick={() => setShowSidebar(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="groups-list">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading groups...</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="empty-groups">
                  <div className="empty-icon">📁</div>
                  <p>No groups yet</p>
                  <span>Create your first group below</span>
                </div>
              ) : (
                groups.map((g, index) => (
                  <Link key={g.id} to={`/group/${g.id}`} className="group-card" onClick={() => setShowSidebar(false)}>
                    <div className="group-avatar" style={{ background: getGroupColor(index) }}>
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="group-info">
                      <div className="group-name">{g.name}</div>
                      <div className="group-members">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {g.member_count || 0} members
                      </div>
                    </div>
                    <div className="group-arrow">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="create-group-section">
              <div className="section-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Create New Group
              </div>
              <form onSubmit={create} className="create-form">
                <div className="input-group">
                  <input 
                    className="group-input" 
                    placeholder="Enter group name..." 
                    value={name} 
                    onChange={e=>setName(e.target.value)}
                    disabled={isCreating}
                  />
                  <button className="create-btn" type="submit" disabled={isCreating || !name.trim()}>
                    {isCreating ? (
                      <div className="btn-spinner"></div>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Create
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </aside>

        <section className="main-content">
          <div className="welcome-card">
            <div className="welcome-illustration">
              <div className="illustration-circle circle-1"></div>
              <div className="illustration-circle circle-2"></div>
              <div className="illustration-circle circle-3"></div>
              <div className="chat-icon">💬</div>
            </div>
            
            <div className="welcome-text">
              <h1>Welcome{user?.display_name ? `, ${user.display_name}` : ''}! 👋</h1>
              <p>Ready to start chatting? Select a group from the sidebar or create a new one to get started.</p>
            </div>

            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🚀</div>
                <div className="feature-content">
                  <h4>Real-time Chat</h4>
                  <p>Instant messaging with WebSocket technology</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">👥</div>
                <div className="feature-content">
                  <h4>Group Collaboration</h4>
                  <p>Create and manage multiple group chats</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎭</div>
                <div className="feature-content">
                  <h4>Anonymous Mode</h4>
                  <p>Send messages anonymously when needed</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔒</div>
                <div className="feature-content">
                  <h4>Secure & Private</h4>
                  <p>Your conversations are protected</p>
                </div>
              </div>
            </div>

            <div className="cta-section">
              <div className="cta-text">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {groups.length === 0 ? 'Create your first group to get started' : 'Select a group to open chat'}
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .dashboard-page {
          background: #f5f7fb;
          min-height: calc(100vh - 70px);
          padding: 24px;
          padding-bottom: 80px;
        }

        .dashboard-container {
          display: grid;
          grid-template-columns: 420px 1fr;
          height: calc(100vh - 118px);
          gap: 24px;
          max-width: 1600px;
          margin: 0 auto;
          position: relative;
        }

        /* Mobile Header - Hidden on Desktop */
        .mobile-header {
          display: none;
        }

        .sidebar-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .sidebar-overlay {
          display: none;
        }

        .mobile-close-btn {
          display: none;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar {
          background: white;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
          height: 100%;
        }

        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 20px 20px 0 0;
          flex-shrink: 0;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon {
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }

        .sidebar-header h3 {
          margin: 0;
          font-size: 19px;
          font-weight: 600;
          letter-spacing: -0.3px;
        }

        .groups-count {
          background: rgba(255, 255, 255, 0.25);
          padding: 8px 14px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          min-width: 36px;
          text-align: center;
        }

        .groups-list {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }

        .groups-list::-webkit-scrollbar {
          width: 8px;
        }

        .groups-list::-webkit-scrollbar-track {
          background: transparent;
        }

        .groups-list::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }

        .groups-list::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #9ca3af;
        }

        .spinner {
          width: 44px;
          height: 44px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-state p {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
        }

        .empty-groups {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #9ca3af;
        }

        .empty-icon {
          font-size: 56px;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        .empty-groups p {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #6b7280;
        }

        .empty-groups span {
          font-size: 13px;
          color: #9ca3af;
        }

        .group-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: #fafbfc;
          border: 2px solid #f0f1f3;
          border-radius: 14px;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .group-card:hover {
          background: white;
          border-color: #667eea;
          transform: translateX(6px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.15);
        }

        .group-avatar {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 22px;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }

        .group-info {
          flex: 1;
          min-width: 0;
        }

        .group-name {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .group-members {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
        }

        .group-arrow {
          color: #d1d5db;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .group-card:hover .group-arrow {
          color: #667eea;
          transform: translateX(4px);
        }

        .create-group-section {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          background: linear-gradient(to bottom, #fafbfc 0%, #f5f7fb 100%);
          border-radius: 0 0 20px 20px;
          flex-shrink: 0;
        }

        .section-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .create-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .input-group {
          display: flex;
          gap: 10px;
        }

        .group-input {
          flex: 1;
          padding: 13px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: white;
          font-weight: 500;
          min-width: 0;
        }

        .group-input::placeholder {
          color: #9ca3af;
        }

        .group-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .group-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f9fafb;
        }

        .create-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 13px 22px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px rgba(102, 126, 234, 0.35);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .create-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.45);
        }

        .create-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .create-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .main-content {
          padding: 0 24px;
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .main-content::-webkit-scrollbar {
          width: 10px;
        }

        .main-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .main-content::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }

        .main-content::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }

        .welcome-card {
          max-width: 800px;
          width: 100%;
          padding: 20px 0;
        }

        .welcome-illustration {
          position: relative;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 40px;
        }

        .illustration-circle {
          position: absolute;
          border-radius: 50%;
          animation: float 3s ease-in-out infinite;
        }

        .circle-1 {
          width: 150px;
          height: 150px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          opacity: 0.1;
          top: 25px;
          left: 50%;
          transform: translateX(-50%);
        }

        .circle-2 {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          opacity: 0.15;
          top: 50px;
          right: 200px;
          animation-delay: 0.5s;
        }

        .circle-3 {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          opacity: 0.1;
          bottom: 50px;
          left: 150px;
          animation-delay: 1s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .chat-icon {
          font-size: 80px;
          position: relative;
          z-index: 1;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .welcome-text {
          text-align: center;
          margin-bottom: 48px;
        }

        .welcome-text h1 {
          font-size: 36px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 16px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-text p {
          font-size: 18px;
          color: #6b7280;
          margin: 0;
          line-height: 1.6;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        .feature-item {
          display: flex;
          gap: 16px;
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          border-color: #667eea;
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
          transform: translateY(-4px);
        }

        .feature-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .feature-content h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .feature-content p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }

        .cta-section {
          text-align: center;
          padding: 24px;
          background: linear-gradient(135deg, #f0f4ff 0%, #e5edff 100%);
          border-radius: 16px;
          border: 2px dashed #667eea;
        }

        .cta-text {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: #667eea;
        }

        /* Large Desktop */
        @media (min-width: 1400px) {
          .dashboard-container {
            grid-template-columns: 460px 1fr;
          }
        }

        /* Desktop to Tablet */
        @media (max-width: 1200px) {
          .dashboard-container {
            grid-template-columns: 360px 1fr;
            gap: 20px;
          }

          .dashboard-page {
            padding: 20px;
          }

          .main-content {
            padding: 0 20px;
          }
        }

        /* Tablet */
        @media (max-width: 1024px) {
          .dashboard-page {
            padding: 16px;
            padding-bottom: 0;
            min-height: auto;
          }

          .dashboard-container {
            grid-template-columns: 1fr;
            height: auto;
            max-height: none;
          }

          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
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

          .mobile-count {
            background: rgba(255, 255, 255, 0.3);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
          }

          .mobile-title {
            margin: 0;
            font-size: 18px;
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

          .sidebar {
            position: absolute;
            left: 0;
            top: 0;
            width: 360px;
            max-width: 85vw;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0 20px 20px 0;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .sidebar-wrapper.show .sidebar {
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

          .main-content {
            padding: 0;
            height: auto;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .dashboard-page {
            padding: 12px;
          }

          .dashboard-container {
            padding: 0;
            gap: 12px;
          }

          .mobile-header {
            padding: 12px;
            margin-bottom: 12px;
            flex-wrap: wrap;
            gap: 10px;
          }

          .mobile-menu-btn {
            padding: 8px 12px;
            font-size: 12px;
          }

          .mobile-title {
            font-size: 16px;
            width: 100%;
            text-align: center;
            order: -1;
          }

          .welcome-text h1 {
            font-size: 28px;
          }

          .welcome-text p {
            font-size: 16px;
          }

          .welcome-illustration {
            height: 150px;
            margin-bottom: 32px;
          }

          .chat-icon {
            font-size: 60px;
          }

          .circle-2, .circle-3 {
            display: none;
          }

          .features-grid {
            gap: 16px;
            margin-bottom: 32px;
          }

          .feature-item {
            padding: 20px;
          }

          .feature-icon {
            font-size: 28px;
          }

          .feature-content h4 {
            font-size: 15px;
          }

          .feature-content p {
            font-size: 13px;
          }

          .cta-section {
            padding: 20px;
          }

          .cta-text {
            font-size: 14px;
          }

          .sidebar {
            width: 320px;
          }

          .sidebar-header {
            padding: 20px;
          }

          .header-icon {
            width: 40px;
            height: 40px;
          }

          .sidebar-header h3 {
            font-size: 17px;
          }

          .groups-list {
            padding: 16px;
          }

          .group-card {
            padding: 14px;
          }

          .group-avatar {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }

          .create-group-section {
            padding: 16px;
          }
        }

        /* Small Mobile */
        @media (max-width: 480px) {
          .dashboard-page {
            padding: 8px;
          }

          .mobile-header {
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 16px;
          }

          .mobile-title {
            font-size: 14px;
          }

          .mobile-menu-btn {
            padding: 6px 10px;
            font-size: 11px;
          }

          .welcome-text h1 {
            font-size: 24px;
          }

          .welcome-text p {
            font-size: 14px;
          }

          .welcome-illustration {
            height: 120px;
            margin-bottom: 24px;
          }

          .chat-icon {
            font-size: 50px;
          }

          .circle-1 {
            width: 100px;
            height: 100px;
          }

          .features-grid {
            gap: 12px;
            margin-bottom: 24px;
          }

          .feature-item {
            padding: 16px;
            gap: 12px;
          }

          .feature-icon {
            font-size: 24px;
          }

          .feature-content h4 {
            font-size: 14px;
          }

          .feature-content p {
            font-size: 12px;
          }

          .cta-section {
            padding: 16px;
          }

          .cta-text {
            font-size: 13px;
            gap: 8px;
          }

          .cta-text svg {
            width: 16px;
            height: 16px;
          }

          .sidebar {
            width: 280px;
          }

          .group-input {
            padding: 11px 14px;
            font-size: 13px;
          }

          .create-btn {
            padding: 11px 18px;
            font-size: 13px;
          }

          .create-btn svg {
            width: 16px;
            height: 16px;
          }
        }
      `}</style>
    </div>
  )
}