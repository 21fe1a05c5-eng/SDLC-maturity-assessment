'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signup, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setSubmitting(true);
    const res = await signup(email, password);
    if (res && res.success === false) {
      setError(res.message || 'Error creating account');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '75vh', padding: '24px 0' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div className="text-center mb-4" style={{ marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', background: 'var(--green-primary)',
            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.4rem', fontWeight: 800, color: '#fff',
          }}>
            Σ
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
            Create account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Start your SDLC AI Maturity Assessment
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '32px' }}>
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert" style={{ fontSize: '0.88rem' }}>
              <span className="material-icons" style={{ fontSize: '1.2rem', verticalAlign: 'middle' }}>warning</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input type="email" id="email" className="form-control"
                placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input type="password" id="password" className="form-control"
                placeholder="Minimum 6 characters" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
              <input type="password" id="confirmPassword" className="form-control"
                placeholder="Repeat password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
            </div>

            <button type="submit" className="btn-premium w-100 justify-content-center"
              style={{ padding: '11px', fontSize: '0.95rem' }} disabled={submitting}>
              {submitting
                ? <><span className="spinner-border spinner-border-sm me-2" role="status" />Creating account…</>
                : 'Create account'}
            </button>
          </form>

          <p className="text-center mt-4 mb-0" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--green-bright)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
