# 1:1 Complete Replication Code

Below is the complete source code for all files required to exactly replicate the Assessment Report Page.

## File: `src/app/report/[id]/page.js`

```javascript
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../AuthContext';
import { useTheme } from '../../ThemeContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PentagonDiagram from '../../components/PentagonDiagram';



// ─── Markdown renderer ───────────────────────────────────────────
function renderInline(text) {
  const parts = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);
    const first = boldMatch && codeMatch
      ? boldMatch.index <= codeMatch.index ? 'bold' : 'code'
      : boldMatch ? 'bold' : codeMatch ? 'code' : null;
    if (first === 'bold') {
      if (boldMatch.index > 0) parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
      parts.push(<strong key={key++} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else if (first === 'code') {
      if (codeMatch.index > 0) parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index)}</span>);
      parts.push(<code key={key++} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.85em', color: 'var(--green-bright)', fontFamily: 'var(--font-mono)' }}>{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      remaining = '';
    }
  }
  return parts;
}

function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## '))   return <h2 key={i} style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '22px', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>{renderInline(line.slice(3))}</h2>;
    if (line.startsWith('### '))  return <h3 key={i} style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--green-bright)', marginTop: '16px', marginBottom: '4px' }}>{renderInline(line.slice(4))}</h3>;
    if (line.startsWith('#### ')) return <h4 key={i} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px', marginBottom: '4px' }}>{renderInline(line.slice(5))}</h4>;
    if (line.startsWith('- ') || line.startsWith('* ')) return (
      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '5px' }}>
        <span style={{ color: 'var(--green-primary)', flexShrink: 0 }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{renderInline(line.slice(2))}</span>
      </div>
    );
    if (line.startsWith('> ')) return <blockquote key={i} style={{ borderLeft: '3px solid var(--green-primary)', padding: '8px 14px', margin: '10px 0', background: 'var(--green-glow-sm)', borderRadius: '0 6px 6px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{renderInline(line.slice(2))}</blockquote>;
    if (line.startsWith('---')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '14px 0' }} />;
    if (line.trim() === '') return <div key={i} style={{ height: '4px' }} />;
    return <p key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '4px', fontSize: '0.9rem' }}>{renderInline(line)}</p>;
  });
}

const AREA_LABELS = ['Requirements', 'Architecture', 'Development', 'Testing', 'Deployment'];
const AREA_COLORS = ['#2ea043', '#1f6feb', '#8957e5', '#d29922', '#da3633'];

function getLevelName(score) {
  if (score >= 4.5) return 'L5 · Agentic';
  if (score >= 3.5) return 'L4 · Autonomous';
  if (score >= 2.5) return 'L3 · Supervised';
  if (score >= 1.5) return 'L2 · Delegated';
  if (score >= 0.5) return 'L1 · Assisted';
  return 'L0 · Traditional';
}

function getLevelNumber(score) {
  if (score >= 4.5) return 5;
  if (score >= 3.5) return 4;
  if (score >= 2.5) return 3;
  if (score >= 1.5) return 2;
  if (score >= 0.5) return 1;
  return 0;
}

function getPercentageColor(pct) {
  if (pct >= 80) return '#10b981'; // Green
  if (pct >= 60) return '#6366f1'; // Indigo
  if (pct >= 40) return '#06b6d4'; // Cyan
  if (pct >= 20) return '#f59e0b'; // Amber
  return '#ef4444';                // Red
}

export default function Report({ params }) {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingRemarks, setGeneratingRemarks] = useState(false);
  const [remarksError, setRemarksError] = useState(null);
  const [rating, setRating] = useState(0);       // 0 = no selection
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comments, setComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const fetchingReportId = useRef(null);
  const activeRemarksId = useRef(null);
  const dashboardRef = useRef(null);
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (user && id) fetchReport();
  }, [user, id, authLoading, router]);

  const fetchReport = async () => {
    if (fetchingReportId.current === id) return;
    fetchingReportId.current = id;
    try {
      setLoading(true);
      // Fetch assessment + questions in parallel
      const [res, qRes] = await Promise.all([
        fetch(`/api/assessments/${id}`),
        fetch('/api/questions')
      ]);
      if (!res.ok) throw new Error('Report not found');
      const [data, qData] = await Promise.all([res.json(), qRes.json()]);
      setAssessment(data.assessment);
      setQuestions(qData.questions || []);
      if (data.assessment.feedback) {
        setFeedbackSubmitted(true);
        setRating(data.assessment.feedback.rating || 0);
        setComments(data.assessment.feedback.comments || '');
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
      fetchingReportId.current = null;
    }
  };

  useEffect(() => {
    if (!assessment || activeRemarksId.current === assessment.id) return;
    const needsRemarks = !assessment.remarks || assessment.remarks === 'null' || assessment.remarks.trim() === '';
    if (needsRemarks) {
      activeRemarksId.current = assessment.id;
      generateRemarks();
    }
  }, [assessment]);

  useEffect(() => {
    if (selectedDomain) {
      const timer = setTimeout(() => {
        const element = dashboardRef.current;
        if (element) {
          const elementPosition = element.getBoundingClientRect().top + window.scrollY;
          const targetY = elementPosition - 84;
          const startY = window.scrollY;
          const difference = targetY - startY;
          const startTime = performance.now();
          const duration = 800; // 800ms duration for an ultra-smooth fluid transition

          const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
          };

          const animateScroll = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = easeInOutCubic(progress);
            window.scrollTo(0, startY + difference * ease);
            if (progress < 1) {
              requestAnimationFrame(animateScroll);
            }
          };

          requestAnimationFrame(animateScroll);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedDomain]);

  const generateRemarks = async () => {
    if (generatingRemarks) return;
    setGeneratingRemarks(true);
    setRemarksError(null);
    try {
      const res = await fetch('/api/remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: assessment.scores, answers: assessment.answers }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Remarks generation failed');
      }
      
      const provider = res.headers.get('x-remarks-provider') || 'AI';
      setAssessment(prev => ({ ...prev, remarksProvider: provider, remarks: '' }));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let completeText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        completeText += chunk;
        setAssessment(prev => ({ ...prev, remarks: completeText }));
      }

      await fetch(`/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: completeText, provider: provider }),
      });
    } catch (err) {
      console.error('Remarks error:', err);
      activeRemarksId.current = null;
      setRemarksError(err.message || 'AI analysis failed. Click Retry to try again.');
    } finally {
      setGeneratingRemarks(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { alert('Please select a star rating before submitting.'); return; }
    setSubmittingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: id, rating, comments })
      });
      if (res.ok) setFeedbackSubmitted(true);
      else { const d = await res.json(); throw new Error(d.message); }
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border mb-3" role="status"><span className="visually-hidden">Loading…</span></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading report…</p>
        </div>
      </div>
    );
  }
  if (!assessment) return null;

  // ── Re-compute area scores live from stored answers + current question metadata ──
  // This ensures the correct divisor (total questions per area) is always used,
  // regardless of when the assessment was originally saved.
  const areaScores = AREA_LABELS.map(area => {
    if (questions.length > 0) {
      const areaQIds = questions
        .filter(q => q.area === area)
        .map(q => String(q.id));
      const answered = areaQIds
        .map(id => assessment.answers?.[id])
        .filter(ans => ans != null && ans.level !== null && ans.level !== undefined)
        .map(ans => parseInt(ans.level))
        .filter(v => !isNaN(v));
      return areaQIds.length > 0
        ? answered.reduce((a, b) => a + b, 0) / areaQIds.length
        : 0;
    }
    // Fallback: use stored area score if questions not yet loaded
    return assessment.scores[area] || 0;
  });

  const categoryScores = {
    'Requirements': areaScores[0],
    'Architecture': areaScores[1],
    'Development': areaScores[2],
    'Testing': areaScores[3],
    'Deployment': areaScores[4]
  };

  // Area question counts (for display in cards)
  const areaQCounts = AREA_LABELS.map(area =>
    questions.filter(q => q.area === area).length
  );

  // Re-compute overall score as level score from live area scores
  const allAnsweredLevels = questions.length > 0
    ? Object.entries(assessment.answers || {})
        .map(([, ans]) => ans?.level !== null && ans?.level !== undefined ? parseInt(ans.level) : null)
        .filter(v => v !== null && !isNaN(v))
    : [];

  const avgLevel = questions.length > 0
    ? (allAnsweredLevels.reduce((a, b) => a + b, 0) / questions.length)
    : (assessment.overallScore != null ? (assessment.overallScore / 100) * 5 : 0);

  // Custom rounding rules:
  // - If decimal part is < 0.25 -> floor
  // - If decimal part is > 0.75 -> ceil
  // - If decimal part is between 0.25 and 0.75 -> round to 0.5
  const integerPart = Math.floor(avgLevel);
  const decimalPart = avgLevel - integerPart;
  let maturityLevelScore;
  if (decimalPart < 0.25) {
    maturityLevelScore = integerPart;
  } else if (decimalPart > 0.75) {
    maturityLevelScore = integerPart + 1;
  } else {
    maturityLevelScore = integerPart + 0.5;
  }

  const scoreClass = maturityLevelScore >= 3.5 ? 'green' : maturityLevelScore >= 2.0 ? 'yellow' : 'red';
  const scoreLabel = maturityLevelScore >= 3.5 ? 'High Maturity' : maturityLevelScore >= 2.0 ? 'Medium Maturity' : 'Low Maturity';

  // Calculate additional metrics for UI rendering
  const uniqueTools = assessment
    ? Array.from(new Set(
        Object.values(assessment.answers || {})
          .flatMap(ans => {
            if (ans?.toolsUsed && Array.isArray(ans.toolsUsed)) {
              return ans.toolsUsed.filter(Boolean);
            }
            if (ans?.toolsUsed && typeof ans.toolsUsed === 'string' && ans.toolsUsed.trim()) {
              return [ans.toolsUsed.trim()];
            }
            return [];
          })
      ))
    : [];

  let toolCoveredTasksCount = 0;
  const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const strengths = [];
  const gaps = [];

  if (assessment && questions.length > 0) {
    questions.forEach(q => {
      const ans = assessment.answers?.[q.id] || assessment.answers?.[String(q.id)];
      const level = ans?.level != null ? parseInt(ans.level) : 0;
      distribution[level]++;
      
      const hasTools = ans && (
        (Array.isArray(ans.toolsUsed) && ans.toolsUsed.filter(Boolean).length > 0) ||
        (typeof ans.toolsUsed === 'string' && ans.toolsUsed.trim() !== '')
      );
      if (hasTools) {
        toolCoveredTasksCount++;
      }

      const item = {
        area: q.area,
        subArea: q.subArea,
        practice: q.practice,
        level: level
      };
      if (level >= 3) strengths.push(item);
      if (level <= 1) gaps.push(item);
    });
    strengths.sort((a, b) => b.level - a.level);
    gaps.sort((a, b) => a.level - b.level);
  }

  const toolCoveragePercent = questions.length > 0
    ? Math.round((toolCoveredTasksCount / questions.length) * 100)
    : 0;



  // ─── Stars (dark-mode friendly) ──────────────────────────────────
  const displayRating = hoveredStar || rating;

  return (
    <div className="fade-in" style={{ paddingTop: '8px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        body {
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%) !important;
        }
        footer {
          background: transparent !important;
          border-top: none !important;
        }
        @media print {
          nav, .navbar, .navbar-premium, footer, button, .btn, .btn-premium, .btn-premium-outline, .btn-group, form,
          a[href*="dashboard"], a[href*="admin"],
          .feedback-section,
          .form-control, textarea,
          .d-print-none {
            display: none !important;
          }
          /* Hide diagram maps, charts, and graphics container */
          .pentagon-container-wrap, .pentagon-container, svg,
          .d-print-none-graphic {
            display: none !important;
          }
          body, html, .fade-in, main, .container, .row, .col-12, .col-lg-6, .glass-panel {
            background: #ffffff !important;
            color: #1e293b !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            float: none !important;
          }
          .d-print-block {
            display: block !important;
          }
          @page {
            margin: 15mm 20mm 20mm 20mm;
          }
          .print-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-remarks-container h2 {
            font-size: 11pt !important;
            margin-top: 15px !important;
            margin-bottom: 6px !important;
            color: #0f172a !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding-bottom: 3px !important;
          }
          .print-remarks-container h3 {
            font-size: 10pt !important;
            margin-top: 12px !important;
            margin-bottom: 4px !important;
            color: #059669 !important;
          }
          .print-remarks-container blockquote {
            border-left: 3px solid #059669 !important;
            background-color: #f0fdf4 !important;
            padding: 6px 12px !important;
            margin: 8px 0 !important;
            font-size: 9pt !important;
          }
          .print-remarks-container p, .print-remarks-container li {
            font-size: 9.5pt !important;
            color: #334155 !important;
          }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      {/* ─── Beautiful Print-Only Report ─── */}
      <div className="d-none d-print-block">
        {/* Cover Header */}
        <div style={{ borderBottom: '3px solid #10b981', paddingBottom: '16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
            SDLC AI Capability &amp; Maturity Audit
          </div>
          <h1 style={{ fontSize: '24pt', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {assessment.projectName}
          </h1>
          <div style={{ display: 'flex', gap: '20px', fontSize: '9.5pt', color: '#475569', fontWeight: 500 }}>
            <span><strong>Date Audited:</strong> {new Date(assessment.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span><strong>Assessment ID:</strong> <code style={{ fontSize: '8.5pt', color: '#0f172a' }}>{id}</code></span>
          </div>
        </div>

        {/* Executive Summary Panel */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
          {/* Overall Maturity Card */}
          <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Overall Maturity Score
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '26pt', fontWeight: 800, color: '#059669' }}>L{getLevelNumber(avgLevel)}.0</span>
              <span style={{ fontSize: '12pt', fontWeight: 700, color: '#1e293b' }}>· {getLevelName(avgLevel).split(' · ')[1]}</span>
            </div>
            <p style={{ fontSize: '9pt', color: '#475569', margin: '8px 0 0 0', lineHeight: 1.4 }}>
              Determined by auditing capability across all 5 core software engineering lifecycle stages, measuring tool diversity, tasks automated, and human-in-the-loop governance.
            </p>
          </div>

          {/* AI Tool Metrics Card */}
          <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              AI Tool Integration &amp; Adoption
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
              <div>
                <div style={{ fontSize: '22pt', fontWeight: 800, color: '#0969da' }}>{toolCoveragePercent}%</div>
                <div style={{ fontSize: '8pt', color: '#475569', fontWeight: 600 }}>Tool Coverage</div>
              </div>
              <div>
                <div style={{ fontSize: '22pt', fontWeight: 800, color: '#ec4899' }}>{uniqueTools.length}</div>
                <div style={{ fontSize: '8pt', color: '#475569', fontWeight: 600 }}>Unique Tools Active</div>
              </div>
            </div>
            {uniqueTools.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '8pt', fontWeight: 700, color: '#475569' }}>Audited Tools: </span>
                <span style={{ fontSize: '8.5pt', color: '#1e293b', fontStyle: 'italic' }}>{uniqueTools.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Stages Table */}
        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
            Maturity Breakdown by SDLC Stage
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '9pt', fontWeight: 700, color: '#0f172a' }}>SDLC Stage</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '9pt', fontWeight: 700, color: '#0f172a', width: '120px' }}>Score</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '9pt', fontWeight: 700, color: '#0f172a' }}>Maturity Level</th>
              </tr>
            </thead>
            <tbody>
              {AREA_LABELS.map((area, idx) => {
                const score = categoryScores[area];
                const scoreNum = score != null ? score : 0;
                const lvlName = getLevelName(scoreNum);
                const colors = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']; // Requirements, Architecture, Development, Testing, Deployment
                const color = colors[idx] || '#6366f1';
                return (
                  <tr key={area} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', fontSize: '9pt', color: '#0f172a' }}>
                      <strong>{area}</strong>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: '9pt', color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                      L{getLevelNumber(scoreNum)}.0
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: '9pt' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '7.5pt',
                        fontWeight: 700,
                        backgroundColor: `${color}15`,
                        color: color,
                        border: `1px solid ${color}35`
                      }}>
                        {lvlName.split(' · ')[1]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Strengths & Gaps */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }} className="print-avoid-break">
          {/* Key Strengths */}
          <div style={{ flex: 1, border: '1px solid #b9f6ca', borderLeft: '4px solid #10b981', borderRadius: '0 8px 8px 0', padding: '14px', backgroundColor: '#f1fbf4' }}>
            <div style={{ fontSize: '9.5pt', fontWeight: 700, color: '#1b5e20', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>✓</span> Key Strengths (Top Practices)
            </div>
            {strengths.length > 0 ? (
              <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '8.5pt', color: '#2e7d32', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {strengths.slice(0, 4).map((s, idx) => (
                  <li key={idx}>
                    <strong>{s.area} / {s.subArea}</strong>: Achieved L{s.level} in <em>{s.practice}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#475569', fontSize: '8.5pt', margin: 0 }}>No practices met the Supervised (L3) threshold.</p>
            )}
          </div>

          {/* Priority Gaps */}
          <div style={{ flex: 1, border: '1px solid #ffcdd2', borderLeft: '4px solid #d32f2f', borderRadius: '0 8px 8px 0', padding: '14px', backgroundColor: '#ffebee' }}>
            <div style={{ fontSize: '9.5pt', fontWeight: 700, color: '#c62828', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>⚠</span> Priority Gaps (Needs Attention)
            </div>
            {gaps.length > 0 ? (
              <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '8.5pt', color: '#c62828', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {gaps.slice(0, 4).map((g, idx) => (
                  <li key={idx}>
                    <strong>{g.area} / {g.subArea}</strong>: Currently at L{g.level} for <em>{g.practice}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#475569', fontSize: '8.5pt', margin: 0 }}>No critical gaps identified.</p>
            )}
          </div>
        </div>

        {/* Detailed Remarks section - Forced page break before this to make it look clean */}
        {assessment.remarks && (
          <div style={{ pageBreakBefore: 'always', paddingTop: '15px' }}>
            <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '14pt', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                AI Agent Capability Assessment &amp; Recommendations
              </h2>
            </div>
            <div style={{ fontSize: '9.5pt', lineHeight: 1.6, color: '#334155' }} className="print-remarks-container">
              {renderMarkdown(assessment.remarks)}
            </div>
          </div>
        )}
      </div>

      {/* ─── Header ─── */}
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2 d-print-none">
        <div>
          <Link href={user?.role === 'admin' || user?.email === 'admin@sdlc.com' ? '/admin' : '/dashboard'} style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }} className="d-print-none">
            ← Back to {user?.role === 'admin' || user?.email === 'admin@sdlc.com' ? 'Admin Console' : 'Dashboard'}
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>
            {assessment.projectName}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
            Audited {new Date(assessment.createdAt).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-premium d-print-none"
          style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Report
        </button>
      </div>

      {/* ─── Pentagon Diagram Map ─── */}
      <div className="mb-4 d-print-none-graphic" style={{ display: 'flex', justifyContent: 'center', padding: '0', overflow: 'hidden' }}>
        <PentagonDiagram
          overallScore={avgLevel}
          categoryScores={categoryScores}
          selectedDomain={selectedDomain}
          onNodeClick={(name) => {
            setSelectedDomain(prev => prev === name ? null : name);
          }}
        />
      </div>

      {/* ─── Maturity Breakdown & Insights Dashboard ─── */}
      <div ref={dashboardRef} className="d-print-none" style={{ scrollMarginTop: '84px' }}>
        {assessment && questions.length > 0 && (() => {
        const NODE_COLORS = {
          Architecture: '#ec4899',
          Requirements: '#6366f1',
          Development: '#06b6d4',
          Deployment: '#f59e0b',
          Testing: '#10b981'
        };

        // Compute active data — domain-filtered or overall
        const activeQs   = selectedDomain ? questions.filter(q => q.area === selectedDomain) : questions;
        const totalQs    = activeQs.length;
        const activeDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let activeToolCovered = 0;
        const activeToolSet   = new Set();
        const activeStrengths = [];
        const activeGaps      = [];

        activeQs.forEach(q => {
          const ans   = assessment.answers?.[q.id] || assessment.answers?.[String(q.id)];
          const level = ans?.level != null ? parseInt(ans.level) : 0;
          activeDist[level]++;
          const hasTools = ans && (
            (Array.isArray(ans.toolsUsed) && ans.toolsUsed.filter(Boolean).length > 0) ||
            (typeof ans.toolsUsed === 'string' && ans.toolsUsed.trim() !== '')
          );
          if (hasTools) {
            activeToolCovered++;
            const tools = Array.isArray(ans.toolsUsed)
              ? ans.toolsUsed.filter(Boolean)
              : [ans.toolsUsed.trim()];
            tools.forEach(t => activeToolSet.add(t));
          }
          const item = { area: q.area, subArea: q.subArea, practice: q.practice, level };
          if (level >= 3) activeStrengths.push(item);
          if (level <= 1) activeGaps.push(item);
        });
        activeStrengths.sort((a, b) => b.level - a.level);
        activeGaps.sort((a, b) => a.level - b.level);

        const activeToolPct   = totalQs > 0 ? Math.round((activeToolCovered / totalQs) * 100) : 0;
        const activeUniqueTools = Array.from(activeToolSet);
        const domainColor     = selectedDomain ? (NODE_COLORS[selectedDomain] || '#06b6d4') : null;

        const distColors = { 0: '#94a3b8', 1: '#f59e0b', 2: '#06b6d4', 3: '#6366f1', 4: '#10b981', 5: '#d946ef' };
        const levelNames = { 0: 'Traditional', 1: 'Assisted', 2: 'Delegated', 3: 'Supervised', 4: 'Autonomous', 5: 'Agentic' };

        return (
          <div className="d-flex flex-column gap-4 mb-4" style={{ animation: 'fadeInDown 0.22s ease' }} key={selectedDomain || 'overall'}>

            {/* Filter badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '28px' }}>
              {selectedDomain ? (
                <>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Showing:</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '0.8rem', fontWeight: 700,
                    background: `${domainColor}1a`,
                    color: domainColor,
                    border: `1px solid ${domainColor}55`,
                    borderRadius: '20px',
                    padding: '3px 12px',
                    letterSpacing: '0.03em'
                  }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: domainColor, display: 'inline-block', boxShadow: `0 0 5px ${domainColor}` }} />
                    {selectedDomain}
                  </span>
                  <button
                    onClick={() => setSelectedDomain(null)}
                    title="Reset to overall"
                    style={{
                      background: 'none', border: '1px solid var(--border-subtle)',
                      borderRadius: '20px', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600,
                      padding: '2px 10px', lineHeight: 1.4,
                      transition: 'color 0.15s, border-color 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                  >
                    ✕ Reset
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Overall · All domains · Click a node to filter
                </span>
              )}
            </div>

            {/* Row 1: AI Tool Integration & Practice Level Distribution */}
            <div className="row g-4">
              {/* AI Tool Integration & Adoption */}
              <div className="col-lg-6 col-12">
                <div className="glass-panel h-100" style={{ padding: '24px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '16px' }}>
                    AI Tool Integration &amp; Adoption
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tool Coverage</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: getPercentageColor(activeToolPct), margin: '4px 0' }}>{activeToolPct}%</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{activeToolCovered} of {totalQs} tasks</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tool Diversity</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: domainColor || 'var(--brand-accent, #06b6d4)', margin: '4px 0' }}>{activeUniqueTools.length}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unique tools active</div>
                      </div>
                    </div>
                  </div>
                  {activeUniqueTools.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Audited Tools List
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {activeUniqueTools.map((t, idx) => (
                          <span key={idx} style={{
                            fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px',
                            background: domainColor ? `${domainColor}18` : 'rgba(46,160,67,0.12)',
                            color: domainColor || 'var(--green-bright)',
                            border: `1px solid ${domainColor ? domainColor + '44' : 'rgba(46,160,67,0.25)'}`,
                            fontWeight: 600
                          }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeUniqueTools.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>No tools recorded{selectedDomain ? ' for this domain' : ''}.</p>
                  )}
                </div>
              </div>

              {/* Practice Level Distribution */}
              <div className="col-lg-6 col-12">
                <div className="glass-panel h-100" style={{ padding: '24px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '14px' }}>
                    Practice Level Distribution
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[5, 4, 3, 2, 1, 0].map(lvl => {
                      const count = activeDist[lvl];
                      const percentage = totalQs > 0 ? Math.round((count / totalQs) * 100) : 0;
                      return (
                        <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', width: '90px', textAlign: 'right' }}>
                            {levelNames[lvl]}
                          </span>
                          <div className="d-print-none" style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: distColors[lvl], borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
                          </div>
                          <span style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', width: '70px', textAlign: 'left' }}>
                            {count} ({percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Key Strengths & Priority Gaps */}
            <div className="row g-4">
              {/* Key Strengths */}
              <div className="col-lg-6 col-12">
                <div className="glass-panel h-100" style={{ padding: '24px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--green-bright)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Key Strengths
                  </div>
                  {activeStrengths.length > 0 ? (
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeStrengths.slice(0, 5).map((s, idx) => (
                        <li key={idx}>
                          <strong>[{s.area} / {s.subArea}]</strong> Achieved <strong>L{s.level}</strong> in <em>{s.practice}</em>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                      No practices met the Supervised (L3) threshold{selectedDomain ? ` in ${selectedDomain}` : ''}.
                    </p>
                  )}
                </div>
              </div>

              {/* Priority Gaps */}
              <div className="col-lg-6 col-12">
                <div className="glass-panel h-100" style={{ padding: '24px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#da3633', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Priority Gaps
                  </div>
                  {activeGaps.length > 0 ? (
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeGaps.slice(0, 5).map((g, idx) => (
                        <li key={idx}>
                          <strong>[{g.area} / {g.subArea}]</strong> Currently at <strong>L{g.level}</strong> for <em>{g.practice}</em>. Needs attention.
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                      No critical gaps identified{selectedDomain ? ` in ${selectedDomain}` : ''}.
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>
        );
      })()}
      </div>

      {/* ─── AI Remarks ─── */}
      <div className="glass-panel mb-4 d-print-none" style={{ padding: '28px' }}>
        <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>AI Agent Analysis</span>
          {generatingRemarks && (
            <span className="tuf-badge tuf-badge-blue">
              <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }} />
              Generating…
            </span>
          )}
        </div>

        {remarksError ? (
          <div className="alert alert-warning d-flex align-items-center gap-3">
            <span>⚠️ {remarksError}</span>
            <button onClick={() => { activeRemarksId.current = null; generateRemarks(); }}
              className="btn-premium-outline ms-auto" style={{ padding: '4px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              ↺ Retry
            </button>
          </div>
        ) : (assessment.remarks || generatingRemarks) ? (
          <div style={{ fontFamily: 'var(--font-sans)', lineHeight: 1.7 }}>
            {assessment.remarks && renderMarkdown(assessment.remarks)}
            {generatingRemarks && (
              <div style={{ padding: assessment.remarks ? '20px 0 0 0' : '40px 0', textAlign: 'center' }}>
                <div className="spinner-border mb-3" role="status" style={{ color: 'var(--green-primary)', width: '2rem', height: '2rem' }} />
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 4px' }}>
                  AI Agent is analysing your SDLC maturity…
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  Generating a brief report for each domain. This takes around 20–40 seconds.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No AI analysis available for this assessment.</p>
        )}
      </div>

      {/* ─── Feedback ─── */}
      <div className="glass-panel d-print-none" style={{ padding: '28px' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Report Feedback</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
          Rate the quality of the AI analysis and recommendations.
        </p>

        {feedbackSubmitted ? (
          <div style={{ background: 'var(--green-glow-sm)', border: '1px solid rgba(46,160,67,0.2)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ fontWeight: 700, color: 'var(--green-bright)', marginBottom: '10px' }}>✓ Feedback submitted</div>
            <div className="d-flex gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ fontSize: '1.4rem', color: i < rating ? '#f5a623' : 'var(--border-subtle)', transition: 'color 0.1s' }}>★</span>
              ))}
            </div>
            {comments && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', borderLeft: '2px solid var(--border-subtle)', paddingLeft: '12px', margin: 0 }}>
                "{comments}"
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit}>
            <div className="mb-4">
              <label className="form-label" style={{ display: 'block', marginBottom: '10px' }}>
                Rating <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>(click a star)</span>
              </label>
              <div className="d-flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoveredStar(s)}
                    onMouseLeave={() => setHoveredStar(0)}
                    style={{
                      fontSize: '1.8rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 3px',
                      lineHeight: 1,
                      color: s <= displayRating ? '#f5a623' : 'var(--border-subtle)',
                      transition: 'color 0.1s, transform 0.1s',
                      transform: s <= displayRating ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    ★
                  </button>
                ))}
                {rating > 0 && (
                  <span style={{ alignSelf: 'center', marginLeft: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                  </span>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="comments" className="form-label">Comments (optional)</label>
              <textarea
                id="comments" rows={3} className="form-control"
                placeholder="What could be improved in the analysis?"
                value={comments} onChange={e => setComments(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-premium" disabled={submittingFeedback || rating === 0}
              style={{ opacity: rating === 0 ? 0.5 : 1 }}>
              {submittingFeedback
                ? <><span className="spinner-border spinner-border-sm me-2" />Submitting…</>
                : 'Submit Feedback'}
            </button>
            {rating === 0 && <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select a rating to enable submit</span>}
          </form>
        )}
      </div>
    </div>
  );
}
```

## File: `src/app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
@import 'bootstrap/dist/css/bootstrap.min.css';

/* ═══════════════════════════════════════════════
   TUF-Style Design System — Light & Dark Green Themes
   ═══════════════════════════════════════════════ */
:root, [data-theme='light'] {
  --bg-base:       #f8fafc;
  --bg-surface:    #ffffff;
  --bg-elevated:   #f1f5f9;
  --bg-hover:      #eaeef2;
  --border-subtle: #e2e8f0;
  --border-default:#cbd5e1;

  --green-primary:  #059669;
  --green-bright:   #10b981;
  --green-dim:      #d1fae5;
  --green-glow:    rgba(16, 185, 129, 0.08);
  --green-glow-sm: rgba(16, 185, 129, 0.04);

  --text-primary:  #0f172a;
  --text-secondary:#475569;
  --text-muted:    #64748b;
  --text-link:      #0969da;

  --success:  #10b981;
  --warning:  #d97706;
  --danger:   #ef4444;
  --info:     #3b82f6;

  --radius-sm:  6px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;

  --transition: 0.2s ease;

  --shadow-sm:  0 1px 3px rgba(0,0,0,0.08);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.1);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.12);
  --shadow-green: 0 0 20px rgba(26,127,55,0.15);

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;

  /* Theme-specific custom elements */
  --navbar-bg: rgba(255, 255, 255, 0.92);

  /* Legacy compat aliases */
  --bg-primary:       var(--bg-base);
  --bg-secondary:     var(--bg-surface);
  --bg-glass:         var(--bg-elevated);
  --border-glass:     var(--border-subtle);
  --primary-accent:   var(--green-bright);
  --primary-accent-rgb: 26, 127, 55;
  --secondary-accent: var(--green-primary);
  --success-color:    var(--green-bright);
  --warning-color:    var(--warning);
  --danger-color:     var(--danger);
  --card-border-radius: var(--radius-lg);
  --transition-speed: var(--transition);
}

[data-theme='dark'] {
  --bg-base:       #0b0f19;
  --bg-surface:    #111827;
  --bg-elevated:   #1f2937;
  --bg-hover:      #2d3748;
  --border-subtle: #1e293b;
  --border-default:#334155;

  --green-primary:  #22c55e;
  --green-bright:   #4ade80;
  --green-dim:      #064e3b;
  --green-glow:    rgba(34, 197, 94, 0.15);
  --green-glow-sm: rgba(34, 197, 94, 0.08);

  --text-primary:  #f8fafc;
  --text-secondary:#94a3b8;
  --text-muted:    #64748b;
  --text-link:      #38bdf8;

  --success:  #22c55e;
  --warning:  #eab308;
  --danger:   #ef4444;
  --info:     #3b82f6;

  --shadow-sm:  0 1px 3px rgba(0,0,0,0.5);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.6);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.7);
  --shadow-green: 0 0 20px rgba(34, 197, 94, 0.3);

  --navbar-bg: rgba(17, 24, 39, 0.92);

  /* Legacy compat aliases */
  --primary-accent-rgb: 34, 197, 94;
}

/* ─── Reset & Base ─── */
*, *::before, *::after { box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  background-color: var(--bg-base) !important;
  transition: background-color var(--transition);
}

body {
  background-color: var(--bg-base) !important;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  transition: background-color var(--transition), color var(--transition), border-color var(--transition);
}

h1,h2,h3,h4,h5,h6 {
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

a { color: var(--text-link); text-decoration: none; }
a:hover { color: var(--green-bright); }

code, pre {
  font-family: var(--font-mono);
  font-size: 0.875em;
}

/* ─── Scrollbar ─── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-base); }
::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* ═══════════════════════════════
   NAVBAR
 ═══════════════════════════════ */
.navbar-premium {
  background: var(--navbar-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0;
  height: 60px;
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background var(--transition), border-color var(--transition);
}

.navbar-premium .navbar-brand {
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text-primary) !important;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: -0.03em;
  padding: 0;
  height: 60px;
}

.nav-logo-icon {
  background: var(--green-primary);
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.navbar-premium .nav-link {
  color: var(--text-secondary) !important;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0 14px !important;
  height: 60px;
  display: flex;
  align-items: center;
  border-bottom: 2px solid transparent;
  transition: color var(--transition), border-color var(--transition);
}

.navbar-premium .nav-link:hover {
  color: var(--text-primary) !important;
  border-bottom-color: var(--green-primary);
}

.navbar-premium .nav-link.active {
  color: var(--green-bright) !important;
  border-bottom-color: var(--green-primary);
}

.navbar-premium .nav-link.admin-link {
  color: var(--green-bright) !important;
}

.navbar-toggler {
  border: 1px solid var(--border-subtle) !important;
  color: var(--text-secondary) !important;
}

/* ═══════════════════════════════
   BUTTONS
═══════════════════════════════ */
.btn-premium {
  background: var(--green-primary);
  color: #ffffff !important;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid var(--green-primary);
  border-radius: var(--radius-md);
  padding: 8px 18px;
  cursor: pointer;
  transition: all var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.btn-premium:hover {
  background: var(--green-bright);
  border-color: var(--green-bright);
  color: #ffffff !important;
  transform: translateY(-1px);
  box-shadow: var(--shadow-green);
}

.btn-premium:active { transform: translateY(0); }

.btn-premium-outline {
  background: transparent;
  color: var(--green-bright) !important;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px 18px;
  cursor: pointer;
  transition: all var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.btn-premium-outline:hover {
  background: var(--green-glow);
  border-color: var(--green-primary);
  color: var(--green-bright) !important;
  transform: translateY(-1px);
}

/* Bootstrap overrides */
.btn-primary { background: var(--green-primary); border-color: var(--green-primary); }
.btn-primary:hover { background: var(--green-bright); border-color: var(--green-bright); }
.btn-success { background: var(--green-primary); border-color: var(--green-primary); }
.btn-outline-secondary { border-color: var(--border-subtle); color: var(--text-secondary); }

/* ─── GLASS PANEL / CARDS ─── */
.glass-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);
}

.glass-panel:hover {
  border-color: var(--border-default);
  box-shadow: var(--shadow-md);
}

.tuf-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: background var(--transition), border-color var(--transition), box-shadow var(--transition), transform var(--transition);
}

.tuf-card:hover {
  border-color: var(--green-primary);
  box-shadow: var(--shadow-green);
  transform: translateY(-2px);
}

/* ─── FORMS ─── */
.form-control,
.form-control-premium,
.form-select {
  background: var(--bg-elevated) !important;
  border: 1px solid var(--border-subtle) !important;
  border-radius: var(--radius-md) !important;
  color: var(--text-primary) !important;
  font-size: 0.9rem !important;
  padding: 10px 14px !important;
  transition: border-color var(--transition), box-shadow var(--transition) !important;
}

.form-control:focus,
.form-control-premium:focus,
.form-select:focus {
  background: var(--bg-elevated) !important;
  border-color: var(--green-primary) !important;
  box-shadow: 0 0 0 3px var(--green-glow) !important;
  color: var(--text-primary) !important;
  outline: none !important;
}

.form-control::placeholder { color: var(--text-muted) !important; }
.form-label { color: var(--text-secondary); font-size: 0.85rem; font-weight: 500; margin-bottom: 6px; }

/* ─── TABLES ─── */
.table {
  color: var(--text-primary) !important;
  border-color: var(--border-subtle) !important;
}

.table th {
  color: var(--text-secondary) !important;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--border-subtle) !important;
  padding: 10px 12px;
  background-color: transparent !important;
}

.table td {
  border-bottom: 1px solid var(--border-subtle) !important;
  vertical-align: middle;
  padding: 12px 12px;
  color: var(--text-primary) !important;
  background-color: transparent !important;
}

.table-hover tbody tr:hover td {
  background-color: var(--bg-elevated) !important;
}

/* ─── BADGES & PILLS ─── */
.tuf-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
}

.tuf-badge-green  { background: var(--green-glow);   color: var(--green-bright); border: 1px solid rgba(46,160,67,0.3); }
.tuf-badge-yellow { background: rgba(210,153,34,0.1); color: #d29922; border: 1px solid rgba(210,153,34,0.3); }
.tuf-badge-red    { background: rgba(218,54,51,0.1);  color: #da3633; border: 1px solid rgba(218,54,51,0.3); }
.tuf-badge-blue   { background: rgba(31,111,235,0.1); color: #58a6ff; border: 1px solid rgba(31,111,235,0.2); }
.tuf-badge-gray   { background: var(--bg-elevated);   color: var(--text-secondary); border: 1px solid var(--border-subtle); }

/* ─── METRIC CARDS ─── */
.metric-card {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.metric-value {
  font-family: var(--font-sans);
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--green-bright);
  letter-spacing: -0.04em;
  line-height: 1;
  margin: 8px 0 4px;
}

.metric-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

/* ─── HEATMAP ─── */
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  max-width: 300px;
}

.heatmap-day {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--text-muted);
  cursor: default;
  transition: all var(--transition);
  font-weight: 500;
}

.heatmap-day.completed {
  background: var(--green-dim);
  border-color: var(--green-primary);
  color: var(--green-bright);
  font-weight: 700;
}

.heatmap-day:hover { transform: scale(1.15); z-index: 2; }

/* ─── MATURITY OPTION BUTTONS (Quiz) ─── */
.maturity-option {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  background: var(--bg-elevated);
  cursor: pointer;
  transition: all var(--transition);
  display: flex;
  align-items: flex-start;
  text-align: left;
  gap: 12px;
  width: 100%;
}

.maturity-option:hover {
  background: var(--bg-hover);
  border-color: var(--green-primary);
}

.maturity-option.selected {
  background: var(--green-glow);
  border-color: var(--green-primary);
  box-shadow: 0 0 0 1px var(--green-primary);
}

/* ─── PROGRESS BAR ─── */
.progress {
  background: var(--bg-elevated);
  border-radius: 4px;
  height: 6px;
  overflow: hidden;
}

.progress-bar {
  background: var(--green-primary);
  border-radius: 4px;
  transition: width 0.4s ease;
}

/* ─── ALERTS ─── */
.alert {
  border-radius: var(--radius-md);
  border: 1px solid;
  font-size: 0.9rem;
}

.alert-danger  { background: rgba(218,54,51,0.08); border-color: rgba(218,54,51,0.25); color: var(--danger); }
.alert-success { background: rgba(46,160,67,0.08); border-color: rgba(46,160,67,0.3);  color: var(--success); }
.alert-warning { background: rgba(210,153,34,0.08); border-color: rgba(210,153,34,0.3); color: var(--warning); }
.alert-info    { background: rgba(31,111,235,0.08); border-color: rgba(31,111,235,0.25); color: var(--info); }

/* ─── THEME TOGGLE ─── */
.theme-toggle-btn {
  cursor: pointer;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  font-size: 1rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  transition: all var(--transition);
}

.theme-toggle-btn:hover {
  background: var(--bg-hover);
  border-color: var(--green-primary);
  color: var(--green-bright);
}

/* ─── CODE / MARKDOWN CONTENT ─── */
.markdown-content {
  color: var(--text-primary);
  line-height: 1.75;
}

.markdown-content h1,.markdown-content h2,.markdown-content h3,
.markdown-content h4,.markdown-content h5 {
  color: var(--text-primary);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.markdown-content strong { color: var(--text-primary); }
.markdown-content em { color: var(--text-secondary); }

.markdown-content code {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--green-bright);
}

.markdown-content blockquote {
  border-left: 3px solid var(--green-primary);
  padding: 8px 16px;
  background: var(--green-glow-sm);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  margin: 1em 0;
  color: var(--text-secondary);
}

.markdown-content ul, .markdown-content ol {
  padding-left: 1.5em;
}

.markdown-content li { margin-bottom: 4px; }
.markdown-content hr {
  border: none;
  border-top: 1px solid var(--border-subtle);
  margin: 1.5em 0;
}

/* ─── SPINNER ─── */
.spinner-border { color: var(--green-primary) !important; }
.spinner-border.text-primary { color: var(--green-primary) !important; }

/* ─── UTILITIES ─── */
.text-accent     { color: var(--green-bright) !important; }
.text-accent-dim { color: var(--green-primary) !important; }
.border-subtle   { border-color: var(--border-subtle) !important; }

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.text-muted {
  color: var(--text-secondary) !important;
}

.divider {
  border: none;
  border-top: 1px solid var(--border-subtle);
  margin: 16px 0;
}

/* ─── Modern Premium Dashboard Additions ─── */

.avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--green-primary), var(--green-bright));
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.01em;
  box-shadow: 0 4px 10px rgba(26, 127, 55, 0.15);
}

.segmented-control {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  padding: 4px;
  border-radius: var(--radius-lg);
  display: inline-flex;
  gap: 4px;
}

.segmented-tab {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: var(--radius-md);
  transition: all var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.segmented-tab:hover {
  color: var(--text-primary);
}

.segmented-tab.active {
  background: var(--bg-surface);
  color: var(--green-bright);
  box-shadow: var(--shadow-sm);
}

[data-theme='light'] .segmented-tab.active {
  color: var(--green-primary);
}

.dashboard-header-premium {
  padding: 16px 0 28px;
}

.dashboard-greeting {
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 6px 0;
  color: var(--text-primary);
}

.dashboard-subtitle {
  color: var(--text-secondary);
  font-size: 1.05rem;
  font-weight: 500;
  margin: 0;
}

.metric-card-premium {
  background-color: var(--bg-surface);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%2322c55e' stroke-opacity='0.08' stroke-width='1.5'%3E%3Ccircle cx='160' cy='160' r='40'/%3E%3Ccircle cx='160' cy='160' r='65'/%3E%3Ccircle cx='160' cy='160' r='90'/%3E%3Ccircle cx='160' cy='160' r='115'/%3E%3Ccircle cx='160' cy='160' r='140'/%3E%3C/g%3E%3C/svg%3E"), linear-gradient(135deg, rgba(34, 197, 94, 0.03) 0%, rgba(34, 197, 94, 0.005) 100%);
  background-position: right bottom;
  background-repeat: no-repeat;
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 18px;
  padding: 24px 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
  transition: all var(--transition);
  height: 100%;
}

[data-theme='dark'] .metric-card-premium {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%234ade80' stroke-opacity='0.12' stroke-width='1.5'%3E%3Ccircle cx='160' cy='160' r='40'/%3E%3Ccircle cx='160' cy='160' r='65'/%3E%3Ccircle cx='160' cy='160' r='90'/%3E%3Ccircle cx='160' cy='160' r='115'/%3E%3Ccircle cx='160' cy='160' r='140'/%3E%3C/g%3E%3C/svg%3E"), linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(6, 78, 59, 0.05) 100%);
  border: 1px solid rgba(52, 211, 153, 0.15);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.metric-card-premium:hover {
  border-color: var(--green-primary);
  box-shadow: 0 8px 30px var(--green-glow);
  transform: translateY(-2px);
}

.metric-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.metric-number {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
  margin: 6px 0;
  letter-spacing: -0.03em;
}

.metric-trend {
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend-percentage {
  color: var(--green-bright);
}

[data-theme='light'] .trend-percentage {
  color: var(--green-primary);
}

.trend-period {
  color: var(--text-secondary);
  font-weight: 400;
}

.metric-icon-circle {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--green-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--green-bright);
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.05);
}

[data-theme='light'] .metric-icon-circle {
  color: var(--green-primary);
}

.onboarding-premium-card {
  background: linear-gradient(135deg, rgba(26, 127, 55, 0.02), rgba(26, 127, 55, 0.005));
  border: 1px solid rgba(26, 127, 55, 0.1);
  border-radius: var(--radius-xl);
  padding: 40px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 48px;
  text-align: left;
}

[data-theme='dark'] .onboarding-premium-card {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.04), rgba(34, 197, 94, 0.005));
  border: 1px solid rgba(34, 197, 94, 0.12);
}

@media (max-width: 991px) {
  .onboarding-premium-card {
    flex-direction: column;
    text-align: center;
    padding: 32px 24px;
    gap: 32px;
  }
}

.onboarding-illustration-container {
  flex: 1;
  max-width: 45%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.onboarding-illustration-container img {
  width: 100%;
  height: auto;
  max-height: 280px;
  object-fit: contain;
}

@media (max-width: 991px) {
  .onboarding-illustration-container {
    max-width: 80%;
  }
}

.onboarding-content-container {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

@media (max-width: 991px) {
  .onboarding-content-container {
    align-items: center;
  }
}

.onboarding-step-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  text-align: left;
}

.onboarding-step-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--green-glow);
  color: var(--green-bright);
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

[data-theme='light'] .onboarding-step-badge {
  color: var(--green-primary);
}

.onboarding-step-text {
  display: flex;
  flex-direction: column;
}

.onboarding-step-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 3px 0;
}

.onboarding-step-desc {
  font-size: 0.84rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

/* ─── Animations ─── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fade-in { animation: fadeIn 0.3s ease forwards; }

@keyframes pulse-green {
  0%,100% { box-shadow: 0 0 0 0 var(--green-glow); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}

.pulse-hover:hover { animation: pulse-green 1.5s infinite; }

/* Bootstrap table overrides */
.table-hover > tbody > tr:hover > * { background-color: var(--bg-elevated) !important; }
.table > :not(caption) > * > * { border-bottom-color: var(--border-subtle) !important; background: transparent; }

/* Select options dark */
select option { background: var(--bg-surface); color: var(--text-primary); }

/* Modal dark */
.modal-content { background: var(--bg-surface); border-color: var(--border-subtle); color: var(--text-primary); }
.modal-header  { border-bottom-color: var(--border-subtle); }
.modal-footer  { border-top-color: var(--border-subtle); }

/* Accordion dark */
.accordion-item   { background: var(--bg-surface); border-color: var(--border-subtle); }
.accordion-button { background: var(--bg-elevated) !important; color: var(--text-primary) !important; box-shadow: none !important; }
.accordion-button:not(.collapsed) { color: var(--green-bright) !important; background: var(--green-glow-sm) !important; }

/* Input group */
.input-group-text { background: var(--bg-elevated); border-color: var(--border-subtle); color: var(--text-secondary); }

/* ─── High-Fidelity Assessment Redesign Styles ─── */

.assessment-bg-orbs {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: -1;
  background: 
    radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.07) 0%, transparent 50%),
    radial-gradient(circle at 85% 85%, rgba(52, 211, 153, 0.05) 0%, transparent 50%);
}

.glass-panel-translucent {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.02);
  transition: all var(--transition);
}

[data-theme='dark'] .glass-panel-translucent {
  background: rgba(17, 24, 39, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dot-indicator-circle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.dot-indicator-circle.completed {
  background-color: var(--green-primary);
}
.dot-indicator-circle.active {
  background-color: var(--green-primary);
  box-shadow: 0 0 8px var(--green-primary);
}
.dot-indicator-circle.partial {
  background-color: var(--text-muted);
}
.dot-indicator-circle.unstarted {
  border: 1.5px solid var(--border-subtle);
  background-color: transparent;
}

.sidebar-nav-item-premium {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  margin-bottom: 6px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
}
.sidebar-nav-item-premium::before {
  content: '';
  position: absolute;
  left: 0;
  top: 25%;
  height: 50%;
  width: 3px;
  background: var(--green-primary);
  border-radius: 0 2px 2px 0;
  transform: scaleX(0);
  transition: transform var(--transition);
}
.sidebar-nav-item-premium:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.sidebar-nav-item-premium.active {
  border: 1px solid rgba(16, 185, 129, 0.15) !important;
  background: var(--green-glow) !important;
  color: var(--green-primary) !important;
  font-weight: 700;
}
.sidebar-nav-item-premium.active::before {
  transform: scaleX(1);
}

.question-nav-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  background-color: var(--border-subtle);
  transition: all 0.2s ease;
}
.question-nav-dot.completed,
.question-nav-dot.active {
  background-color: var(--green-primary);
}

.maturity-grid-3x2 {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
@media (max-width: 1199px) {
  .maturity-grid-3x2 {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .maturity-grid-3x2 {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 575px) {
  .maturity-grid-3x2 {
    grid-template-columns: 1fr;
  }
}

.maturity-card-premium {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 12px 10px;
  cursor: pointer;
  transition: all var(--transition);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  min-height: 125px;
  justify-content: flex-start;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
}
[data-theme='dark'] .maturity-card-premium {
  background: rgba(17, 24, 39, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.maturity-card-premium:hover {
  border-color: var(--green-primary);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(16, 185, 129, 0.05);
}
.maturity-card-premium.selected {
  border-color: var(--green-primary);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 10px 30px rgba(16, 185, 129, 0.08);
}
[data-theme='dark'] .maturity-card-premium.selected {
  background: rgba(17, 24, 39, 0.85);
  box-shadow: 0 10px 30px rgba(16, 185, 129, 0.15);
}

.maturity-card-lvl {
  position: absolute;
  top: 8px;
  left: 10px;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-muted);
}
.maturity-card-premium.selected .maturity-card-lvl {
  color: var(--green-primary);
}
.maturity-card-icon-container {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  margin-top: 4px;
  position: relative;
  color: var(--text-secondary);
  transition: color var(--transition);
}
.maturity-card-premium.selected .maturity-card-icon-container {
  color: var(--green-primary);
}
.maturity-card-title {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.maturity-card-premium.selected .maturity-card-title {
  color: var(--green-primary);
}
.maturity-card-desc {
  font-size: 0.68rem;
  color: var(--text-secondary);
  line-height: 1.3;
  margin: 0;
}
.selected-check-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--green-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  border: 2px solid var(--bg-surface);
}

/* Stepper Timeline */
.onboarding-stepper-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 32px;
  padding: 0 10px;
}
.stepper-line-track {
  position: absolute;
  left: 10px;
  right: 10px;
  height: 3px;
  background: var(--border-subtle);
  z-index: 1;
}
.stepper-line-progress {
  position: absolute;
  left: 10px;
  height: 3px;
  background: var(--green-primary);
  transition: width 0.3s ease;
  z-index: 2;
}
.stepper-node-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 2px solid var(--border-subtle);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  z-index: 3;
  transition: all 0.3s ease;
  cursor: pointer;
}
.stepper-node-circle.active {
  background: var(--bg-surface);
  border-color: var(--green-primary);
  color: var(--green-primary);
  box-shadow: 0 0 10px var(--green-glow);
}
.stepper-node-circle.completed {
  background: var(--green-dim);
  border-color: var(--green-primary);
  color: var(--green-primary);
}

/* ── Pentagon Diagram Styles (Light theme Neuromorphic from a.html) ── */

.pentagon-container-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 638px;
  margin: 0 auto;
  padding: 15px 15px 30px 15px;
  position: relative;
  overflow: visible;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}

.pentagon-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 525px;
  max-height: 525px;
}

/* SVG lines connecting nodes */
.pentagon-lines-container {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.pentagon-lines-container svg {
  width: 100%;
  height: 100%;
}

.pentagon-line {
  stroke: rgba(150, 180, 175, 0.4);
  stroke-width: 1.5;
  fill: none;
}

.pentagon-line-outer {
  stroke: rgba(120, 160, 155, 0.6);
  stroke-width: 2;
  fill: none;
}

/* Progress indicators on lines */
.pentagon-line-progress {
  position: absolute;
  width: 15px;
  height: 3px;
  border-radius: 1.5px;
  opacity: 0.8;
  pointer-events: none;
}

.pentagon-line-progress.cyan {
  background: linear-gradient(90deg, #5dd3c8, #3bb8ac);
  box-shadow: 0 0 8px rgba(93, 211, 200, 0.4);
}

.pentagon-line-progress.dark {
  background: linear-gradient(90deg, #3a5a6a, #2d4a58);
}

/* Nodes styled neuromorphically */
.pentagon-node {
  position: absolute;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.68, -0.6, 0.32, 1.6);
  transform: translate(-50%, -50%);
  background: none;
  border: none;
  backdrop-filter: none;
  box-shadow: none;
  z-index: 5;
}

.pentagon-node::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffffff, #e6e9ec);
  box-shadow:
      8px 8px 20px rgba(0, 0, 0, 0.08),
      -8px -8px 20px rgba(255, 255, 255, 0.9),
      inset 2px 2px 4px rgba(255, 255, 255, 0.8),
      inset -2px -2px 4px rgba(0, 0, 0, 0.05);
  z-index: -1;
  transition: all 0.3s ease;
}

.pentagon-node::after {
  content: '';
  position: absolute;
  width: 90%;
  height: 90%;
  border-radius: 50%;
  background: linear-gradient(145deg,
          rgba(255, 255, 255, 0.8) 0%,
          rgba(240, 245, 248, 0.6) 50%,
          rgba(220, 230, 235, 0.4) 100%);
  z-index: -1;
}



.pentagon-node:hover::before {
  box-shadow:
      12px 12px 30px rgba(0, 0, 0, 0.12),
      -12px -12px 30px rgba(255, 255, 255, 1),
      inset 2px 2px 4px rgba(255, 255, 255, 0.9),
      inset -2px -2px 4px rgba(0, 0, 0, 0.08);
}

/* Node specific background colors from a.html */
.pentagon-node-architecture::before {
  background: linear-gradient(145deg, #f0f5f5, #e0e8e8);
}

.pentagon-node-development::before {
  background: linear-gradient(145deg, #e8f5f3, #d5ebe8);
}

.pentagon-node-testing::before {
  background: linear-gradient(145deg, #e5f2f0, #d0e8e5);
}

.pentagon-node-deployment::before {
  background: linear-gradient(145deg, #e8f0f2, #d8e5e8);
}

.pentagon-node-requirements::before {
  background: linear-gradient(145deg, #e5eaf0, #d5e0e8);
}

.pentagon-node-shine {
  position: absolute;
  width: 40%;
  height: 30%;
  top: 10%;
  left: 15%;
  background: linear-gradient(135deg,
          rgba(255, 255, 255, 0.8) 0%,
          rgba(255, 255, 255, 0) 60%);
  border-radius: 50%;
  z-index: 2;
  pointer-events: none;
}

.pentagon-node-title {
  font-size: 9px;
  font-weight: 600;
  color: #2d3e4a;
  text-align: center;
  z-index: 1;
}

.pentagon-node-level {
  font-size: 8.5px;
  font-weight: 600;
  color: #6a8090;
  margin-top: 2px;
  z-index: 1;
  text-shadow: none;
}

.pentagon-node-subtitle {
  font-size: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: #8a9aa5;
  z-index: 1;
  margin-top: 1px;
}

/* Center score card */
.pentagon-center-score {
  position: absolute;
  top: 47%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 8;
  background: transparent;
  box-shadow: none;
  border: none;
}

.pentagon-score-value {
  font-size: 30px;
  font-weight: 400;
  color: #2d3e4a;
  text-shadow: none;
  line-height: 1.1;
}

.pentagon-score-label {
  font-size: 7px;
  font-weight: 700;
  color: #8a9aa5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 1px;
}

/* KPI Indicator styled to match */
.pentagon-kpi-indicator {
  position: absolute;
  bottom: -4%;
  left: 50%;
  transform: translateX(-50%);
  width: 135px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 12px;
  padding: 6px 9px;
  box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.pentagon-kpi-label {
  font-size: 7px;
  font-weight: 700;
  color: #8a9aa5;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}

.pentagon-kpi-value {
  font-size: 13.5px;
  font-weight: 800;
  color: #3bb8ac;
}

.pentagon-kpi-bar {
  width: 100%;
  height: 4px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 50px;
  overflow: hidden;
  margin-top: 4px;
}

.pentagon-kpi-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #5dd3c8, #3bb8ac);
  box-shadow: 0 0 8px rgba(93, 211, 200, 0.4);
  transition: width 1s ease-out;
}

/* Animations */
@keyframes pentagon-float {
  0%, 100% {
    transform: translate(-50%, -50%) translateY(0px);
  }
  50% {
    transform: translate(-50%, -50%) translateY(-6px);
  }
}

.pentagon-floating {
  animation: pentagon-float 6s ease-in-out infinite;
}

@media (max-width: 500px) {
  .pentagon-node {
    width: 66px;
    height: 66px;
  }
  .pentagon-node-title {
    font-size: 7px;
  }
  .pentagon-node-level {
    font-size: 6.5px;
  }
  .pentagon-node-subtitle {
    font-size: 5px;
  }
  .pentagon-center-score {
    width: 90px;
    height: 60px;
    padding-top: 5px;
  }
  .pentagon-score-value {
    font-size: 22px;
  }
  .pentagon-score-total {
    font-size: 14px;
  }
  .pentagon-kpi-indicator {
    width: 110px;
    padding: 4px 8px;
    bottom: -6%;
  }
  .pentagon-kpi-value {
    font-size: 11px;
  }
}

/* Premium Dropdown Menu */
.navbar-user-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  padding: 4px 10px;
  border-radius: 20px;
  cursor: pointer;
  transition: background var(--transition), transform var(--transition);
}

.navbar-user-trigger:hover {
  background: var(--bg-hover);
}

.navbar-user-trigger:active {
  transform: scale(0.98);
}

.navbar-user-trigger .avatar-circle {
  transition: transform var(--transition), box-shadow var(--transition);
}

.navbar-user-trigger:hover .avatar-circle {
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
}

.dropdown-menu-premium {
  position: absolute;
  top: 45px;
  right: 0;
  background: var(--bg-surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  width: 220px;
  box-shadow: var(--shadow-lg);
  padding: 8px;
  z-index: 999;
  transform-origin: top right;
  animation: dropdownFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

[data-theme='light'] .dropdown-menu-premium {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

[data-theme='dark'] .dropdown-menu-premium {
  background: rgba(17, 24, 39, 0.85);
  border: 1px solid rgba(30, 41, 59, 0.8);
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dropdown-header-premium {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 6px;
}

.avatar-circle-sm {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--green-primary), var(--green-bright));
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
}

.user-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.user-email {
  font-size: 0.74rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.dropdown-item-premium {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-secondary) !important;
  text-decoration: none;
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition);
}

.dropdown-item-premium svg {
  color: var(--text-muted);
  transition: color var(--transition), transform var(--transition);
}

.dropdown-item-premium:hover {
  background: var(--bg-hover);
  color: var(--text-primary) !important;
}

.dropdown-item-premium:hover svg {
  color: var(--green-primary);
  transform: rotate(15deg);
}

.dropdown-item-premium.danger {
  color: var(--danger) !important;
  margin-top: 4px;
}

.dropdown-item-premium.danger svg {
  color: var(--danger);
  opacity: 0.85;
}

.dropdown-item-premium.danger:hover {
  background: rgba(239, 68, 68, 0.08);
  color: var(--danger) !important;
}

.dropdown-item-premium.danger:hover svg {
  color: var(--danger);
  transform: translateX(3px);
}

.dropdown-divider-premium {
  height: 1px;
  background-color: var(--border-subtle);
  margin: 6px 8px;
}



.accordion-header-hover:hover {
  background-color: rgba(255, 255, 255, 0.04) !important;
}
[data-theme='light'] .accordion-header-hover:hover {
  background-color: rgba(0, 0, 0, 0.02) !important;
}
```

## File: `src/app/components/PentagonDiagram.js`

```javascript
'use client';

import { useMemo, useState } from 'react';

const LEVEL_LABELS = {
  0: 'Traditional',
  1: 'Assisted',
  2: 'Delegated',
  3: 'Supervised',
  4: 'Autonomous',
  5: 'Agentic'
};

const LEVEL_GRADIENTS = {
  0: 'linear-gradient(135deg, #708090 0%, #4f5d6b 100%)', // Traditional: Slate grey
  1: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Assisted: Warm Amber
  2: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Delegated: Cool Cyan
  3: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', // Supervised: Indigo Blue
  4: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Autonomous: Emerald Green
  5: 'linear-gradient(135deg, #d946ef 0%, #a855f7 100%)'  // Agentic: Futuristic Magenta/Purple
};

const LEVEL_COLORS = {
  0: '#5c6b73',
  1: '#d97706',
  2: '#0891b2',
  3: '#4f46e5',
  4: '#059669',
  5: '#a855f7'
};

export default function PentagonDiagram({ overallScore, categoryScores, onNodeClick, selectedDomain }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const scoreVal = overallScore != null ? overallScore : 0;

  const nodeData = useMemo(() => {
    return [
      { id: 'architecture', name: 'Architecture', top: '11.5%', left: '50%', color: '#ec4899' },
      { id: 'requirements', name: 'Requirements', top: '36%', left: '15.5%', color: '#6366f1' },
      { id: 'development', name: 'Development', top: '36%', left: '84.5%', color: '#06b6d4' },
      { id: 'deployment', name: 'Deployment', top: '76%', left: '28.5%', color: '#f59e0b' },
      { id: 'testing', name: 'Testing', top: '76%', left: '71.5%', color: '#10b981' }
    ];
  }, []);

  const flakeData = useMemo(() => {
    return [
      { style: { top: '14%', left: '28%', transform: 'rotate(-50deg)' } },
      { style: { top: '14%', right: '26%', transform: 'rotate(50deg)' } },
      { style: { top: '30%', left: '16%', transform: 'rotate(70deg)' } },
      { style: { top: '30%', right: '14%', transform: 'rotate(-70deg)' } },
      { style: { top: '55%', left: '12%', transform: 'rotate(30deg)' } },
      { style: { top: '55%', right: '10%', transform: 'rotate(-30deg)' } },
      { style: { top: '75%', left: '32%', transform: 'rotate(-20deg)' } },
      { style: { top: '75%', right: '30%', transform: 'rotate(20deg)' } },
      { style: { top: '68%', left: '45%', transform: 'rotate(0deg)' } }
    ];
  }, []);

  const overallLvl = Math.round(scoreVal);
  const numActiveFlakes = Math.round((overallLvl / 5) * 9);

  return (
    <div className="pentagon-container-wrap">
      <div className="pentagon-container">
        {/* SVG lines connecting nodes */}
        <div className="pentagon-lines-container">
          <svg viewBox="0 0 700 700" preserveAspectRatio="xMidYMid meet">
            {/* Pentagon outer edges */}
            <path className="pentagon-line-outer" d="M 350 80 L 590 250 L 500 530 L 200 530 L 110 250 Z" />

            {/* Inner connecting lines (all nodes connected) */}
            <line className="pentagon-line" x1="350" y1="80" x2="110" y2="250" />
            <line className="pentagon-line" x1="350" y1="80" x2="590" y2="250" />
            <line className="pentagon-line" x1="350" y1="80" x2="200" y2="530" />
            <line className="pentagon-line" x1="350" y1="80" x2="500" y2="530" />
            <line className="pentagon-line" x1="110" y1="250" x2="590" y2="250" />
            <line className="pentagon-line" x1="110" y1="250" x2="500" y2="530" />
            <line className="pentagon-line" x1="590" y1="250" x2="200" y2="530" />
            <line className="pentagon-line" x1="200" y1="530" x2="500" y2="530" />
          </svg>
        </div>

        {/* Progress indicators on lines */}
        {flakeData.map((flake, idx) => {
          const isActive = idx < numActiveFlakes;
          return (
            <div
              key={idx}
              className="pentagon-line-progress"
              style={{
                ...flake.style,
                background: isActive ? LEVEL_GRADIENTS[overallLvl] : 'linear-gradient(90deg, #3a5a6a, #2d4a58)',
                boxShadow: isActive ? `0 0 8px ${LEVEL_COLORS[overallLvl]}` : 'none'
              }}
            />
          );
        })}

        {/* Nodes */}
        {nodeData.map((node) => {
          const score = categoryScores ? categoryScores[node.name] : null;
          const hasScore = score !== undefined && score !== null;
          const roundedLvl = hasScore ? Math.round(score) : 0;
          const isSelected = selectedDomain === node.name;
          const isHovered = hoveredNode === node.id;

          return (
            <div
              key={node.id}
              className="pentagon-floating"
              style={{
                position: 'absolute',
                top: node.top,
                left: node.left,
                width: '86px',
                height: '86px',
                animationDelay: node.id === 'requirements' ? '-1s' : node.id === 'development' ? '-2s' : node.id === 'deployment' ? '-3s' : node.id === 'testing' ? '-0.5s' : '0s',
                zIndex: 5,
              }}
            >
              <div
                className={`pentagon-node pentagon-node-${node.id}`}
                style={{
                  position: 'relative',
                  top: 0,
                  left: 0,
                  '--node-accent': node.color,
                  cursor: onNodeClick ? 'pointer' : 'default',
                  outline: isSelected
                    ? `2.5px solid ${node.color}`
                    : isHovered
                    ? `2px solid ${node.color}99`
                    : 'none',
                  outlineOffset: '4px',
                  transform: 'scale(1)',
                  transition: 'outline 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
                  boxShadow: isSelected
                    ? `0 0 20px ${node.color}55`
                    : isHovered
                    ? `0 0 12px ${node.color}33`
                    : undefined,
                }}
                onClick={() => onNodeClick && onNodeClick(node.name)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="pentagon-node-shine"></div>
                <span className="pentagon-node-title">{node.name}</span>
                <span className="pentagon-node-level" style={{ color: LEVEL_COLORS[roundedLvl] }}>
                  {hasScore ? `L${roundedLvl}` : 'N/A'}
                </span>
                <span className="pentagon-node-subtitle" style={{ color: 'var(--text-muted)' }}>
                  {hasScore ? LEVEL_LABELS[roundedLvl] : '—'}
                </span>
              </div>
            </div>
          );
        })}

        {/* Center Score */}
        <div className="pentagon-center-score">
          <span className="pentagon-score-value" style={{
            background: LEVEL_GRADIENTS[overallLvl],
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>
            L{overallLvl}
          </span>
          <span className="pentagon-score-label" style={{ color: LEVEL_COLORS[overallLvl] }}>
            {LEVEL_LABELS[overallLvl]}
          </span>
        </div>
      </div>
    </div>
  );
}

```

## File: `src/app/AuthContext.js`

```javascript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserLoggedIn();
  }, []);

  const checkUserLoggedIn = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      setUser(data.user);
      router.push('/dashboard');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email, password) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Signup failed');
      }
      setUser(data.user);
      router.push('/dashboard');
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser: checkUserLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## File: `src/app/ThemeContext.js`

```javascript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light'); // Default to light mode for SSR

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
      document.documentElement.setAttribute('data-theme', storedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultTheme = prefersDark ? 'dark' : 'light';
      setTheme(defaultTheme);
      document.documentElement.setAttribute('data-theme', defaultTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

## File: `src/app/api/assessments/[id]/route.js`

```javascript
import { NextResponse } from 'next/server';
import { getAssessmentById, updateAssessmentRemarks } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const assessment = await getAssessmentById(id);

    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
    }

    if (userPayload.role !== 'admin' && assessment.userId !== userPayload.id) {
      return NextResponse.json({ message: 'Unauthorized to view this assessment' }, { status: 403 });
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error('Assessments GET ID API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PATCH — update only the remarks field (called from report page after async AI generation)
export async function PATCH(request, { params }) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const assessment = await getAssessmentById(id);
    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
    }
    if (userPayload.role !== 'admin' && assessment.userId !== userPayload.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { remarks, provider } = body;
    const updated = await updateAssessmentRemarks(id, remarks, provider || 'llama3.2');
    return NextResponse.json({ assessment: updated });
  } catch (error) {
    console.error('Assessments PATCH Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
```

## File: `src/app/api/questions/route.js`

```javascript
import { NextResponse } from 'next/server';
import { getQuestions, saveQuestion, deleteQuestion } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const questions = await getQuestions();
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Questions GET API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const questionData = await request.json();
    if (!questionData.area || !questionData.subArea || !questionData.practice || !questionData.questionText) {
      return NextResponse.json({ message: 'Missing required question fields' }, { status: 400 });
    }

    await saveQuestion(questionData);
    return NextResponse.json({ message: 'Question saved successfully' });
  } catch (error) {
    console.error('Questions POST API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ message: 'Question ID is required' }, { status: 400 });
    }

    const deleted = await deleteQuestion(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Questions DELETE API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
```

## File: `src/app/api/remarks/route.js`

```javascript
import { NextResponse } from 'next/server';
import { generateRemarks } from '@/lib/remarksService';

// ──────────────────────────────────────────────────────────────────
// POST /api/remarks
// ──────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { scores, answers } = await request.json();
    if (!scores || !answers) {
      return NextResponse.json({ message: 'Missing scores or answers data' }, { status: 400 });
    }

    const { stream, provider } = await generateRemarks(scores, answers);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'x-remarks-provider': provider || 'AI'
      }
    });
  } catch (error) {
    console.error('Remarks API Error:', error);
    return NextResponse.json({ message: error.message || 'Server error generating remarks' }, { status: 500 });
  }
}
```

## File: `src/app/api/feedback/route.js`

```javascript
import { NextResponse } from 'next/server';
import { getFeedback, saveFeedback, getAssessmentById, saveAssessment } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const feedback = await getFeedback();
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Feedback GET API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const feedbackData = await request.json();
    if (!feedbackData.assessmentId || !feedbackData.rating) {
      return NextResponse.json({ message: 'Missing feedback rating or assessment ID' }, { status: 400 });
    }

    feedbackData.userId = userPayload.id;
    feedbackData.userEmail = userPayload.email;

    const saved = await saveFeedback(feedbackData);

    // Also update the assessment record with feedback info
    const assessment = await getAssessmentById(feedbackData.assessmentId);
    if (assessment) {
      assessment.feedback = {
        rating: feedbackData.rating,
        comments: feedbackData.comments || '',
        createdAt: saved.createdAt
      };
      await saveAssessment(assessment);
    }

    return NextResponse.json({ message: 'Feedback submitted successfully', feedback: saved });
  } catch (error) {
    console.error('Feedback POST API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
```

