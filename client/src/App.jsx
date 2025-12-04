import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import GroupMembers from './pages/GroupMembers'
import Header from './components/Header'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

function AppContent() {
  const location = useLocation()
  const { token } = useAuth()
  
  // Determine if current route is auth page
  const isAuthPage = ['/login', '/register'].includes(location.pathname)

  return (
    <div className="app-root">
      {token && !isAuthPage && <Header />}
      
      <main className={`app-main ${isAuthPage ? 'auth-page' : 'dashboard-page'}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/group/:groupId"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
          <Route
            path="/group/:groupId/members"
            element={
              <PrivateRoute>
                <GroupMembers />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :global(html) {
          font-size: 16px;
          -webkit-text-size-adjust: 100%;
          -webkit-tap-highlight-color: transparent;
        }

        :global(body) {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
          overflow-y: auto;
          margin: 0;
          padding: 0;
          min-height: 100vh;
          min-height: -webkit-fill-available;
        }

        :global(#root) {
          min-height: 100vh;
          min-height: -webkit-fill-available;
          display: flex;
          flex-direction: column;
        }

        .app-root {
          min-height: 100vh;
          min-height: -webkit-fill-available;
          display: flex;
          flex-direction: column;
          background: #f5f7fb;
          position: relative;
        }

        .app-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          animation: fadeIn 0.4s ease-out;
          min-height: 0;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .app-main.auth-page {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .app-main.dashboard-page {
          background: #f5f7fb;
        }

        /* Global Scrollbar Styles */
        :global(::-webkit-scrollbar) {
          width: 12px;
          height: 12px;
        }

        :global(::-webkit-scrollbar-track) {
          background: #f1f1f1;
          border-radius: 10px;
        }

        :global(::-webkit-scrollbar-thumb) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          border: 2px solid #f1f1f1;
        }

        :global(::-webkit-scrollbar-thumb:hover) {
          background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
        }

        /* Mobile Scrollbar */
        @media (max-width: 768px) {
          :global(::-webkit-scrollbar) {
            width: 8px;
            height: 8px;
          }

          :global(::-webkit-scrollbar-track) {
            background: transparent;
          }

          :global(::-webkit-scrollbar-thumb) {
            border: 1px solid #f1f1f1;
          }
        }

        /* Global Button Reset */
        :global(button) {
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }

        /* Global Link Styles */
        :global(a) {
          color: inherit;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Global Input Styles */
        :global(input),
        :global(textarea),
        :global(select) {
          font-family: inherit;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }

        /* Remove input zoom on iOS */
        @media (max-width: 768px) {
          :global(input[type="text"]),
          :global(input[type="email"]),
          :global(input[type="password"]),
          :global(input[type="number"]),
          :global(input[type="tel"]),
          :global(textarea),
          :global(select) {
            font-size: 16px;
          }
        }

        /* Global Focus Styles */
        :global(*:focus-visible) {
          outline: 2px solid #667eea;
          outline-offset: 2px;
        }

        /* Remove focus outline for mouse users */
        :global(*:focus:not(:focus-visible)) {
          outline: none;
        }

        /* Selection Color */
        :global(::selection) {
          background-color: #667eea;
          color: white;
        }

        :global(::-moz-selection) {
          background-color: #667eea;
          color: white;
        }

        /* Loading Animation */
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        /* Smooth transitions for route changes */
        :global(.route-transition-enter) {
          opacity: 0;
          transform: translateY(20px);
        }

        :global(.route-transition-enter-active) {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 300ms, transform 300ms;
        }

        :global(.route-transition-exit) {
          opacity: 1;
        }

        :global(.route-transition-exit-active) {
          opacity: 0;
          transition: opacity 300ms;
        }

        /* Utility Classes */
        :global(.text-gradient) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Prevent text selection on UI elements */
        :global(button),
        :global(.no-select) {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        /* Mobile Safe Area Support */
        @supports (padding: max(0px)) {
          .app-root {
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
          }
        }

        /* Responsive Typography */
        @media (max-width: 1024px) {
          :global(html) {
            font-size: 15px;
          }
        }

        @media (max-width: 768px) {
          :global(html) {
            font-size: 14px;
          }
          
          :global(body) {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          :global(html) {
            font-size: 14px;
          }
        }

        /* Print Styles */
        @media print {
          .app-root {
            background: white;
          }
          
          :global(button),
          :global(nav),
          :global(header) {
            display: none !important;
          }

          :global(::-webkit-scrollbar) {
            display: none;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          :global(*) {
            border-width: 2px !important;
          }
        }

        /* Touch Device Optimizations */
        @media (hover: none) and (pointer: coarse) {
          :global(button),
          :global(a),
          :global(input[type="submit"]),
          :global(input[type="button"]) {
            min-height: 44px;
            min-width: 44px;
          }
        }

        /* Landscape Orientation - Mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .app-main {
            min-height: auto;
          }

          :global(.header) {
            position: static;
          }
        }

        /* Very Small Screens */
        @media (max-width: 360px) {
          :global(html) {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  )
}

function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="error-icon">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" className="back-home-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Back to Home</span>
        </a>
      </div>

      <style jsx>{`
        .not-found-container {
          min-height: calc(100vh - 70px);
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
          position: relative;
        }

        .not-found-content {
          text-align: center;
          color: white;
          max-width: 500px;
          width: 100%;
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .error-icon {
          font-size: 120px;
          font-weight: 700;
          margin-bottom: 24px;
          opacity: 0.9;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          animation: float 3s ease-in-out infinite;
          line-height: 1;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .not-found-content h1 {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 16px;
          line-height: 1.2;
        }

        .not-found-content p {
          font-size: 18px;
          opacity: 0.9;
          margin-bottom: 32px;
          line-height: 1.6;
        }

        .back-home-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          background: white;
          color: #667eea;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          text-decoration: none;
        }

        .back-home-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .back-home-btn:active {
          transform: translateY(0);
        }

        /* Tablet */
        @media (max-width: 768px) {
          .not-found-container {
            min-height: calc(100vh - 60px);
            padding: 32px 20px;
          }

          .error-icon {
            font-size: 90px;
            margin-bottom: 20px;
          }

          .not-found-content h1 {
            font-size: 30px;
            margin-bottom: 14px;
          }

          .not-found-content p {
            font-size: 16px;
            margin-bottom: 28px;
          }

          .back-home-btn {
            padding: 12px 24px;
            font-size: 15px;
          }
        }

        /* Mobile */
        @media (max-width: 480px) {
          .not-found-container {
            padding: 24px 16px;
          }

          .error-icon {
            font-size: 72px;
            margin-bottom: 16px;
          }

          .not-found-content h1 {
            font-size: 24px;
            margin-bottom: 12px;
          }

          .not-found-content p {
            font-size: 14px;
            margin-bottom: 24px;
          }

          .back-home-btn {
            padding: 11px 20px;
            font-size: 14px;
            gap: 8px;
          }

          .back-home-btn svg {
            width: 18px;
            height: 18px;
          }
        }

        /* Small Mobile */
        @media (max-width: 360px) {
          .error-icon {
            font-size: 60px;
          }

          .not-found-content h1 {
            font-size: 22px;
          }

          .not-found-content p {
            font-size: 13px;
          }

          .back-home-btn {
            padding: 10px 18px;
            font-size: 13px;
          }

          .back-home-btn svg {
            width: 16px;
            height: 16px;
          }
        }

        /* Landscape Mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .not-found-container {
            padding: 20px;
          }

          .error-icon {
            font-size: 60px;
            margin-bottom: 12px;
          }

          .not-found-content h1 {
            font-size: 22px;
            margin-bottom: 8px;
          }

          .not-found-content p {
            font-size: 14px;
            margin-bottom: 16px;
          }

          .back-home-btn {
            padding: 10px 20px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}