/**
 * LoginPage — secure JWT authentication
 *
 * Email + password login with proper error handling.
 * Redirects to main app on success.
 */
import { useState } from 'react';
import { login } from '../api';

export default function LoginPage({ onLogin, sessionMessage = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>AEGIBIT</h1>
          <span>Flow Engine</span>
        </div>

        {/* Session expiry or other context message */}
        {sessionMessage && (
          <div className="login-error" role="alert" style={{ marginBottom: '0.75rem' }}>
            {sessionMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error" role="alert">{error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <span>Secure multi-tenant SaaS platform</span>
        </div>
      </div>
    </div>
  );
}
