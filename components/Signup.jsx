import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

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
    <div className="min-h-screen bg-[#0f2135] text-white grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-[#0e1c2d] rounded-xl border border-white/10 p-6 space-y-4">
        <h1 className="text-xl font-semibold">Sign Up</h1>
        <input
          className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none border border-white/10"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none border border-white/10"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none border border-white/10"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-3 py-2 rounded-md bg-teal-500 hover:bg-teal-400 disabled:bg-teal-800 text-black font-semibold"
        >
          {loading ? 'Signing up…' : 'Create Account'}
        </button>
        <div className="text-sm text-white/70">Already have an account? <Link className="text-sky-400 hover:underline" to="/login">Log In</Link></div>
      </form>
    </div>
  );
};

export default Signup;
