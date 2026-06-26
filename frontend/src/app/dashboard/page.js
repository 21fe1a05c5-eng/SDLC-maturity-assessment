'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';

import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'profile'
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const supported = !!(
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled
      );
      setFullscreenSupported(supported);
    }
  }, []);

  const getDisplayName = () => {
    const rawName = user?.name || user?.email?.split('@')[0] || '';
    if (!rawName) return '';
    return rawName.charAt(0).toUpperCase() + rawName.slice(1);
  };

  const handleNewAssessment = (useFullscreen) => {
    setShowFullscreenModal(false);
    if (useFullscreen) {
      const el = document.documentElement;
      try {
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          el.msRequestFullscreen();
        }
      } catch (e) {
        console.warn('Fullscreen denied or failed', e);
      }
    }
    router.push('/assessment');
  };

  const startNewAssessmentFlow = () => {
    if (fullscreenSupported) {
      setShowFullscreenModal(true);
    } else {
      router.push('/assessment');
    }
  };
// ... (rest of imports/hooks remain)
// We will replace the return block below:

  // Profile Form States
  const [profileName, setProfileName] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (user) {
      if (user.role === 'admin' || user.email === 'admin@sdlc.com') {
        router.push('/admin');
      } else {
        fetchDashboardData();
        setProfileName(user.name || '');
        setProfileGender(user.gender || '');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const handleSwitchToProfile = () => setActiveTab('profile');
    const handleSwitchToDashboard = () => setActiveTab('dashboard');

    window.addEventListener('switch-tab-profile', handleSwitchToProfile);
    window.addEventListener('switch-tab-dashboard', handleSwitchToDashboard);

    // Initial check for query parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'profile') {
        setActiveTab('profile');
      }
    }

    return () => {
      window.removeEventListener('switch-tab-profile', handleSwitchToProfile);
      window.removeEventListener('switch-tab-dashboard', handleSwitchToDashboard);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assessments');
      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, gender: profileGender })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save profile');
      setProfileSuccess(true);
      await refreshUser();
    } catch (err) {
      setProfileError(err.message || 'Error updating profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const scoreBadgeClass = (score) => {
    if (!score && score !== 0) return 'tuf-badge tuf-badge-gray';
    if (score >= 70) return 'tuf-badge tuf-badge-green';
    if (score >= 40) return 'tuf-badge tuf-badge-yellow';
    return 'tuf-badge tuf-badge-red';
  };

  if (authLoading || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border mb-3" role="status"><span className="visually-hidden">Loading...</span></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const getMaturityLevel = (scorePercent) => {
    if (scorePercent === null || scorePercent === undefined) return 'N/A';
    const score = (scorePercent / 100) * 5;
    if (score >= 4.5) return 'L5';
    if (score >= 3.5) return 'L4';
    if (score >= 2.5) return 'L3';
    if (score >= 1.5) return 'L2';
    if (score >= 0.5) return 'L1';
    return 'L0';
  };

  const avgScore = assessments.length > 0
    ? Math.round(assessments.reduce((s, a) => s + (a.overallScore || 0), 0) / assessments.length)
    : 0;

  const totalPages = Math.ceil(assessments.length / itemsPerPage);

  return (
    <>
      {/* Fullscreen permission modal */}
      {showFullscreenModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: '16px', padding: '36px 40px', maxWidth: '440px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          }}>
            <div style={{ marginBottom: '16px', textAlign: 'center' }}><span className="material-icons" style={{ fontSize: '3.5rem', color: 'var(--green-bright)' }}>fullscreen</span></div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', textAlign: 'center' }}>
              Start in Fullscreen?
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px', textAlign: 'center' }}>
              For the best assessment experience — distraction-free, focused, and exam-style — we recommend starting in fullscreen mode.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleNewAssessment(true)}
                className="btn-premium w-100 justify-content-center"
                style={{ padding: '12px', fontSize: '0.95rem' }}
              >
                Start Fullscreen
              </button>
              <button
                onClick={() => setShowFullscreenModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', padding: '4px', marginTop: '4px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fade-in" style={{ paddingTop: '8px' }}>

        {/* ─── Header ─── */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-5">
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--green-bright)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>{assessments.length > 0 ? 'Welcome back, ' : 'Welcome, '}{getDisplayName()}</span>
              <span className="material-icons" style={{ fontSize: '1.6rem', color: 'var(--green-bright)', verticalAlign: 'middle' }}>waving_hand</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
              {assessments.length > 0
                ? 'Track your SDLC AI maturity progress, view past assessments, and monitor improvement over time.'
                : "Get started by taking your first SDLC AI Maturity Assessment to understand your organization's current AI maturity level."}
            </p>
          </div>
          <button onClick={startNewAssessmentFlow} className="btn-premium" style={{ padding: '10px 22px', whiteSpace: 'nowrap' }}>
            ＋ New Assessment
          </button>
        </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* ─── Stats Row ─── */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Total Audits', value: assessments.length, suffix: '' },
              { label: 'Avg Maturity Level', value: getMaturityLevel(avgScore), suffix: '' },
            ].map((stat, i) => (
              <div className="col-md-6 col-12" key={i}>
                <div className="glass-panel" style={{ padding: '20px 24px' }}>
                  <div className="section-title mb-1">{stat.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green-bright)', letterSpacing: '-0.04em' }}>
                    {stat.value}{stat.suffix}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Assessment History ─── */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Assessment Reports</h2>
              {assessments.length > 0 && (
                <button onClick={startNewAssessmentFlow} className="btn-premium-outline" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                  + New
                </button>
              )}
            </div>

            {assessments.length === 0 ? (
              <div className="text-center" style={{ padding: '48px 24px' }}>
                <div style={{ marginBottom: '12px', opacity: 0.5 }}><span className="material-icons text-muted" style={{ fontSize: '3rem' }}>assignment_turned_in</span></div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  No assessments yet. Start your first audit now.
                </p>
                <button onClick={startNewAssessmentFlow} className="btn-premium">
                  Run First Audit →
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th>Audit Date</th>
                      <th className="text-center">Maturity Level</th>
                      <th className="text-end">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((a) => (
                      <tr key={a.id}>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {new Date(a.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="text-center">
                          <span className={scoreBadgeClass(a.overallScore)}>
                            {a.overallScore != null ? getMaturityLevel(a.overallScore) : 'N/A'}
                          </span>
                        </td>
                        <td className="text-end">
                          <Link href={`/report/${a.id}`} className="btn-premium-outline" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '24px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-subtle)'
                  }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="btn-premium-outline"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ← Previous
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="btn-premium-outline"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ─── Profile Settings Form ─── */
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8 col-12">
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h3 className="h5 m-0" style={{ color: 'var(--text-primary)' }}>User Profile Settings</h3>
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    window.history.pushState(null, '', '/dashboard');
                  }}
                  className="btn-premium-outline"
                  style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                >
                  ← Back to Dashboard
                </button>
              </div>
              
              {profileSuccess && (
                <div className="alert alert-success d-flex align-items-center gap-2 mb-4" role="alert" style={{ fontSize: '0.88rem' }}>
                  <span className="material-icons" style={{ fontSize: '1.2rem', verticalAlign: 'middle' }}>check_circle</span> Profile updated successfully!
                </div>
              )}

              {profileError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert" style={{ fontSize: '0.88rem' }}>
                  <span className="material-icons" style={{ fontSize: '1.2rem', verticalAlign: 'middle' }}>warning</span> {profileError}
                </div>
              )}

              <form onSubmit={handleProfileSave}>
                <div className="mb-3">
                  <label className="form-label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={user?.email || ''}
                    disabled
                    style={{ opacity: 0.6 }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Gender</label>
                  <select
                    className="form-select"
                    value={profileGender}
                    onChange={e => setProfileGender(e.target.value)}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn-premium w-100 justify-content-center"
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
}
