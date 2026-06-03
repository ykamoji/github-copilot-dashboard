'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { API_BASE } from '@/api';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const endpoint = isLogin ? `${API_BASE}/api/auth/login` : `${API_BASE}/api/auth/register`;
      const body = isLogin 
        ? { email, password }
        : { name, email, password };
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const json = await res.json();
      
      if (res.ok && json.status === 'success') {
        login(json.token, json.user);
      } else {
        setError(json.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Is the API server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/demo`, {
        method: 'POST'
      });
      const json = await res.json();
      
      if (res.ok && json.status === 'success') {
        login(json.token, json.user);
      } else {
        setError('Demo login failed');
      }
    } catch (err) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-container">
      {/* Left Panel - Information */}
      <div className="landing-info-pane">
        <div className="landing-bg-image" style={{ backgroundImage: "url('/images/landing-bg.png')" }}></div>
        <div className="landing-info-overlay"></div>
        
        <div className="landing-info-content">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>Copilot Dashboard</span>
          </div>
          
          <div className="hero-section">
            <h1 className="hero-title">Unlock Insights into Your AI Pair Programmer</h1>
            <p className="hero-description">
              Analyze your GitHub Copilot usage, token distribution, and AI credit consumption across your organization. Understand how developers interact with Copilot to optimize your workflows and drive productivity.
            </p>
            
            <button 
              className="demo-login-btn primary-demo-btn" 
              onClick={handleDemoLogin} 
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
              </svg>
              View Demo Dashboard
            </button>
          </div>

          <div className="enterprise-credits-info glass-card">
            <div className="glass-card-header">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <h3>GitHub AI Credits for Enterprise & Business</h3>
            </div>
            <p>
              GitHub Copilot usage is billed based on AI credits consumed. 
              Advanced models like Claude 3.5 Sonnet may carry a different credit multiplier compared to standard GPT-4o models.
              Monitor your organization's daily consumption to ensure efficient resource allocation.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="landing-auth-pane">
        <div className="modern-auth-card">
          <div className="auth-header">
            <div className="auth-icon-wrapper">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
            <p>{isLogin ? 'Sign in to access your organization insights' : 'Register to start analyzing Copilot usage'}</p>
          </div>
          
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError(null); }}
              type="button"
            >
              Sign In
            </button>
            <button 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError(null); }}
              type="button"
            >
              Sign Up
            </button>
          </div>

          <button type="button" className="social-auth-btn" onClick={() => alert("GitHub OAuth not yet implemented")}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
          
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>
          
          <form className="auth-form animate-slide-up" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="input-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}
            
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="input-group">
              <label>Password</label>
              <div className="input-wrapper">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            {error && <div className="auth-error">{error}</div>}
            
            <button type="submit" className="modern-submit-btn" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
