import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../api'
import { io as ioClient } from 'socket.io-client'

export default function GroupMembers() {
  const { groupId } = useParams()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])

  useEffect(() => {
    if (!token) return
    let mounted = true

    Promise.all([
      api.getGroupDetails(token, groupId),
      api.searchUsers(token, '')
    ]).then(([groupRes, usersRes]) => {
      if (!mounted) return
      setGroup(groupRes)
      setMembers(groupRes.members || [])
      setAllUsers(usersRes || [])
      setLoading(false)
    }).catch(err => {
      console.error(err)
      if (!mounted) return
      alert('Failed to load group details')
      navigate('/')
    })

    // Setup Socket.IO for real-time status updates
    const socket = ioClient(import.meta.env.VITE_API_BASE || 'http://localhost:3000', {
      auth: { token: `Bearer ${token}` }
    })

    socket.on('connect', () => {
      socket.emit('join_group', { groupId })
    })

    socket.on('user_online', (data) => {
      setMembers(prev => prev.map(m => m.id === data.userId ? { ...m, is_online: true } : m))
    })

    socket.on('user_disconnected', (data) => {
      setMembers(prev => prev.map(m => m.id === data.userId ? { ...m, is_online: false } : m))
    })

    return () => {
      socket.disconnect()
    }
  }, [token, groupId, navigate])

  const handleSearchUsers = async (search) => {
    setSearchTerm(search)
    if (search.length < 2) {
      setAllUsers([])
      return
    }
    try {
      const res = await api.searchUsers(token, search)
      setAllUsers(res || [])
    } catch (err) {
      console.error(err)
    }
  }

  const isGroupAdmin = group && user && group.created_by === user.id
  const memberIds = new Set(members.map(m => m.id))
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id))

  const addMembers = async () => {
    if (selectedUsers.length === 0) return
    try {
      for (const userId of selectedUsers) {
        await api.addGroupMember(token, groupId, userId)
      }
      // Refresh members
      const updated = await api.getGroupDetails(token, groupId)
      setMembers(updated.members || [])
      setSelectedUsers([])
      setShowInvite(false)
      setSearchTerm('')
    } catch (err) {
      console.error(err)
      alert('Failed to add member(s)')
    }
  }

  const removeMember = async (memberId) => {
    if (!isGroupAdmin) {
      alert('Only admins can remove members')
      return
    }
    if (!window.confirm('Remove this member from the group?')) return
    try {
      await api.removeGroupMember(token, groupId, memberId)
      setMembers(members.filter(m => m.id !== memberId))
    } catch (err) {
      console.error(err)
      alert('Failed to remove member')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading members...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 70px);
            color: #667eea;
          }
          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #e5e7eb;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="error-container">
        <p>Group not found</p>
        <button onClick={() => navigate('/')}>Go to Dashboard</button>
        <style jsx>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 70px);
            gap: 16px;
          }
          .error-container button {
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="members-page">
      <div className="members-container">
        <div className="members-header">
          <button className="back-btn" onClick={() => navigate(`/group/${groupId}`)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="back-text">Back to Chat</span>
          </button>
          <div className="header-content">
            <h2>{group.name}</h2>
            <span className="members-count">{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </div>
          {isGroupAdmin && (
            <button className="invite-btn" onClick={() => setShowInvite(!showInvite)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 11H17M20 8V14M12.5 7C12.5 9.20914 10.7091 11 8.5 11C6.29086 11 4.5 9.20914 4.5 7C4.5 4.79086 6.29086 3 8.5 3C10.7091 3 12.5 4.79086 12.5 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="invite-text">Invite</span>
            </button>
          )}
        </div>

        {showInvite && isGroupAdmin && (
          <div className="invite-section">
            <div className="invite-header">
              <h3>Invite Members</h3>
              <button className="close-invite" onClick={() => setShowInvite(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <input
              type="text"
              placeholder="Search users by name (min 2 chars)..."
              value={searchTerm}
              onChange={e => handleSearchUsers(e.target.value)}
              className="search-input"
            />
            {availableUsers.length > 0 && (
              <div className="available-users">
                {availableUsers.map(u => (
                  <label key={u.id} className="user-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, u.id])
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== u.id))
                        }
                      }}
                    />
                    <div className="user-checkbox-avatar">
                      {(u.display_name || u.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span>{u.display_name || u.username}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="invite-actions">
              <button className="add-btn" onClick={addMembers} disabled={selectedUsers.length === 0}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add {selectedUsers.length > 0 ? `${selectedUsers.length} ` : ''}Member{selectedUsers.length !== 1 ? 's' : ''}
              </button>
              <button className="cancel-btn" onClick={() => setShowInvite(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="members-list">
          {members.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No members in this group</p>
              <span>Invite members to get started</span>
            </div>
          ) : (
            members.map(m => (
              <div key={m.id} className="member-item">
                <div className="member-avatar">
                  {(m.display_name || m.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="member-info">
                  <div className="member-name">
                    {m.display_name || m.username}
                    {m.role === 'admin' && <span className="badge admin-badge">Admin</span>}
                    {m.role === 'moderator' && <span className="badge mod-badge">Mod</span>}
                  </div>
                  <div className="member-status">
                    {m.is_online ? (
                      <span className="online">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                          <circle cx="6" cy="6" r="6"/>
                        </svg>
                        Online
                      </span>
                    ) : (
                      <span className="offline">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                          <circle cx="6" cy="6" r="6"/>
                        </svg>
                        Offline
                      </span>
                    )}
                  </div>
                </div>
                {isGroupAdmin && m.id !== user.id && (
                  <button
                    className="remove-btn"
                    onClick={() => removeMember(m.id)}
                    title="Remove member"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .members-page {
          background: #f5f7fb;
          min-height: calc(100vh - 70px);
          padding: 24px;
        }

        .members-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .members-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .back-btn {
          padding: 10px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #667eea;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .back-btn:hover {
          background: #f9fafb;
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.15);
        }

        .header-content {
          flex: 1;
          min-width: 200px;
        }

        .header-content h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .members-count {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .invite-btn {
          padding: 10px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .invite-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .invite-section {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .invite-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .invite-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .close-invite {
          background: #f3f4f6;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }

        .close-invite:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          margin-bottom: 16px;
          transition: all 0.2s;
          font-weight: 500;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .available-users {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 16px;
          padding: 4px;
        }

        .available-users::-webkit-scrollbar {
          width: 8px;
        }

        .available-users::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 10px;
        }

        .available-users::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }

        .user-checkbox {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .user-checkbox:hover {
          background: #f9fafb;
          border-color: #e5e7eb;
        }

        .user-checkbox input {
          cursor: pointer;
          width: 18px;
          height: 18px;
          accent-color: #667eea;
        }

        .user-checkbox-avatar {
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
        }

        .user-checkbox span {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }

        .invite-actions {
          display: flex;
          gap: 12px;
        }

        .add-btn, .cancel-btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .add-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .add-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .cancel-btn {
          background: white;
          border: 2px solid #e5e7eb;
          color: #6b7280;
        }

        .cancel-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .members-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
          background: white;
          border-radius: 20px;
          border: 2px dashed #e5e7eb;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state p {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .empty-state span {
          font-size: 14px;
          color: #6b7280;
        }

        .member-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: white;
          border: 2px solid #f0f1f3;
          border-radius: 16px;
          transition: all 0.2s;
        }

        .member-item:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
          transform: translateX(4px);
        }

        .member-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .member-info {
          flex: 1;
          min-width: 0;
        }

        .member-name {
          font-weight: 600;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #111827;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }

        .badge {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .admin-badge {
          background: linear-gradient(135deg, #fca5a5 0%, #f87171 100%);
          color: #7f1d1d;
        }

        .mod-badge {
          background: linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 100%);
          color: #831843;
        }

        .member-status {
          font-size: 13px;
          color: #6b7280;
          display: flex;
          align-items: center;
        }

        .online, .offline {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }

        .online {
          color: #10b981;
        }

        .offline {
          color: #9ca3af;
        }

        .remove-btn {
          padding: 8px;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-btn:hover {
          background: #fecaca;
          transform: scale(1.1);
        }

        /* Tablet */
        @media (max-width: 768px) {
          .members-page {
            padding: 16px;
          }

          .members-header {
            gap: 12px;
          }

          .back-text {
            display: none;
          }

          .back-btn {
            padding: 10px;
          }

          .header-content {
            flex: 1 100%;
            order: -1;
          }

          .header-content h2 {
            font-size: 20px;
          }

          .invite-text {
            display: none;
          }

          .invite-btn {
            padding: 10px 14px;
          }

          .invite-section {
            padding: 20px;
          }

          .invite-header h3 {
            font-size: 16px;
          }

          .member-avatar {
            width: 44px;
            height: 44px;
            font-size: 16px;
          }

          .member-name {
            font-size: 14px;
          }

          .member-status {
            font-size: 12px;
          }
        }

        /* Mobile */
        @media (max-width: 480px) {
          .members-page {
            padding: 12px;
          }

          .members-header {
            margin-bottom: 16px;
          }

          .header-content h2 {
            font-size: 18px;
          }

          .members-count {
            font-size: 13px;
          }

          .invite-section {
            padding: 16px;
            border-radius: 16px;
          }

          .search-input {
            padding: 10px 14px;
            font-size: 13px;
          }

          .available-users {
            max-height: 250px;
          }

          .user-checkbox {
            padding: 10px;
          }

          .user-checkbox-avatar {
            width: 32px;
            height: 32px;
            font-size: 13px;
          }

          .user-checkbox span {
            font-size: 13px;
          }

          .invite-actions {
            flex-direction: column;
            gap: 10px;
          }

          .add-btn, .cancel-btn {
            padding: 10px 16px;
            font-size: 13px;
          }

          .members-list {
            gap: 10px;
          }

          .member-item {
            padding: 12px;
            gap: 12px;
          }

          .member-avatar {
            width: 40px;
            height: 40px;
            font-size: 15px;
          }

          .member-name {
            font-size: 13px;
          }

          .badge {
            font-size: 10px;
            padding: 2px 6px;
          }

          .member-status {
            font-size: 11px;
          }

          .remove-btn {
            padding: 6px;
          }

          .remove-btn svg {
            width: 14px;
            height: 14px;
          }

          .empty-state {
            padding: 60px 20px;
          }

          .empty-icon {
            font-size: 48px;
          }

          .empty-state p {
            font-size: 16px;
          }

          .empty-state span {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  )
}