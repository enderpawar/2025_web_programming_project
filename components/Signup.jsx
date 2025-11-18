import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import ThemeToggleButton from './ThemeToggleButton.jsx';

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.signup({ name, email, password });
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
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10 }}>
        <ThemeToggleButton />
      </div>
      <form onSubmit={submit} className="auth-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h1 className="auth-title">Sign Up</h1>
        <input
          className="auth-form-input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
          {loading ? 'Signing up…' : 'Create Account'}
        </button>
        <div className="auth-footer">
          Already have an account? <Link className="auth-footer-link" to="/login">Log In</Link>
        </div>
      </form>
    </div>
  );
};

export default Signup;
