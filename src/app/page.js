'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';

const AREAS = [
  { name: 'Requirements', color: '#da3633', desc: 'Idea exploration, elicitation, backlog refinement, impact analysis, and bidirectional traceability.' },
  { name: 'Architecture', color: '#1f6feb', desc: 'Architecture synthesizers, diagram generation, PR drift detection, compliance analysis, and FinOps.' },
  { name: 'Development', color: '#2ea043', desc: 'AI coding assistants, agentic pull requests, custom scripts via MCP, and dependency mapping.' },
  { name: 'Testing', color: '#d29922', desc: 'E2E workflow automation, synthetic data creation, defect classification, and test script generation.' },
  { name: 'Deployment', color: '#8957e5', desc: 'Automated release notes, capacity predictions, self-healing systems, and CI/CD quality gates.' },
];

const LEVELS = [
  { label: 'L0', title: 'Traditional', color: '#484f58', desc: 'Purely manual processes. No AI tools integrated.' },
  { label: 'L1', title: 'Assisted / Tool', color: '#1f6feb', desc: 'Basic inline autocomplete, chat assistants, and ad-hoc scripts.' },
  { label: 'L2', title: 'Delegated / Assistant', color: '#8957e5', desc: 'AI acts as a copilot — opening PRs and drafting test scripts under supervision.' },
  { label: 'L3', title: 'Supervised Agent', color: '#d29922', desc: 'AI agents orchestrate multi-step refactoring or test runs with human approval gates.' },
  { label: 'L4', title: 'Autonomous Workforce', color: '#2ea043', desc: 'Automated safety nets, autonomous task execution over days, and structured evals.' },
  { label: 'L5', title: 'Agentic Enterprise', color: '#3fb950', desc: 'Self-healing production, automatic drift remediation, fully autonomous workflows.' },
];

function getDomainDiagram(name) {
  switch (name) {
    case 'Requirements':
      return (
        <svg width="100%" height="100%" viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FFFFFF" />
          <rect x="25" y="20" width="190" height="100" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
          <rect x="40" y="35" width="60" height="8" rx="2" fill="#DA3633" fillOpacity="0.15" />
          <path d="M40 35H100" stroke="#DA3633" strokeWidth="2" strokeLinecap="round" />
          <circle cx="45" cy="55" r="5" fill="#E2E8F0" />
          <path d="M42 55L44 57L48 53" stroke="#DA3633" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="60" y="52" width="135" height="6" rx="2" fill="#E2E8F0" />
          <circle cx="45" cy="75" r="5" fill="#E2E8F0" />
          <path d="M42 75L44 77L48 73" stroke="#DA3633" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="60" y="72" width="120" height="6" rx="2" fill="#E2E8F0" />
          <circle cx="45" cy="95" r="5" fill="#E2E8F0" />
          <rect x="60" y="92" width="100" height="6" rx="2" fill="#E2E8F0" />
          <text x="140" y="42" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" fill="#DA3633">BACKLOG</text>
        </svg>
      );
    case 'Architecture':
      return (
        <svg width="100%" height="100%" viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FFFFFF" />
          <rect x="25" y="20" width="190" height="100" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
          <rect x="40" y="55" width="45" height="30" rx="4" fill="#1F6FEB" fillOpacity="0.1" stroke="#1F6FEB" strokeWidth="1.5" />
          <text x="62" y="73" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#1F6FEB" textAnchor="middle">API</text>
          <path d="M85 70H110" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M107 67L110 70L107 73" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="110" y="35" width="45" height="30" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
          <text x="132" y="53" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#64748B" textAnchor="middle">API GW</text>
          <rect x="110" y="75" width="45" height="30" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
          <text x="132" y="93" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#64748B" textAnchor="middle">Service</text>
          <path d="M155 50H175V60" stroke="#94A3B8" strokeWidth="1.5" />
          <path d="M155 90H175V80" stroke="#94A3B8" strokeWidth="1.5" />
          <rect x="165" y="60" width="30" height="20" rx="3" fill="#1F6FEB" fillOpacity="0.1" stroke="#1F6FEB" strokeWidth="1.5" />
          <text x="180" y="72" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="700" fill="#1F6FEB" textAnchor="middle">DB</text>
        </svg>
      );
    case 'Development':
      return (
        <svg width="100%" height="100%" viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FFFFFF" />
          <rect x="25" y="20" width="190" height="100" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
          <path d="M25 26C25 22.6863 27.6863 20 31 20H209C212.314 20 215 22.6863 215 26V35H25V26Z" fill="#E2E8F0" />
          <circle cx="35" cy="27" r="3" fill="#EF4444" />
          <circle cx="45" cy="27" r="3" fill="#F59E0B" />
          <circle cx="55" cy="27" r="3" fill="#10B981" />
          <text x="70" y="30" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="500" fill="#94A3B8">main.js</text>
          <path d="M45 50V110" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="45" cy="60" r="4" fill="#2EA043" stroke="#FFFFFF" strokeWidth="1.5" />
          <path d="M45 60C55 60 60 70 65 75V95C60 100 55 110 45 110" stroke="#2EA043" strokeWidth="2" strokeLinecap="round" />
          <circle cx="65" cy="85" r="4" fill="#2EA043" stroke="#FFFFFF" strokeWidth="1.5" />
          <rect x="85" y="50" width="100" height="6" rx="2" fill="#2EA043" fillOpacity="0.15" />
          <rect x="85" y="62" width="70" height="6" rx="2" fill="#E2E8F0" />
          <rect x="85" y="74" width="85" height="6" rx="2" fill="#2EA043" fillOpacity="0.15" />
          <rect x="85" y="86" width="115" height="6" rx="2" fill="#E2E8F0" />
          <rect x="85" y="98" width="50" height="6" rx="2" fill="#E2E8F0" />
        </svg>
      );
    case 'Testing':
      return (
        <svg width="100%" height="100%" viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FFFFFF" />
          <rect x="25" y="20" width="190" height="100" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
          <rect x="40" y="35" width="75" height="20" rx="4" fill="#D29922" fillOpacity="0.1" stroke="#D29922" strokeWidth="1.5" />
          <text x="77" y="47" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="700" fill="#D29922" textAnchor="middle">TEST PASSED</text>
          <circle cx="165" cy="55" r="20" stroke="#E2E8F0" strokeWidth="4" />
          <circle cx="165" cy="55" r="20" stroke="#D29922" strokeWidth="4" strokeDasharray="100 25" strokeDashoffset="25" />
          <text x="165" y="58" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="700" fill="#64748B" textAnchor="middle">92%</text>
          <rect x="40" y="65" width="45" height="18" rx="3" fill="#E2E8F0" />
          <circle cx="48" cy="74" r="4" fill="#10B981" />
          <text x="56" y="77" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="600" fill="#64748B">Unit</text>
          <rect x="90" y="65" width="45" height="18" rx="3" fill="#E2E8F0" />
          <circle cx="98" cy="74" r="4" fill="#10B981" />
          <text x="106" y="77" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="600" fill="#64748B">E2E</text>
          <rect x="40" y="90" width="45" height="18" rx="3" fill="#E2E8F0" />
          <circle cx="48" cy="99" r="4" fill="#EF4444" />
          <text x="56" y="102" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="600" fill="#64748B">Load</text>
          <rect x="90" y="90" width="45" height="18" rx="3" fill="#E2E8F0" />
          <circle cx="98" cy="99" r="4" fill="#10B981" />
          <text x="106" y="102" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="600" fill="#64748B">Sec</text>
        </svg>
      );
    case 'Deployment':
      return (
        <svg width="100%" height="100%" viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FFFFFF" />
          <rect x="25" y="20" width="190" height="100" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
          <rect x="50" y="75" width="60" height="30" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
          <rect x="60" y="82" width="40" height="4" rx="2" fill="#94A3B8" />
          <circle cx="63" cy="94" r="2" fill="#10B981" />
          <circle cx="71" cy="94" r="2" fill="#10B981" />
          <path d="M150 90C150 90 140 70 155 50C165 70 155 90 155 90" fill="#8957E5" />
          <path d="M160 90C160 90 170 70 155 50C145 70 155 90 155 90" fill="#8957E5" />
          <path d="M155 45L160 55H150L155 45Z" fill="#F59E0B" />
          <circle cx="155" cy="65" r="3" fill="#FFFFFF" />
          <path d="M135 45C135 39.4772 139.477 35 145 35C148.064 35 150.796 36.3777 152.617 38.5639C154.045 37.5878 155.772 37 157.632 37C161.737 37 165.176 39.8517 165.986 43.6261C166.476 43.2215 167.106 43 167.789 43C169.563 43 171 44.4373 171 46.2105C171 47.9838 169.563 49.4211 167.789 49.4211H135C135 49.4211 135 45 135 45Z" fill="#8957E5" fillOpacity="0.15" />
          <path d="M110 90H135" stroke="#8957E5" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M132 87L135 90L132 93" stroke="#8957E5" strokeWidth="1.5" strokeLinecap="round" />
          <text x="155" y="105" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="700" fill="#8957E5" textAnchor="middle">PROD DEPLOY</text>
        </svg>
      );
    default:
      return null;
  }
}

export default function Home() {
  const { user } = useAuth();
  const [questionCount, setQuestionCount] = useState(25);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/questions', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.questions) {
            setQuestionCount(data.questions.length);
          }
        }
      } catch (err) {
        console.error('Error fetching questions count:', err);
      }
    }
    fetchCount();
  }, []);

  return (
    <div className="landing-container">

      <section className="hero-section text-center" style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '80px 40px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '40px',
      }}>
        <div style={{
          position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)',
          width: '500px', height: '300px',
          background: 'radial-gradient(ellipse at center, rgba(26,127,55,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 3.8rem)',
          fontWeight: 800,
          fontFamily: 'var(--font-sans)',
          letterSpacing: '-0.04em',
          lineHeight: 1.15,
          marginBottom: '20px',
          color: 'var(--text-primary)',
        }}>
          Know Your SDLC AI Maturity Level
        </h1>

        <p style={{
          maxWidth: '800px', margin: '20px auto 30px',
          color: 'var(--text-secondary)',
          fontSize: '18px', lineHeight: 1.7,
        }}>
          This system audits your engineering workflows across <strong style={{ color: 'var(--text-primary)' }}>{questionCount}</strong> targeted questions, scores AI capability across 5 SDLC domains, and delivers precise recommendations powered by AI.
        </p>

        <div className="d-flex justify-content-center gap-3 flex-wrap">
          {user ? (
            <Link href={user.role === 'admin' || user.email === 'admin@sdlc.com' ? '/admin' : '/dashboard'} className="btn-primary-action">
              Explore Now
            </Link>
          ) : (
            <>
              <Link href="/signup" className="btn-primary-action">
                Get Started →
              </Link>
              <Link href="/login" className="btn-secondary-action">
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="stats-row d-flex justify-content-center gap-5 flex-wrap" style={{
        marginBottom: '40px',
        padding: '20px 0',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div className="text-center" style={{ minWidth: '120px' }}>
          <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', display: 'block', letterSpacing: '-0.03em' }}>
            {questionCount}
          </strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Questions
          </div>
        </div>
        <div className="text-center" style={{ minWidth: '120px' }}>
          <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', display: 'block', letterSpacing: '-0.03em' }}>
            5
          </strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            SDLC Domains
          </div>
        </div>
        <div className="text-center" style={{ minWidth: '120px' }}>
          <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', display: 'block', letterSpacing: '-0.03em' }}>
            L0 – L5
          </strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Maturity Scale
          </div>
        </div>
        <div className="text-center" style={{ minWidth: '120px' }}>
          <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', display: 'block', letterSpacing: '-0.03em' }}>
            AI
          </strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Powered Analysis
          </div>
        </div>
      </section>

      <section id="domains" className="domains-section" style={{ marginBottom: '40px' }}>
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="divider flex-grow-1" />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            5 Core Assessment Domains
          </span>
          <div className="divider flex-grow-1" />
        </div>

        <div className="row g-3">
          {AREAS.map((area, idx) => (
            <div className="col-lg col-md-4 col-sm-6 col-12" key={idx}>
              <div
                className="domain-card h-100"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  cursor: 'default',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={e => {
                  const container = e.currentTarget.querySelector('.domain-card-img-container');
                  if (container) container.style.transform = 'scale(1.03)';
                }}
                onMouseLeave={e => {
                  const container = e.currentTarget.querySelector('.domain-card-img-container');
                  if (container) container.style.transform = 'scale(1.0)';
                }}
              >
                <div
                  className="domain-card-img-container"
                  style={{
                    width: '100%',
                    height: '140px',
                    overflow: 'hidden',
                    borderBottom: `2px solid ${area.color}`,
                    position: 'relative',
                    background: '#FFFFFF',
                    transition: 'transform 0.3s ease',
                  }}
                >
                  {getDomainDiagram(area.name)}
                </div>
                <div style={{ padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                    {area.name}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, flexGrow: 1 }}>
                    {area.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="maturity" className="levels-section" style={{ marginBottom: '40px' }}>
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="divider flex-grow-1" />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            AI Maturity Scale
          </span>
          <div className="divider flex-grow-1" />
        </div>

        <div className="row g-3">
          {LEVELS.map((lvl, idx) => (
            <div className="col-lg-4 col-md-6 col-12" key={idx}>
              <div className="level-card" style={{ borderLeft: `3px solid ${lvl.color}`, padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                    color: lvl.color, background: `${lvl.color}18`,
                    border: `1px solid ${lvl.color}30`, borderRadius: '4px',
                    padding: '2px 8px', letterSpacing: '0.04em',
                  }}>
                    {lvl.label}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {lvl.title}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {lvl.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" style={{ marginBottom: '40px' }}>
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="divider flex-grow-1" />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            About the System
          </span>
          <div className="divider flex-grow-1" />
        </div>

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
        }}>
          <div className="row g-4">
            <div className="col-md-4">
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '12px' }}><span className="material-icons" style={{ fontSize: '2.5rem', color: 'var(--green-bright)' }}>bar_chart</span></div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Comprehensive Evaluation
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Analyze engineering workflows across 5 core SDLC domains to pinpoint organizational bottlenecks and developer experience bottlenecks.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '12px' }}><span className="material-icons" style={{ fontSize: '2.5rem', color: 'var(--green-bright)' }}>trending_up</span></div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  AI Maturity Mapping
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Graph your technical capability across 6 progressive maturity levels (L0 to L5), showing how your team can adopt advanced agentic engineering.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '12px' }}><span className="material-icons" style={{ fontSize: '2.5rem', color: 'var(--green-bright)' }}>track_changes</span></div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Actionable Roadmap
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Instantly generate a tailored, professional PDF audit report complete with target recommendations, tool integrations, and direct agent remarks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
