'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../AuthContext';
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

const LEVEL_COLORS = {
  0: '#708090',
  1: '#f59e0b',
  2: '#06b6d4',
  3: '#6366f1',
  4: '#10b981',
  5: '#d946ef'
};


export default function Report({ params }) {
  const { user, loading: authLoading } = useAuth();
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
      
      const assessmentData = data.assessment;
      if (assessmentData && assessmentData.remarks) {
        try {
          const parsed = JSON.parse(assessmentData.remarks);
          if (parsed && typeof parsed === 'object' && parsed.remarks) {
            assessmentData.remarks = parsed.remarks;
          }
        } catch (e) {
          // Keep as is if not a valid JSON string
        }
      }

      setAssessment(assessmentData);
      setQuestions(qData.questions || []);
      if (assessmentData.feedback) {
        setFeedbackSubmitted(true);
        setRating(assessmentData.feedback.rating || 0);
        setComments(assessmentData.feedback.comments || '');
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
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }, 100);
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
      
      const data = await res.json();
      const remarksText = data.remarks || '';
      const provider = data.provider || 'AI';
      setAssessment(prev => ({ ...prev, remarksProvider: provider, remarks: remarksText }));

      await fetch(`/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: remarksText, provider: provider }),
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
          background: linear-gradient(135deg, #f0f6ff 0%, #d8e5e1 100%) !important;
        }
        footer {
          background: transparent !important;
          border-top: none !important;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.72) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.55) !important;
          box-shadow: 0 8px 32px rgba(26, 127, 55, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .glass-panel:hover {
          background: rgba(255, 255, 255, 0.85) !important;
          border-color: rgba(26, 127, 55, 0.22) !important;
          box-shadow: 0 12px 40px rgba(26, 127, 55, 0.08), 0 1px 5px rgba(0, 0, 0, 0.02) !important;
          transform: translateY(-2px);
        }
        .alert-warning {
          background: rgba(210, 153, 34, 0.08) !important;
          border-color: rgba(210, 153, 34, 0.3) !important;
          color: #b08110 !important;
        }
        .alert-danger {
          background: rgba(218, 54, 51, 0.08) !important;
          border-color: rgba(218, 54, 51, 0.25) !important;
          color: #da3633 !important;
        }
        @media print {
          nav, .navbar, .navbar-premium, footer, button, .btn, .btn-premium, .btn-premium-outline, .btn-group, form,
          a[href*="dashboard"], a[href*="admin"],
          .feedback-section,
          .form-control, textarea,
          .d-print-none {
            display: none !important;
          }
          .pentagon-container-wrap, .pentagon-container,
          .d-print-none-graphic {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body, html, .fade-in, main, .container, .row, .col-12, .col-lg-6 {
            background: #ffffff !important;
            color: #1e293b !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
            width: 100% !important;
            float: none !important;
          }
          .glass-panel {
            background: #f8fafc !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
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

        {/* Strengths & Gaps Section */}
        <div style={{ marginTop: '25px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* Key Strengths */}
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '11pt', fontWeight: 700, color: '#198754', margin: '0 0 12px 0', borderBottom: '1.5px solid #cbd5e1', paddingBottom: '6px' }}>
                Key Strengths (Overall Domains)
              </h3>
              {strengths.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {strengths.slice(0, 5).map((s, idx) => (
                    <div key={idx} style={{ fontSize: '9pt', color: '#1e293b', lineHeight: 1.4 }}>
                      <strong>• {s.practice}</strong> <span style={{ color: '#475569', fontSize: '8pt' }}>({s.area} &rsaquo; {s.subArea} - L{s.level})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '9pt', color: '#64748b', fontStyle: 'italic' }}>No practices met the Supervised (L3) threshold.</div>
              )}
            </div>

            {/* Priority Gaps */}
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '11pt', fontWeight: 700, color: '#dc3545', margin: '0 0 12px 0', borderBottom: '1.5px solid #cbd5e1', paddingBottom: '6px' }}>
                Priority Gaps (Overall Domains)
              </h3>
              {gaps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {gaps.slice(0, 5).map((g, idx) => (
                    <div key={idx} style={{ fontSize: '9pt', color: '#1e293b', lineHeight: 1.4 }}>
                      <strong>• {g.practice}</strong> <span style={{ color: '#475569', fontSize: '8pt' }}>({g.area} &rsaquo; {g.subArea} - L{g.level})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '9pt', color: '#64748b', fontStyle: 'italic' }}>No critical gaps identified.</div>
              )}
            </div>
          </div>
        </div>

        {/* AI Agent Remarks Section */}
        {assessment.remarks && (
          <div style={{ marginTop: '25px', pageBreakBefore: 'always' }} className="print-remarks-container">
            <h2 style={{ fontSize: '12pt', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0', borderBottom: '2px solid #10b981', paddingBottom: '6px' }}>
              AI Agent Capability &amp; Maturity Analysis
            </h2>
            <div style={{ marginTop: '12px' }}>
              {renderMarkdown(assessment.remarks)}
            </div>
          </div>
        )}

      </div>

      {/* ─── Screen Layout (Hidden during print) ─── */}
      <div className="d-print-none">
        {/* ─── Header ─── */}
        <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <Link href={user?.role === 'admin' || user?.email === 'admin@sdlc.com' ? '/admin' : '/dashboard'} style={{ color: 'var(--text-link)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontWeight: '500' }} className="d-print-none">
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
          className="btn btn-premium d-print-none"
          style={{
            padding: '10px 22px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #198754 0%, #10b981 100%)',
            border: 'none',
            color: '#fff',
            fontWeight: '700',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(25, 135, 84, 0.35)',
            transform: 'scale(1)',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.04)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(25, 135, 84, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(25, 135, 84, 0.35)';
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Report
        </button>
      </div>

      {/* ─── Hero Summary Card ─── */}
      {(() => {
        const radius = 50;
        const circumference = 2 * Math.PI * radius;
        const gaugeArc = (300 / 360) * circumference;   // 300-degree sweep
        // New rounding: decimal < 0.7 → floor, >= 0.7 → ceil
        const _rawDecimal = avgLevel - Math.floor(avgLevel);
        const displayLevel = Math.min(_rawDecimal >= 0.7 ? Math.ceil(avgLevel) : Math.floor(avgLevel), 5);
        const currentLvl = displayLevel;
        const filledArc = (displayLevel / 5) * gaugeArc;
        const lvlNames = ['Traditional', 'Assisted', 'Delegated', 'Supervised', 'Autonomous', 'Agentic'];
        const heroScoreLabel = displayLevel >= 4 ? 'High Maturity' : displayLevel >= 2 ? 'Medium Maturity' : 'Low Maturity';
        const heroAccentColor = displayLevel >= 4 ? '#10b981' : displayLevel >= 2 ? '#f59e0b' : '#ef4444';
        return (
          <div className="card glass-panel mb-4 border-0">
            <div className="card-body p-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>

                {/* ── Left: Circular Gauge ── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', minWidth: '130px' }}>
                  <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                    <svg width="130" height="130" viewBox="0 0 120 120" style={{ transform: 'rotate(-210deg)' }}>
                      <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%"   stopColor="#f43f5e" />
                          <stop offset="40%"  stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      {/* Track */}
                      <circle
                        cx="60" cy="60" r={radius}
                        fill="none"
                        stroke="rgba(148,163,184,0.15)"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={`${gaugeArc} ${circumference}`}
                      />
                      {/* Fill */}
                      <circle
                        cx="60" cy="60" r={radius}
                        fill="none"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={`${filledArc} ${circumference}`}
                        style={{ transition: 'stroke-dasharray 0.8s ease' }}
                      />
                    </svg>
                    {/* Center text — shows level label e.g. L3 */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontSize: '2.2rem', fontWeight: 900, color: LEVEL_COLORS[displayLevel], lineHeight: 1, letterSpacing: '-0.02em' }}>
                        L{displayLevel}
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {lvlNames[displayLevel]}
                      </div>
                    </div>
                  </div>
                  {/* Maturity badge */}
                  <div style={{
                    padding: '4px 16px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: `1.5px solid ${heroAccentColor}`,
                    color: heroAccentColor,
                    background: `${heroAccentColor}12`,
                    letterSpacing: '0.01em'
                  }}>
                    {heroScoreLabel}
                  </div>
                </div>

                {/* ── Vertical divider ── */}
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border-subtle)', opacity: 0.6 }} className="d-none d-sm-block" />

                {/* ── Right: Maturity Journey ── */}
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Maturity Journey
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '22px', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                    {getLevelName(displayLevel)}
                  </div>
 
                  {/* Level Stepper — matches gauge gradient: red rings → blue fill line → level-colored current node */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                    {/* Track (gray) — from L0 center to L5 center */}
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      left: 'calc(100% / 12)',
                      right: 'calc(100% / 12)',
                      height: '3px',
                      background: 'rgba(148,163,184,0.18)',
                      borderRadius: '2px'
                    }} />
                    {/* Progress line — snaps from L0 center to currentLvl center */}
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      left: 'calc(100% / 12)',
                      width: currentLvl === 0
                        ? '0px'
                        : `calc(${currentLvl} * 100% / 6)`,
                      height: '3px',
                      background: 'linear-gradient(90deg, #f43f5e, #a855f7, #3b82f6)',
                      borderRadius: '2px',
                      transition: 'width 0.6s ease'
                    }} />
 
                    {[0,1,2,3,4,5].map(lvl => {
                      const isActive  = lvl <= currentLvl;
                      const isCurrent = lvl === currentLvl;
                      const lvlColor  = LEVEL_COLORS[lvl];
                      return (
                        <div key={lvl} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                          <div style={{
                            width: isCurrent ? '40px' : '30px',
                            height: isCurrent ? '40px' : '30px',
                            borderRadius: '50%',
                            border: `2px solid ${isActive ? '#f43f5e' : 'rgba(148,163,184,0.3)'}`,
                            background: isCurrent
                              ? lvlColor
                              : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: isCurrent ? '#fff' : isActive ? '#f43f5e' : 'var(--text-muted)',
                            boxShadow: isCurrent ? `0 0 0 4px ${lvlColor}30` : 'none',
                            transition: 'all 0.25s ease',
                            marginTop: isCurrent ? '-5px' : '0'
                          }}>
                            L{lvl}
                          </div>
                          <div style={{
                            fontSize: '0.62rem',
                            fontWeight: isCurrent ? 700 : 500,
                            color: isCurrent ? lvlColor : isActive ? 'var(--text-secondary)' : 'var(--text-muted)',
                            marginTop: '7px',
                            whiteSpace: 'nowrap',
                            textAlign: 'center'
                          }}>
                            {lvlNames[lvl]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Domain Breakdown & Pentagon Matrix ─── */}
      <div className="row g-4 mb-4">
        {/* Left: Domain Maturity Breakdown */}
        <div className="col-lg-6 col-12">
          <div className="card glass-panel h-100 border-0">
            <div className="card-body p-4">
              <style dangerouslySetInnerHTML={{__html: `
                .domain-row-item {
                  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .domain-row-item:hover {
                  background: rgba(148, 163, 184, 0.08) !important;
                  transform: translateX(6px);
                }
              `}} />
              <div className="card-title fw-bold" style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Domain Maturity Breakdown
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '24px' }}>
                Score per SDLC domain (0 = Traditional → 5 = Agentic Enterprise) · Click a domain to filter
              </p>
              
              <div className="d-flex flex-column gap-2">
                {AREA_LABELS.map((area, idx) => {
                  const score = categoryScores[area];
                  const scoreNum = score != null ? score : 0;
                  
                  // Icon mapping
                  const icons = {
                    'Requirements': 'assignment',
                    'Architecture': 'architecture',
                    'Development': 'code',
                    'Testing': 'science',
                    'Deployment': 'rocket_launch'
                  };
                  const colors = {
                    'Requirements': '#ef4444', // Red
                    'Architecture': '#3b82f6', // Blue
                    'Development': '#10b981', // Green
                    'Testing': '#f59e0b',     // Orange
                    'Deployment': '#8b5cf6'    // Purple
                  };
                  const bgColors = {
                    'Requirements': 'rgba(239, 68, 68, 0.1)',
                    'Architecture': 'rgba(59, 130, 246, 0.1)',
                    'Development': 'rgba(16, 185, 129, 0.1)',
                    'Testing': 'rgba(245, 158, 11, 0.1)',
                    'Deployment': 'rgba(139, 92, 246, 0.1)'
                  };
                  
                  const icon = icons[area] || 'assignment';
                  const color = colors[area] || '#6366f1';
                  const bgColor = bgColors[area] || 'rgba(99, 102, 241, 0.1)';
                  const qCount = areaQCounts[idx] || 0;
                  const lvlName = getLevelName(scoreNum);
                  const isSelected = selectedDomain === area;
                  
                  return (
                    <div
                      key={area}
                      onClick={() => setSelectedDomain(prev => prev === area ? null : area)}
                      className={`d-flex flex-column domain-row-item ${isSelected ? 'domain-row-item-selected' : ''}`}
                      style={{
                        cursor: 'pointer',
                        padding: '10px 14px',
                        margin: '0 -10px',
                        borderRadius: '12px',
                        background: isSelected ? `${color}0e` : 'transparent',
                        border: `1px solid ${isSelected ? color + '55' : 'transparent'}`,
                        boxShadow: isSelected ? `0 4px 15px ${color}10` : 'none',
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: bgColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <span className="material-icons" style={{ fontSize: '1.1rem', color }}>
                              {icon}
                            </span>
                          </div>
                          <div style={{ marginLeft: '12px', display: 'flex', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                              {area}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', marginLeft: '6px' }}>
                              {qCount}Q
                            </span>
                          </div>
                        </div>
                        
                        <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                            {lvlName}
                          </span>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: color }}>
                            {scoreNum.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Horizontal progress bar */}
                      <div style={{
                        marginTop: '8px',
                        height: '6px',
                        background: 'rgba(148, 163, 184, 0.12)',
                        borderRadius: '10px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${(scoreNum / 5) * 100}%`,
                          height: '100%',
                          background: color,
                          borderRadius: '10px',
                          transition: 'width 0.6s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right: Maturity Pentagon Matrix */}
        <div className="col-lg-6 col-12 d-print-none-graphic">
          <div className="card glass-panel h-100 border-0">
            <div className="card-body p-4 d-flex flex-column">
              <div className="card-title fw-bold" style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Maturity Pentagon Matrix
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                Visual map of your capabilities across all 5 dimensions · Click a node to filter
              </p>
              
              <div className="d-flex justify-content-center align-items-center flex-grow-1" style={{ overflow: 'hidden' }}>
                <PentagonDiagram
                  overallScore={avgLevel}
                  categoryScores={categoryScores}
                  selectedDomain={selectedDomain}
                  onNodeClick={(name) => {
                    setSelectedDomain(prev => prev === name ? null : name);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Maturity Breakdown & Insights Dashboard ─── */}
      <div ref={dashboardRef} style={{ scrollMarginTop: '84px' }}>
        {assessment && questions.length > 0 && (() => {
        // Filter questions by selected domain if active
        const activeQs = selectedDomain
          ? questions.filter(q => q.area === selectedDomain)
          : questions;
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

        const activeToolPct    = totalQs > 0 ? Math.round((activeToolCovered / totalQs) * 100) : 0;
        const activeUniqueTools = Array.from(activeToolSet);

        const distColors = { 0: '#94a3b8', 1: '#f59e0b', 2: '#06b6d4', 3: '#6366f1', 4: '#10b981', 5: '#d946ef' };
        const levelNames = { 0: 'Traditional', 1: 'Assisted', 2: 'Delegated', 3: 'Supervised', 4: 'Autonomous', 5: 'Agentic' };

        const NODE_COLORS = {
          Architecture: '#3b82f6',
          Requirements: '#ef4444',
          Development: '#10b981',
          Deployment: '#8b5cf6',
          Testing: '#f59e0b'
        };
        const domainColor = selectedDomain ? (NODE_COLORS[selectedDomain] || '#06b6d4') : null;

        return (
          <div className="d-flex flex-column gap-4 mb-4" key="insights-dashboard">

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
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                  >
                    ✕ Reset
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Overall · All domains · Click any domain breakdown row or pentagon node to filter
                </span>
              )}
            </div>

            {/* Row 2: Key Strengths & Priority Gaps */}
            <div className="row g-4">
              {/* Key Strengths */}
              <div className="col-lg-6 col-12">
                <div className="card glass-panel h-100 border-0">
                  <div className="card-body p-4">
                    <div className="card-title fw-bold" style={{ fontSize: '1.05rem', color: 'var(--green-bright)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Key Strengths
                    </div>
                    {activeStrengths.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {activeStrengths.slice(0, 5).map((s, idx) => (
                          <div key={idx} className="d-flex align-items-center justify-content-between rounded-3 border" style={{ padding: '10px 14px', background: 'rgba(25, 135, 84, 0.03)', borderColor: 'rgba(25, 135, 84, 0.12)' }}>
                            <div className="d-flex align-items-center gap-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '28px', height: '28px', background: 'rgba(25, 135, 84, 0.08)', flexShrink: 0 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#198754' }}>
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                              <div>
                                <div className="fw-bold" style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: '1.25' }}>{s.practice}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {s.area} &rsaquo; {s.subArea}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                        No practices met the Supervised (L3) threshold {selectedDomain ? `in ${selectedDomain}` : 'across all domains'}.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Priority Gaps */}
              <div className="col-lg-6 col-12">
                <div className="card glass-panel h-100 border-0">
                  <div className="card-body p-4">
                    <div className="card-title fw-bold" style={{ fontSize: '1.05rem', color: '#f43f5e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Priority Gaps
                    </div>
                    {activeGaps.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {activeGaps.slice(0, 5).map((g, idx) => (
                          <div key={idx} className="d-flex align-items-center justify-content-between rounded-3 border" style={{ padding: '10px 14px', background: 'rgba(220, 53, 69, 0.03)', borderColor: 'rgba(220, 53, 69, 0.12)' }}>
                            <div className="d-flex align-items-center gap-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '28px', height: '28px', background: 'rgba(220, 53, 69, 0.08)', flexShrink: 0 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#dc3545' }}>
                                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                              </div>
                              <div>
                                <div className="fw-bold" style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: '1.25' }}>{g.practice}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {g.area} &rsaquo; {g.subArea}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                        No critical gaps identified {selectedDomain ? `in ${selectedDomain}` : 'across all domains'}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        );
      })()}
      </div>

      {/* ─── AI Remarks ─── */}
      <div className="card glass-panel mb-4 border-0">
        <div className="card-body p-4">
          <div className="card-title d-flex align-items-center gap-2 mb-4 flex-wrap">
            <span style={{ fontWeight: 750, fontSize: '1.05rem', color: 'var(--text-primary)' }}>AI Agent Analysis</span>
            {generatingRemarks && (
              <span className="tuf-badge tuf-badge-blue">
                <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px', borderWidth: '1.5px', color: '#06b6d4 !important' }} />
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
      </div>

      {/* ─── Feedback ─── */}
      <div className="card glass-panel d-print-none mb-4 border-0">
        <div className="card-body p-4">
          <div style={{ fontWeight: 750, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Report Feedback</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Rate the quality of the AI analysis and recommendations.
          </p>

          {feedbackSubmitted && (
            <div className="alert alert-success d-flex align-items-center gap-2 mb-4" style={{ background: 'var(--green-glow-sm)', borderColor: 'rgba(16,185,129,0.2)', color: 'var(--green-bright)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Feedback submitted successfully. You can update your rating or comments below.</span>
            </div>
          )}

          <form onSubmit={handleFeedbackSubmit}>
            <div className="mb-4">
              <label className="form-label" style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>
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
                      color: s <= displayRating ? '#f5a623' : '#475569',
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
              <label htmlFor="comments" className="form-label" style={{ color: 'var(--text-secondary)' }}>Comments (optional)</label>
              <textarea
                id="comments" rows={3} className="form-control"
                placeholder="What could be improved in the analysis?"
                value={comments} onChange={e => setComments(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-premium"
              disabled={submittingFeedback}
              style={{
                padding: '10px 22px',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #198754 0%, #10b981 100%)',
                border: 'none',
                color: '#fff',
                fontWeight: '700',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(25, 135, 84, 0.35)',
                transform: 'scale(1)',
                transition: 'all 0.2s ease-in-out',
                opacity: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(25, 135, 84, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(25, 135, 84, 0.35)';
              }}
            >
              {submittingFeedback ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Submitting…
                </>
              ) : feedbackSubmitted ? (
                'Update Feedback'
              ) : (
                'Submit Feedback'
              )}
            </button>
            {rating === 0 && <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Please select a star rating first</span>}
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
