import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login({ email, password });
      // 로그인 성공 시 메인으로 이동
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient"></div>
      <form onSubmit={submit} className="auth-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h1 className="auth-title">Log In</h1>
        <input
          className="auth-form-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="auth-form-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="auth-error">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="auth-submit-btn"
        >
          {loading ? 'Logging in…' : 'Log In'}
        </button>
        <div className="auth-footer">
          Don't have an account? <Link className="auth-footer-link" to="/signup">Sign Up</Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
