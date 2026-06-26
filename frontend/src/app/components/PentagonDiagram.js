'use client';

import { useMemo } from 'react';

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
  0: '#708090',
  1: '#f59e0b',
  2: '#06b6d4',
  3: '#6366f1',
  4: '#10b981',
  5: '#d946ef'
};

const DOMAIN_COLORS = {
  'Requirements': '#ef4444',
  'Architecture': '#3b82f6',
  'Development': '#10b981',
  'Testing': '#f59e0b',
  'Deployment': '#8b5cf6'
};

const DOMAIN_GRADIENTS = {
  'Requirements': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  'Architecture': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  'Development': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'Testing': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'Deployment': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
};

export default function PentagonDiagram({ overallScore, categoryScores, onNodeClick, selectedDomain }) {
  const scoreVal = overallScore != null ? overallScore : 0;

  const nodeData = useMemo(() => {
    return [
      { id: 'architecture', name: 'Architecture', top: '11.5%', left: '50%' },
      { id: 'requirements', name: 'Requirements', top: '36%', left: '15.5%' },
      { id: 'development', name: 'Development', top: '36%', left: '84.5%' },
      { id: 'deployment', name: 'Deployment', top: '76%', left: '28.5%' },
      { id: 'testing', name: 'Testing', top: '76%', left: '71.5%' }
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
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pentagon-pulse {
            0% { transform: translate(-50%, -50%) scale(0.96); opacity: 0.95; }
            50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.25; }
            100% { transform: translate(-50%, -50%) scale(0.96); opacity: 0.95; }
          }
        `}} />

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

          const nodeColor = DOMAIN_COLORS[node.name] || '#708090';
          const nodeGradient = DOMAIN_GRADIENTS[node.name] || 'linear-gradient(135deg, #708090 0%, #4f5d6b 100%)';

          const highlightBootstrapClass = isSelected 
            ? 'border border-2 border-white shadow-lg' 
            : 'shadow-sm';

          // Inject styling depending on isSelected (hollow vs solid)
          const styleInjection = isSelected
            ? `
              .pentagon-node-${node.id}::before {
                background: ${nodeGradient} !important;
                border: 2.5px solid #ffffff !important;
                box-shadow: 0 0 15px ${nodeColor}80 !important;
              }
              .pentagon-node-${node.id}::after {
                background: transparent !important;
              }
              .pentagon-node-${node.id} .pentagon-node-title,
              .pentagon-node-${node.id} .pentagon-node-level,
              .pentagon-node-${node.id} .pentagon-node-subtitle {
                color: #ffffff !important;
                text-shadow: none !important;
              }
            `
            : `
              .pentagon-node-${node.id}::before {
                background: #ffffff !important;
                border: 2.5px solid ${nodeColor} !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
              }
              .pentagon-node-${node.id}::after {
                background: transparent !important;
              }
              .pentagon-node-${node.id} .pentagon-node-title,
              .pentagon-node-${node.id} .pentagon-node-level {
                color: ${nodeColor} !important;
                text-shadow: none !important;
              }
              .pentagon-node-${node.id} .pentagon-node-subtitle {
                color: ${nodeColor}cc !important;
                text-shadow: none !important;
              }
            `;

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
                zIndex: 5,
              }}
            >
              <style dangerouslySetInnerHTML={{__html: styleInjection}} />


              <div
                className={`pentagon-node pentagon-node-${node.id} ${highlightBootstrapClass}`}
                style={{
                  position: 'relative',
                  top: 0,
                  left: 0,
                  '--node-accent': nodeColor,
                  cursor: onNodeClick ? 'pointer' : 'default',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected
                    ? `0 0 25px ${nodeColor}90`
                    : undefined,
                  zIndex: 5,
                  opacity: selectedDomain && !isSelected ? 0.45 : 1
                }}
                onClick={() => onNodeClick && onNodeClick(node.name)}
              >
                {isSelected && <div className="pentagon-node-shine"></div>}
                <span className="pentagon-node-title">{node.name}</span>
                <span className="pentagon-node-level" style={{ fontWeight: '800' }}>
                  {hasScore ? `L${roundedLvl}` : 'N/A'}
                </span>
                <span className="pentagon-node-subtitle" style={{ opacity: 0.85 }}>
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
