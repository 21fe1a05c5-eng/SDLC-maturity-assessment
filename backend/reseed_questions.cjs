const mysql = require('mysql2/promise');

// Exactly 5 questions per area, selected from the PDF data with precise subArea and practice fields
const QUESTIONS = [
  // ─── REQUIREMENTS (5) ───────────────────────────────────────────────────────
  {
    area: "Requirements",
    subArea: "Product Discovery & Ideation",
    practice: "Idea generation & exploration",
    questionText: "To what extent does your team use AI tools (e.g. ChatGPT, Gemini) to generate, explore and validate new product ideas before requirements are written?"
  },
  {
    area: "Requirements",
    subArea: "Product Discovery & Ideation",
    practice: "Problem discovery & framing",
    questionText: "To what extent does your team use AI to analyze user signals, business data, and market inputs to identify and frame high-value problems to solve?"
  },
  {
    area: "Requirements",
    subArea: "Requirement Engineering",
    practice: "Requirements elicitation and analysis",
    questionText: "To what extent does your team use AI to capture, synthesize, and structure requirements from conversations and documents into actionable, traceable specifications?"
  },
  {
    area: "Requirements",
    subArea: "Requirement Engineering",
    practice: "Technical feasibility and risk assessment",
    questionText: "To what extent does your team use AI to assess technical feasibility, constraints, dependencies, and risks early and produce decision-ready insights with explainable rationale?"
  },
  {
    area: "Requirements",
    subArea: "User Experience & Insights",
    practice: "Feedback & sentiment analysis",
    questionText: "To what extent does your team use AI to analyze user feedback and sentiment at scale to inform requirements and prioritization decisions?"
  },

  // ─── ARCHITECTURE (5) ───────────────────────────────────────────────────────
  {
    area: "Architecture",
    subArea: "Architecture",
    practice: "Architecture Synthesiser",
    questionText: "To what extent is the following true in your current practice: An agent produces target-state blueprint options with trade-off analysis. The architect selects and approves a direction — they do not synthesise options themselves. The agent does the synthesis work."
  },
  {
    area: "Architecture",
    subArea: "Architecture",
    practice: "Auto-Generate Architecture Diagrams",
    questionText: "To what extent is the following true in your current practice: The first version of any architecture diagram is AI-generated from code, IaC, or natural language. An engineer directing AI to produce a diagram, then refining it, is the standard workflow — not an engineer drawing from scratch."
  },
  {
    area: "Architecture",
    subArea: "Architecture",
    practice: "Drift Detection in PRs",
    questionText: "To what extent is the following true in your current practice: The agent inspects every PR for architecture drift and can block a clear violation without a human stepping in. If a human must read every PR to catch drift, the gate is not real."
  },
  {
    area: "Architecture",
    subArea: "Architecture & Design Governance",
    practice: "Architecture Decision Governance & Traceability",
    questionText: "To what extent does your team use AI to capture and govern architecture decisions, surface trade-offs, and maintain traceability across requirements, designs, and implementation?"
  },
  {
    area: "Architecture",
    subArea: "Legacy Modernization & Decomposition",
    practice: "System Decomposition Analysis",
    questionText: "To what extent does your team use AI to evaluate an existing application's codebase and identify logical boundaries for refactoring into smaller, independent services or modules?"
  },

  // ─── DEVELOPMENT (5) ────────────────────────────────────────────────────────
  {
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Code Generation",
    questionText: "To what extent does your team use AI to generate production-grade code from intent or specs, with security, quality, and traceability guardrails in place?"
  },
  {
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Code Review",
    questionText: "To what extent is the following true in your current practice: AI participates in every code review, flagging bugs and security issues. A human reads every flag and makes the final call — the AI accelerates the reviewer, it does not replace the human gate."
  },
  {
    area: "Development",
    subArea: "Development",
    practice: "AI Coding Assistant - Agent Mode",
    questionText: "To what extent is the following true in your current practice: Every engineer uses AI in agent mode for multi-step tasks — not just autocomplete. If removing AI tools would only affect speed and leave the process unchanged, this is the level the team is at."
  },
  {
    area: "Development",
    subArea: "Development",
    practice: "Custom Agents via MCP & Scripts",
    questionText: "To what extent is the following true in your current practice: An agent can open a pull request on its own without a human writing the change by hand. The human's role is to review and approve the PR — not to author the code. This is the line between L1 and L2."
  },
  {
    area: "Development",
    subArea: "Technical Debt & Refactoring",
    practice: "Technical debt identification",
    questionText: "To what extent does your team use AI to proactively identify and classify technical debt across the codebase, with prioritized recommendations for remediation?"
  },

  // ─── TESTING (5) ────────────────────────────────────────────────────────────
  {
    area: "Testing",
    subArea: "Test Design & Development",
    practice: "Test Generation",
    questionText: "To what extent is the following true in your current practice: AI generates test cases from requirements covering happy paths, edge cases, and negative scenarios. A human reviews and selects which cases to use — the engineer does not write test cases from scratch."
  },
  {
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Test Suite Optimization",
    questionText: "To what extent does your team use AI to optimize test suite selection and ordering — reducing execution time while maintaining coverage confidence on every pipeline run?"
  },
  {
    area: "Testing",
    subArea: "Testing",
    practice: "E2E Test Execution Workflow",
    questionText: "To what extent is the following true in your current practice: The system can block a bad change without a human clicking approve. Agents generate, run, and triage failures automatically. If a human must approve every test run result, the quality gate is not real."
  },
  {
    area: "Testing",
    subArea: "Testing",
    practice: "Synthetic Test Data Creation",
    questionText: "To what extent is the following true in your current practice: The agent generates test data at scale from schema definitions and edge-case rules set by the engineer. A human does not curate or maintain test datasets manually — the agent produces them on demand."
  },
  {
    area: "Testing",
    subArea: "Defect Management",
    practice: "Defect Triaging",
    questionText: "To what extent does your team use AI to automatically classify, prioritize, and route defects — reducing the manual overhead of triaging bug reports before engineers investigate?"
  },

  // ─── DEPLOYMENT (5) ─────────────────────────────────────────────────────────
  {
    area: "Deployment",
    subArea: "CD / CI-CD",
    practice: "Deployment Script Generation",
    questionText: "To what extent is the following true in your current practice: AI generates deployment scripts, Helm charts, and YAML manifests. The engineer reviews and triggers deployment — they do not write deployment config from scratch."
  },
  {
    area: "Deployment",
    subArea: "CD / CI-CD",
    practice: "Self-Healing Systems",
    questionText: "To what extent is the following true in your current practice: When a service degrades, the system catches it, executes remediation, and — if the fix meets the defined guardrails — resolves it before anyone on the team knows it happened. Humans are pulled in only for ambiguous or high-risk incidents."
  },
  {
    area: "Deployment",
    subArea: "CI / CI-CD",
    practice: "AI-Integrated Quality Gates",
    questionText: "To what extent is the following true in your current practice: AI quality checks — linting, security scanning, coverage — run automatically on every commit. A human reads the results and decides whether to proceed. The checks run themselves; the human is still the gate."
  },
  {
    area: "Deployment",
    subArea: "CI / CI-CD",
    practice: "Pipeline Creation Using AI",
    questionText: "To what extent is the following true in your current practice: An agent generates CI pipeline configuration from requirements. The engineer reviews and approves — they do not write YAML or pipeline scripts from scratch."
  },
  {
    area: "Deployment",
    subArea: "Continuous Integration & Delivery",
    practice: "Release Risk Assessment & Controls",
    questionText: "To what extent does your team use AI to assess release risk — analyzing change scope, test coverage, and deployment history — before approving a release to production?"
  }
];

async function reseedQuestions() {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'sdlc_maturity'
  });

  try {
    await conn.execute('DELETE FROM questions');
    console.log('✓ Cleared existing questions');

    for (const q of QUESTIONS) {
      await conn.execute(
        'INSERT INTO questions (area, sub_area, practice, type, question_text) VALUES (?, ?, ?, ?, ?)',
        [q.area, q.subArea, q.practice, 'extent', q.questionText]
      );
    }
    console.log(`✓ Inserted ${QUESTIONS.length} questions (5 per section)`);

    const [rows] = await conn.execute('SELECT area, COUNT(*) as cnt FROM questions GROUP BY area ORDER BY FIELD(area,"Requirements","Architecture","Development","Testing","Deployment")');
    console.log('\nQuestion distribution:');
    rows.forEach(r => console.log(`  ${r.area}: ${r.cnt} questions`));

  } finally {
    await conn.end();
    console.log('\n✓ Done!');
  }
}

reseedQuestions().catch(console.error);
