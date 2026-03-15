import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { T, FONTS } from '../utils/theme';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('maadiou@lscmltd.com');
  const [password, setPassword] = useState('clear2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try { await login(email, password); } 
    catch (err) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontFamily: FONTS.body, fontSize: 14, outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, padding: 40, background: T.surface, borderRadius: 16, border: `1px solid ${T.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 800, color: T.gold }}>≡LSCM≡</div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text, marginTop: 4 }}>CLEAR ERP</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, marginTop: 4 }}>v4.2 — Consolidated Logistics ERP</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, display: 'block', marginBottom: 6 }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          </div>
          {error && <div style={{ color: T.red, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: 8, border: 'none',
            background: `linear-gradient(135deg, ${T.gold}, ${T.orange})`,
            color: T.bg, fontFamily: FONTS.display, fontSize: 14, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Connecting...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
