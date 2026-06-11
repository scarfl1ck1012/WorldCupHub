import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, signUp, supabaseConfigured } from '../../services/supabase';
import './Auth.css';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!supabaseConfigured) {
        setError('Supabase not configured. See .env.example');
        return;
      }
      if (mode === 'signup') {
        const { error: err } = await signUp(email, password, displayName);
        if (err) throw err;
        setError('Check your email to confirm your account.');
      } else {
        const { error: err } = await signIn(email, password);
        if (err) throw err;
        navigate('/profile');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container auth-page">
      <Link to="/profile" className="back-link">← Back</Link>
      <div className="auth-card glass-card">
        <h1>{mode === 'signin' ? 'Sign In' : 'Create Account'}</h1>
        <p>Join the prediction leaderboard</p>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          className="auth-toggle"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
