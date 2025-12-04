import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Header(){
  const { token, saveToken, user } = useAuth()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)

  function logout(){
    saveToken(null)
    navigate('/login')
    setShowDropdown(false)
  }

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="brand">
          <span className="brand-icon">◈</span>
          <span className="brand-text">Alignbox</span>
        </Link>
        
        <nav className="header-nav">
          {token ? (
            <div className="user-dropdown-wrapper">
              <button 
                className="user-button" 
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="User menu"
              >
                <div className="user-avatar">
                  {(user?.display_name || user?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <span className="user-name">{user?.display_name || user?.username}</span>
                  <span className="user-role">Member</span>
                </div>
                <svg 
                  className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none"
                >
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {showDropdown && (
                <>
                  <div className="dropdown-overlay" onClick={() => setShowDropdown(false)}></div>
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <div className="dropdown-avatar">
                        {(user?.display_name || user?.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="dropdown-user-info">
                        <div className="dropdown-name">{user?.display_name || user?.username}</div>
                        <div className="dropdown-email">{user?.email || 'member@alignbox.com'}</div>
                      </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <Link to="/" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Dashboard
                    </Link>

                    <button className="dropdown-item" onClick={logout}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link className="link link-signin" to="/login">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15M10 17L15 12M15 12L10 7M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="link-text">Sign in</span>
              </Link>
              <Link className="link link-signup" to="/register">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 1.41709 16.1716C0.642857 16.9217 0 17.9391 0 19V21M20 8V14M23 11H17M12.5 7C12.5 8.933 10.933 10.5 9 10.5C7.067 10.5 5.5 8.933 5.5 7C5.5 5.067 7.067 3.5 9 3.5C10.933 3.5 12.5 5.067 12.5 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="link-text">Sign up</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      <style jsx>{`
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
          position: sticky;
          top: 0;
          z-index: 1000;
          backdrop-filter: blur(10px);
        }

        .header-container {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 26px;
          font-weight: 700;
          color: white;
          text-decoration: none;
          transition: transform 0.2s ease;
          cursor: pointer;
          flex-shrink: 0;
        }

        .brand:hover {
          transform: scale(1.05);
        }

        .brand-icon {
          font-size: 32px;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
        }

        .brand-text {
          letter-spacing: -0.5px;
        }

        .header-nav {
          display: flex;
          align-items: center;
          margin-left: auto;
        }

        .user-dropdown-wrapper {
          position: relative;
        }

        .user-button {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 8px 16px 8px 8px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .user-button:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          min-width: 0;
        }

        .user-name {
          color: white;
          font-weight: 600;
          font-size: 15px;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.2;
        }

        .user-role {
          color: rgba(255, 255, 255, 0.85);
          font-weight: 400;
          font-size: 12px;
          line-height: 1.2;
        }

        .dropdown-arrow {
          color: white;
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }

        .dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .dropdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          min-width: 280px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          z-index: 1000;
          animation: dropdownSlide 0.3s ease-out;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-header {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .dropdown-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }

        .dropdown-user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          flex: 1;
        }

        .dropdown-name {
          color: white;
          font-weight: 600;
          font-size: 16px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dropdown-email {
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dropdown-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 8px 0;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          background: white;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dropdown-item:hover {
          background: #f3f4f6;
        }

        .dropdown-item svg {
          flex-shrink: 0;
          color: #6b7280;
        }

        .auth-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .link {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 20px;
          border-radius: 10px;
          transition: all 0.3s ease;
        }

        .link-signin {
          color: white;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .link-signin:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .link-signup {
          background: white;
          color: #667eea;
          border: 1px solid transparent;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .link-signup:hover {
          background: #f8f9ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        /* Large Desktop */
        @media (min-width: 1200px) {
          .header-container {
            padding: 18px 40px;
          }

          .brand {
            font-size: 28px;
          }

          .brand-icon {
            font-size: 34px;
          }
        }

        /* Tablet */
        @media (max-width: 1024px) {
          .header-container {
            padding: 14px 24px;
          }

          .brand {
            font-size: 24px;
          }

          .brand-icon {
            font-size: 30px;
          }
        }

        /* Mobile Landscape */
        @media (max-width: 768px) {
          .header-container {
            padding: 12px 16px;
          }

          .brand {
            font-size: 22px;
            gap: 10px;
          }

          .brand-icon {
            font-size: 26px;
          }

          .brand-text {
            display: block;
          }

          .user-button {
            padding: 6px 12px 6px 6px;
            gap: 10px;
          }

          .user-avatar {
            width: 38px;
            height: 38px;
            font-size: 15px;
          }

          .user-name {
            font-size: 14px;
            max-width: 100px;
          }

          .user-role {
            font-size: 11px;
          }

          .dropdown-menu {
            min-width: 260px;
            right: 0;
          }

          .dropdown-header {
            padding: 16px;
          }

          .dropdown-avatar {
            width: 44px;
            height: 44px;
            font-size: 18px;
          }

          .dropdown-name {
            font-size: 15px;
          }

          .dropdown-email {
            font-size: 12px;
          }

          .dropdown-item {
            padding: 12px 16px;
            font-size: 13px;
          }

          .link {
            font-size: 13px;
            padding: 8px 16px;
            gap: 6px;
          }

          .link svg {
            width: 16px;
            height: 16px;
          }
        }

        /* Mobile Portrait */
        @media (max-width: 640px) {
          .header-container {
            padding: 10px 12px;
          }

          .brand {
            font-size: 20px;
            gap: 8px;
          }

          .brand-icon {
            font-size: 24px;
          }

          .user-name {
            max-width: 80px;
          }

          .dropdown-menu {
            min-width: 240px;
          }

          .auth-buttons {
            gap: 8px;
          }

          .link {
            padding: 8px 14px;
            font-size: 12px;
          }
        }

        /* Small Mobile */
        @media (max-width: 480px) {
          .header-container {
            padding: 10px;
          }

          .brand {
            font-size: 18px;
            gap: 6px;
          }

          .brand-icon {
            font-size: 22px;
          }

          .brand-text {
            display: none;
          }

          .user-details {
            display: none;
          }

          .dropdown-arrow {
            display: none;
          }

          .user-button {
            padding: 6px;
            border-radius: 50%;
          }

          .user-avatar {
            width: 36px;
            height: 36px;
            font-size: 14px;
          }

          .dropdown-menu {
            min-width: calc(100vw - 20px);
            right: -10px;
            left: auto;
          }

          .dropdown-header {
            padding: 14px;
          }

          .dropdown-avatar {
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .dropdown-name {
            font-size: 14px;
          }

          .dropdown-email {
            font-size: 11px;
          }

          .dropdown-item {
            padding: 12px 14px;
            font-size: 13px;
          }

          .dropdown-item svg {
            width: 16px;
            height: 16px;
          }

          .auth-buttons {
            gap: 6px;
          }

          .link-text {
            display: none;
          }

          .link {
            padding: 10px;
            border-radius: 50%;
          }

          .link svg {
            margin: 0;
          }
        }

        /* Extra Small Mobile */
        @media (max-width: 360px) {
          .header-container {
            padding: 8px;
          }

          .brand-icon {
            font-size: 20px;
          }

          .user-avatar {
            width: 32px;
            height: 32px;
            font-size: 13px;
          }

          .dropdown-menu {
            min-width: calc(100vw - 16px);
            right: -8px;
          }

          .link {
            padding: 8px;
          }

          .link svg {
            width: 18px;
            height: 18px;
          }
        }
      `}</style>
    </header>
  )
}