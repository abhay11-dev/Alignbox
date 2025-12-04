import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function Register(){
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' })
  const { saveToken } = useAuth()
  const navigate = useNavigate()

  function checkPasswordStrength(pwd) {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[@$!%*?&]/.test(pwd)) score++

    const strengths = [
      { score: 0, text: '', color: '' },
      { score: 1, text: 'Very Weak', color: '#ef4444' },
      { score: 2, text: 'Weak', color: '#f97316' },
      { score: 3, text: 'Fair', color: '#eab308' },
      { score: 4, text: 'Good', color: '#84cc16' },
      { score: 5, text: 'Strong', color: '#22c55e' },
    ]

    setPasswordStrength(strengths[score])
  }

  function handlePasswordChange(e) {
    const pwd = e.target.value
    setPassword(pwd)
    if (pwd) checkPasswordStrength(pwd)
    else setPasswordStrength({ score: 0, text: '', color: '' })
  }

  async function submit(e){
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const usernameRe = /^[a-zA-Z0-9_]{3,50}$/
    const passwordRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!usernameRe.test(username)) {
      setError('Username must be 3-50 chars and contain only letters, numbers, and underscores')
      setIsLoading(false)
      return
    }
    if (!emailRe.test(email)) {
      setError('Please provide a valid email address')
      setIsLoading(false)
      return
    }
    if (!passwordRe.test(password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number and special character')
      setIsLoading(false)
      return
    }

    try{
      const res = await api.register({ username, email, password, displayName })
      saveToken(res.token)
      navigate('/')
    }catch(err){
      if (err && err.details && Array.isArray(err.details)){
        const msgs = err.details.map(d => d.msg || d.message || JSON.stringify(d)).join('; ')
        setError(`${err.error || 'Validation failed'}: ${msgs}`)
      } else {
        setError(err?.error || err?.message || 'Registration failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-wrapper">
        <div className="register-left">
          <div className="brand-section">
            <div className="brand-logo">
              <span className="logo-icon">◈</span>
              <span className="logo-text">Alignbox</span>
            </div>
            <h1>Join Alignbox Today</h1>
            <p>Create your account and start connecting with teams through seamless real-time messaging.</p>
          </div>

          <div className="benefits-list">
            <div className="benefit">
              <div className="benefit-number">01</div>
              <div>
                <h4>Create an Account</h4>
                <p>Sign up in seconds with just a few details</p>
              </div>
            </div>
            <div className="benefit">
              <div className="benefit-number">02</div>
              <div>
                <h4>Join or Create Groups</h4>
                <p>Start collaborating with your teams instantly</p>
              </div>
            </div>
            <div className="benefit">
              <div className="benefit-number">03</div>
              <div>
                <h4>Connect & Communicate</h4>
                <p>Chat in real-time with powerful features</p>
              </div>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat">
              <div className="stat-value">10K+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat">
              <div className="stat-value">50K+</div>
              <div className="stat-label">Messages Sent</div>
            </div>
            <div className="stat">
              <div className="stat-value">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>

          <div className="decorative-circles">
            <div className="circle circle-1"></div>
            <div className="circle circle-2"></div>
            <div className="circle circle-3"></div>
          </div>
        </div>

        <div className="register-right">
          {/* Mobile Brand Header */}
          <div className="mobile-brand">
            <div className="mobile-logo">
              <span className="mobile-logo-icon">◈</span>
              <span className="mobile-logo-text">Alignbox</span>
            </div>
            <p className="mobile-tagline">Create your account</p>
          </div>

          <form className="register-form" onSubmit={submit}>
            <div className="form-header">
              <h2>Create Account</h2>
              <p>Fill in your details to get started</p>
            </div>

            {error && (
              <div className="error-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username*</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input 
                  className="form-input" 
                  value={username} 
                  onChange={e=>setUsername(e.target.value)} 
                  placeholder="Choose a username"
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="input-hint">3-50 characters, letters, numbers, and underscores only</div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address*</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input 
                  className="form-input" 
                  type="email"
                  value={email} 
                  onChange={e=>setEmail(e.target.value)} 
                  placeholder="your@email.com"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Display Name (Optional)</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.90527 20.2491C3.82736 18.6531 5.15322 17.3278 6.74966 16.4064C8.34611 15.485 10.1569 15 12.0002 15C13.8434 15 15.6542 15.4851 17.2506 16.4065C18.8471 17.3279 20.1729 18.6533 21.0949 20.2493" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input 
                  className="form-input" 
                  value={displayName} 
                  onChange={e=>setDisplayName(e.target.value)} 
                  placeholder="How should we call you?"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password*</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input 
                  className="form-input password-input" 
                  type={showPassword ? "text" : "password"}
                  value={password} 
                  onChange={handlePasswordChange} 
                  placeholder="Create a strong password"
                  disabled={isLoading}
                  required
                />
                <button 
                  type="button" 
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68192 3.96914 7.65663 6.06 6.06M9.9 4.24C10.5883 4.0789 11.2931 3.99836 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2048 20.84 15.19M14.12 14.12C13.8454 14.4148 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1752 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.4811 9.80385 14.1962C9.51897 13.9113 9.29439 13.572 9.14351 13.1984C8.99262 12.8249 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2219 9.18488 10.8539C9.34884 10.4859 9.58525 10.1547 9.88 9.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
              {passwordStrength.text && (
                <div className="password-strength">
                  <div className="strength-bars">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div 
                        key={i} 
                        className={`strength-bar ${i <= passwordStrength.score ? 'active' : ''}`}
                        style={{ backgroundColor: i <= passwordStrength.score ? passwordStrength.color : '#e5e7eb' }}
                      ></div>
                    ))}
                  </div>
                  <span style={{ color: passwordStrength.color }}>{passwordStrength.text}</span>
                </div>
              )}
              <div className="input-hint">Min 8 characters with uppercase, lowercase, number & special character</div>
            </div>

            <button className="submit-btn" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="btn-spinner"></div>
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>

            <div className="form-footer">
              <span>Already have an account?</span>
              <Link className="signin-link" to="/login">Sign in instead</Link>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .register-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .register-wrapper {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1200px;
          width: 100%;
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .register-left {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 60px 50px;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .brand-section {
          margin-bottom: 40px;
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .logo-icon {
          font-size: 36px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        .logo-text {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .brand-section h1 {
          font-size: 36px;
          font-weight: 700;
          margin: 0 0 16px 0;
          line-height: 1.2;
        }

        .brand-section p {
          font-size: 16px;
          opacity: 0.9;
          line-height: 1.6;
          margin: 0;
        }

        .benefits-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 40px;
          position: relative;
          z-index: 1;
        }

        .benefit {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .benefit-number {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          flex-shrink: 0;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .benefit h4 {
          margin: 0 0 6px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .benefit p {
          margin: 0;
          font-size: 14px;
          opacity: 0.85;
          line-height: 1.5;
        }

        .stats-section {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          position: relative;
          z-index: 1;
        }

        .stat {
          text-align: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.85;
        }

        .decorative-circles {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          animation: float 6s ease-in-out infinite;
        }

        .circle-1 {
          width: 200px;
          height: 200px;
          top: -50px;
          right: -50px;
        }

        .circle-2 {
          width: 150px;
          height: 150px;
          bottom: -30px;
          left: -30px;
          animation-delay: 2s;
        }

        .circle-3 {
          width: 100px;
          height: 100px;
          top: 40%;
          right: 10%;
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }

        /* Mobile Brand - Hidden on Desktop */
        .mobile-brand {
          display: none;
        }

        .register-right {
          padding: 60px 50px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          max-height: 100vh;
          overflow-y: auto;
        }

        .register-right::-webkit-scrollbar {
          width: 8px;
        }

        .register-right::-webkit-scrollbar-track {
          background: #f3f4f6;
        }

        .register-right::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }

        .register-form {
          width: 100%;
          max-width: 420px;
        }

        .form-header {
          margin-bottom: 28px;
        }

        .form-header h2 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }

        .form-header p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          color: #dc2626;
          font-size: 13px;
          margin-bottom: 20px;
          animation: shake 0.5s ease-in-out;
          line-height: 1.5;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .error-banner svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #9ca3af;
          pointer-events: none;
          z-index: 1;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.3s ease;
          outline: none;
          background: #f9fafb;
        }

        .form-input:focus {
          background: white;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-input {
          padding-right: 48px;
        }

        .toggle-password {
          position: absolute;
          right: 16px;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .toggle-password:hover {
          color: #667eea;
        }

        .input-hint {
          font-size: 12px;
          color: #6b7280;
          margin-top: 6px;
          line-height: 1.4;
        }

        .password-strength {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .strength-bars {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .strength-bar {
          height: 4px;
          flex: 1;
          border-radius: 2px;
          background: #e5e7eb;
          transition: all 0.3s ease;
        }

        .submit-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
          margin: 24px 0 20px 0;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .form-footer {
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }

        .signin-link {
          color: #667eea;
          font-weight: 600;
          text-decoration: none;
          margin-left: 6px;
          transition: color 0.2s ease;
        }

        .signin-link:hover {
          color: #764ba2;
          text-decoration: underline;
        }

        /* Large Desktop */
        @media (min-width: 1200px) {
          .register-left {
            padding: 70px 60px;
          }

          .brand-section h1 {
            font-size: 38px;
          }
        }

        /* Tablet Landscape */
        @media (max-width: 1100px) {
          .register-wrapper {
            grid-template-columns: 1fr;
            max-width: 550px;
          }

          .register-left {
            display: none;
          }

          .mobile-brand {
            display: block;
            text-align: center;
            margin-bottom: 32px;
          }

          .mobile-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 12px;
          }

          .mobile-logo-icon {
            font-size: 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .mobile-logo-text {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .mobile-tagline {
            margin: 0;
            font-size: 14px;
            color: #6b7280;
          }

          .register-right {
            padding: 40px 30px;
          }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .register-container {
            padding: 16px;
          }

          .register-wrapper {
            border-radius: 20px;
          }

          .register-right {
            padding: 32px 24px;
          }

          .mobile-brand {
            margin-bottom: 24px;
          }

          .form-header {
            margin-bottom: 24px;
          }

          .form-header h2 {
            font-size: 24px;
          }

          .form-header p {
            font-size: 13px;
          }

          .form-group {
            margin-bottom: 18px;
          }

          .form-label {
            font-size: 13px;
          }

          .form-input {
            padding: 11px 14px 11px 44px;
            font-size: 13px;
          }

          .input-icon {
            left: 14px;
            width: 18px;
            height: 18px;
          }

          .toggle-password {
            right: 14px;
          }

          .input-hint {
            font-size: 11px;
          }

          .password-strength {
            font-size: 11px;
          }

          .submit-btn {
            padding: 12px 20px;
            font-size: 15px;
            margin: 20px 0 18px 0;
          }

          .form-footer {
            font-size: 13px;
          }

          .error-banner {
            padding: 12px 14px;
            font-size: 12px;
          }
        }

        /* Small Mobile */
        @media (max-width: 480px) {
          .register-container {
            padding: 12px;
          }

          .register-wrapper {
            border-radius: 16px;
          }

          .register-right {
            padding: 24px 20px;
            max-height: calc(100vh - 24px);
          }

          .mobile-brand {
            margin-bottom: 20px;
          }

          .mobile-logo-icon {
            font-size: 28px;
          }

          .mobile-logo-text {
            font-size: 20px;
          }

          .mobile-tagline {
            font-size: 13px;
          }

          .form-header {
            margin-bottom: 20px;
          }

          .form-header h2 {
            font-size: 22px;
          }

          .form-header p {
            font-size: 12px;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-input {
            padding: 10px 12px 10px 40px;
            font-size: 13px;
            border-radius: 10px;
          }

          .input-icon {
            left: 12px;
            width: 16px;
            height: 16px;
          }

          .toggle-password {
            right: 12px;
          }

          .toggle-password svg {
            width: 18px;
            height: 18px;
          }

          .input-hint {
            font-size: 10px;
          }

          .password-strength {
            font-size: 10px;
            gap: 10px;
          }

          .strength-bar {
            height: 3px;
          }

          .submit-btn {
            padding: 11px 18px;
            font-size: 14px;
            border-radius: 10px;
            margin: 18px 0 16px 0;
          }

          .submit-btn svg {
            width: 18px;
            height: 18px;
          }

          .error-banner {
            padding: 10px 12px;
            font-size: 11px;
            gap: 10px;
          }

          .error-banner svg {
            width: 18px;
            height: 18px;
          }
        }
      `}</style>
    </div>
  )
}