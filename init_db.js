const fs = require('fs');
const path = require('path');

const questions = [
  {
    id: 1,
    area: "Requirements",
    subArea: "Product Discovery & Ideation",
    practice: "Idea generation & exploration",
    type: "extent",
    questionText: "To what extent does your team use AI for idea generation & exploration?"
  },
  {
    id: 2,
    area: "Requirements",
    subArea: "Product Discovery & Ideation",
    practice: "Problem discovery & framing",
    type: "extent",
    questionText: "To what extent does your team use AI for problem discovery & framing?"
  },
  {
    id: 3,
    area: "Requirements",
    subArea: "Requirement Engineering",
    practice: "Requirements elicitation and analysis",
    type: "extent",
    questionText: "To what extent does your team use AI for requirements elicitation and analysis?"
  },
  {
    id: 4,
    area: "Requirements",
    subArea: "Requirement Engineering",
    practice: "Technical feasibility and risk assessment",
    type: "extent",
    questionText: "To what extent does your team use AI for technical feasibility and risk assessment?"
  },
  {
    id: 5,
    area: "Requirements",
    subArea: "Requirement Prioritization & Road‑mapping",
    practice: "Dependency & sequencing analysis",
    type: "extent",
    questionText: "To what extent does your team use AI for dependency & sequencing analysis?"
  },
  {
    id: 6,
    area: "Requirements",
    subArea: "Requirement Prioritization & Road‑mapping",
    practice: "Requirement prioritization & trade‑off analysis",
    type: "extent",
    questionText: "To what extent does your team use AI for requirement prioritization & trade‑off analysis?"
  },
  {
    id: 7,
    area: "Requirements",
    subArea: "Requirement Prioritization & Road‑mapping",
    practice: "Roadmap scenario planning",
    type: "extent",
    questionText: "To what extent does your team use AI for roadmap scenario planning?"
  },
  {
    id: 8,
    area: "Requirements",
    subArea: "Requirements",
    practice: "Backlog Refinement",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: AI decomposes vague backlog items into sized features with acceptance criteria. The engineer's role is to judge and adjust AI output, not to write stories from a blank page."
  },
  {
    id: 9,
    area: "Requirements",
    subArea: "Requirements",
    practice: "Bidirectional Traceability",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The agent maintains and enforces traceability automatically on every PR. The engineer sets the traceability policy once; the agent applies it continuously without prompting."
  },
  {
    id: 10,
    area: "Requirements",
    subArea: "Requirements",
    practice: "Effort, Cost & Risk Simulation",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The agent monitors cost and risk continuously against thresholds the team has set, and alerts automatically when they are breached. Humans are not periodically reviewing a spreadsheet - the system comes to them."
  },
  {
    id: 11,
    area: "Requirements",
    subArea: "Requirements",
    practice: "Impact Analysis",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: An agent independently traces a change request across the codebase and produces an impact matrix. The engineer validates the output - they do not do the tracing themselves."
  },
  {
    id: 12,
    area: "Requirements",
    subArea: "Requirements",
    practice: "OCM & Course Correction",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The system catches scope or risk drift and raises it before a human notices. If a human is always the one spotting drift, this practice is not Achieved."
  },
  {
    id: 13,
    area: "Requirements",
    subArea: "Requirements",
    practice: "Root-to-Live Discovery & Sequencing",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: When scope changes, the system replans automatically and escalates only when sequencing decisions exceed defined risk thresholds. A human does not replan by hand - they approve or override the agent's plan."
  },
  {
    id: 14,
    area: "Requirements",
    subArea: "Requirements",
    practice: "Transcript → Requirements",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The first draft of every requirement comes from AI processing meeting notes or transcripts - not from a human writing from scratch. The engineer directs, refines, and approves; authoring is AI's job."
  },
  {
    id: 15,
    area: "Requirements",
    subArea: "User Experience & Insights",
    practice: "Experience pain‑point identification",
    type: "extent",
    questionText: "To what extent does your team use AI for experience pain‑point identification?"
  },
  {
    id: 16,
    area: "Requirements",
    subArea: "User Experience & Insights",
    practice: "Feedback & sentiment analysis",
    type: "extent",
    questionText: "To what extent does your team use AI for feedback & sentiment analysis?"
  },
  {
    id: 17,
    area: "Requirements",
    subArea: "User Experience & Insights",
    practice: "Persona & journey modeling",
    type: "extent",
    questionText: "To what extent does your team use AI for persona & journey modeling?"
  },
  {
    id: 18,
    area: "Requirements",
    subArea: "User Experience & Insights",
    practice: "User research synthesis",
    type: "extent",
    questionText: "To what extent does your team use AI for user research synthesis?"
  },
  {
    id: 19,
    area: "Architecture",
    subArea: "Architecture",
    practice: "Architecture Synthesiser",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: An agent produces target-state blueprint options with trade-off analysis. The architect selects and approves a direction - they do not synthesise options themselves. The agent does the synthesis work."
  },
  {
    id: 20,
    area: "Architecture",
    subArea: "Architecture",
    practice: "Auto-Generate Architecture Diagrams",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The first version of any architecture diagram is AI-generated from code, IaC, or natural language. An engineer directing AI to produce a diagram, then refining it, is the standard workflow - not an engineer drawing from scratch."
  },
  {
    id: 21,
    area: "Architecture",
    subArea: "Architecture",
    practice: "Automated Drift Remediation",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: Low-risk drift is remediated and shipped automatically when tests pass and the change meets defined guardrails. Humans are only pulled in when the drift is high-risk or the guardrails cannot classify it. Humans set the guardrails - the agent enforces them."
  },
  {
    id: 22,
    area: "Architecture",
    subArea: "Architecture",
    practice: "Compliance & Security Policy Advisor",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The system notices a compliance gap before a person does and raises it automatically. If a human is the one discovering policy violations, the monitoring is not at this level."
  },
  {
    id: 23,
    area: "Architecture",
    subArea: "Architecture",
    practice: "Drift Detection in PRs",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The agent inspects every PR for architecture drift and can block a clear violation without a human stepping in. If a human must read every PR to catch drift, the gate is not real."
  },
  {
    id: 24,
    area: "Architecture",
    subArea: "Architecture",
    practice: "Extract Architecture from Code",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: AI reads the codebase and generates architecture documentation and component maps. Engineers do not draw diagrams from memory - they review and correct AI-generated output. Critically, the AI can see the actual codebase, not just generic knowledge."
  },
  {
    id: 25,
    area: "Architecture",
    subArea: "Architecture",
    practice: "FinOps Modeller & Planner",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The agent flags architecture cost implications and overspend automatically against thresholds the team has set. Cost decisions are not discovered in a monthly review - the system surfaces them in real time."
  },
  {
    id: 26,
    area: "Architecture",
    subArea: "Architecture & Design Governance",
    practice: "Architecture & Design Quality Governance",
    type: "extent",
    questionText: "To what extent does your team use AI for architecture & design quality governance?"
  },
  {
    id: 27,
    area: "Architecture",
    subArea: "Architecture & Design Governance",
    practice: "Architecture Decision Governance & Traceability",
    type: "extent",
    questionText: "To what extent does your team use AI for architecture decision governance & traceability?"
  },
  {
    id: 28,
    area: "Architecture",
    subArea: "Architecture & Design Governance",
    practice: "Architecture Decision Knowledge management",
    type: "extent",
    questionText: "To what extent does your team use AI for architecture decision knowledge management?"
  },
  {
    id: 29,
    area: "Architecture",
    subArea: "Architecture & Design Governance",
    practice: "Architecture Decision Review & Approval Governance",
    type: "extent",
    questionText: "To what extent does your team use AI for architecture decision review & approval governance?"
  },
  {
    id: 30,
    area: "Architecture",
    subArea: "Architecture & Design Governance",
    practice: "Architecture and design reviews",
    type: "extent",
    questionText: "To what extent does your team use AI for architecture and design reviews?"
  },
  {
    id: 31,
    area: "Architecture",
    subArea: "Architecture & Design Governance",
    practice: "Candidate Architecture Generation",
    type: "extent",
    questionText: "To what extent does your team use AI for candidate architecture generation?"
  },
  {
    id: 32,
    area: "Architecture",
    subArea: "Architecture & Design Governance",
    practice: "Decision traceability",
    type: "extent",
    questionText: "To what extent does your team use AI for decision traceability?"
  },
  {
    id: 33,
    area: "Architecture",
    subArea: "Architecture & Design Governance",
    practice: "Design Documentation Governance & Traceability (or) Design Traceability Management",
    type: "extent",
    questionText: "To what extent does your team use AI for design documentation governance & traceability (or) design traceability management?"
  },
  {
    id: 34,
    area: "Architecture",
    subArea: "Legacy Modernization & Decomposition",
    practice: "System Decomposition Analysis",
    type: "extent",
    questionText: "To what extent does your team use AI for system decomposition analysis?"
  },
  {
    id: 35,
    area: "Development",
    subArea: "Build Process Management",
    practice: "Build Artifact generation and storage",
    type: "extent",
    questionText: "To what extent does your team use AI for build artifact generation and storage?"
  },
  {
    id: 36,
    area: "Development",
    subArea: "Build Process Management",
    practice: "Build Automation Engineering",
    type: "extent",
    questionText: "To what extent does your team use AI for build automation engineering?"
  },
  {
    id: 37,
    area: "Development",
    subArea: "Build Process Management",
    practice: "Build Execution",
    type: "extent",
    questionText: "To what extent does your team use AI for build execution?"
  },
  {
    id: 38,
    area: "Development",
    subArea: "Build Process Management",
    practice: "Build Failure Management",
    type: "extent",
    questionText: "To what extent does your team use AI for build failure management?"
  },
  {
    id: 39,
    area: "Development",
    subArea: "Build Process Management",
    practice: "Build performance optimization",
    type: "extent",
    questionText: "To what extent does your team use AI for build performance optimization?"
  },
  {
    id: 40,
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Code Branching & Merge Governance",
    type: "extent",
    questionText: "To what extent does your team use AI for code branching & merge governance?"
  },
  {
    id: 41,
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Code Generation",
    type: "extent",
    questionText: "To what extent does your team use AI for code generation?"
  },
  {
    id: 42,
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Code Quality Standards Governance & Enforcement",
    type: "extent",
    questionText: "To what extent does your team use AI for code quality standards governance & enforcement?"
  },
  {
    id: 43,
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Code Review",
    type: "extent",
    questionText: "To what extent does your team use AI for code review?"
  },
  {
    id: 44,
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Code base Management",
    type: "extent",
    questionText: "To what extent does your team use AI for code base management?"
  },
  {
    id: 45,
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Code refactoring and optimization",
    type: "extent",
    questionText: "To what extent does your team use AI for code refactoring and optimization?"
  },
  {
    id: 46,
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Defect prevention and resolution",
    type: "extent",
    questionText: "To what extent does your team use AI for defect prevention and resolution?"
  },
  {
    id: 47,
    area: "Development",
    subArea: "Code Development & Review",
    practice: "Security Vulnerability",
    type: "extent",
    questionText: "To what extent does your team use AI for security vulnerability?"
  },
  {
    id: 48,
    area: "Development",
    subArea: "Configuration & Dependency Management",
    practice: "Configuration file management",
    type: "extent",
    questionText: "To what extent does your team use AI for configuration file management?"
  },
  {
    id: 49,
    area: "Development",
    subArea: "Configuration & Dependency Management",
    practice: "Dependency management",
    type: "extent",
    questionText: "To what extent does your team use AI for dependency management?"
  },
  {
    id: 50,
    area: "Development",
    subArea: "Configuration & Dependency Management",
    practice: "Source & Version Management Governance",
    type: "extent",
    questionText: "To what extent does your team use AI for source & version management governance?"
  },
  {
    id: 51,
    area: "Development",
    subArea: "Development",
    practice: "AI Coding Assistant - Agent Mode",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: Every engineer uses AI in agent mode for multi-step tasks - not just autocomplete. If removing AI tools would only affect speed and leave the process unchanged, this is the level the team is at."
  },
  {
    id: 52,
    area: "Development",
    subArea: "Development",
    practice: "AI-Assisted Code Review",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: AI participates in every code review, flagging bugs and security issues. A human reads every flag and makes the final call - the AI accelerates the reviewer, it does not replace the human gate."
  },
  {
    id: 53,
    area: "Development",
    subArea: "Development",
    practice: "Custom Agents via MCP & Scripts",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: An agent can open a pull request on its own without a human writing the change by hand. The human's role is to review and approve the PR - not to author the code. This is the line between L1 and L2."
  },
  {
    id: 54,
    area: "Development",
    subArea: "Development",
    practice: "Custom Instructions & Skills",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: AI can see the team's own codebase, standards, and project context - not just generic public knowledge. Custom instructions or skills are in place so the agent is project-aware by default, not by the engineer pasting context manually each time."
  },
  {
    id: 55,
    area: "Development",
    subArea: "Development",
    practice: "Long-Running Agentic Tasks",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: Agents operate autonomously over extended periods. The safety net - automated rollback, fast catch-and-undo - is what makes this level achievable. If a wrong agent action cannot be caught and reversed quickly, the team cannot safely operate here."
  },
  {
    id: 56,
    area: "Development",
    subArea: "Development",
    practice: "Orchestrator & Sub-Agent Architecture",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: Complex tasks are handled by orchestrated multi-agent systems that plug into a shared internal platform - not individual engineers wiring up their own tools. Humans set the guardrails and escalation rules; agents handle execution and peer review within those rules."
  },
  {
    id: 57,
    area: "Development",
    subArea: "Technical Debt & Refactoring",
    practice: "Code Quality Measurement & Governance",
    type: "extent",
    questionText: "To what extent does your team use AI for code quality measurement & governance?"
  },
  {
    id: 58,
    area: "Development",
    subArea: "Technical Debt & Refactoring",
    practice: "Legacy code modernization",
    type: "extent",
    questionText: "To what extent does your team use AI for legacy code modernization?"
  },
  {
    id: 59,
    area: "Development",
    subArea: "Technical Debt & Refactoring",
    practice: "Refactoring Governance & Prioritization",
    type: "extent",
    questionText: "To what extent does your team use AI for refactoring governance & prioritization?"
  },
  {
    id: 60,
    area: "Development",
    subArea: "Technical Debt & Refactoring",
    practice: "Technical debt identification",
    type: "extent",
    questionText: "To what extent does your team use AI for technical debt identification?"
  },
  {
    id: 61,
    area: "Development",
    subArea: "Unit & Component Testing",
    practice: "Unit Test coverage",
    type: "extent",
    questionText: "To what extent does your team use AI for unit test coverage?"
  },
  {
    id: 62,
    area: "Development",
    subArea: "Unit & Component Testing",
    practice: "Unit test execution",
    type: "extent",
    questionText: "To what extent does your team use AI for unit test execution?"
  },
  {
    id: 63,
    area: "Development",
    subArea: "Unit & Component Testing",
    practice: "Unit test generation",
    type: "extent",
    questionText: "To what extent does your team use AI for unit test generation?"
  },
  {
    id: 64,
    area: "Testing",
    subArea: "Defect Management",
    practice: "Bug reproducibility insights",
    type: "extent",
    questionText: "To what extent does your team use AI for bug reproducibility insights?"
  },
  {
    id: 65,
    area: "Testing",
    subArea: "Defect Management",
    practice: "Defect Classification",
    type: "extent",
    questionText: "To what extent does your team use AI for defect classification?"
  },
  {
    id: 66,
    area: "Testing",
    subArea: "Defect Management",
    practice: "Defect Triaging",
    type: "extent",
    questionText: "To what extent does your team use AI for defect triaging?"
  },
  {
    id: 67,
    area: "Testing",
    subArea: "Defect Management",
    practice: "Defect prioritization",
    type: "extent",
    questionText: "To what extent does your team use AI for defect prioritization?"
  },
  {
    id: 68,
    area: "Testing",
    subArea: "Defect Management",
    practice: "Defect reporting",
    type: "extent",
    questionText: "To what extent does your team use AI for defect reporting?"
  },
  {
    id: 69,
    area: "Testing",
    subArea: "Defect Management",
    practice: "Defect resolution process",
    type: "extent",
    questionText: "To what extent does your team use AI for defect resolution process?"
  },
  {
    id: 70,
    area: "Testing",
    subArea: "Defect Management",
    practice: "Defect tracking",
    type: "extent",
    questionText: "To what extent does your team use AI for defect tracking?"
  },
  {
    id: 71,
    area: "Testing",
    subArea: "Defect Management",
    practice: "Executive summary generation",
    type: "extent",
    questionText: "To what extent does your team use AI for executive summary generation?"
  },
  {
    id: 72,
    area: "Testing",
    subArea: "Test Automation Governance",
    practice: "CI integration for test automation",
    type: "extent",
    questionText: "To what extent does your team use AI for ci integration for test automation?"
  },
  {
    id: 73,
    area: "Testing",
    subArea: "Test Automation Governance",
    practice: "Test Automation Enablement & Governance",
    type: "extent",
    questionText: "To what extent does your team use AI for test automation enablement & governance?"
  },
  {
    id: 74,
    area: "Testing",
    subArea: "Test Automation Governance",
    practice: "Test Script Lifecycle Management",
    type: "extent",
    questionText: "To what extent does your team use AI for test script lifecycle management?"
  },
  {
    id: 75,
    area: "Testing",
    subArea: "Test Automation Governance",
    practice: "Test automation strategy",
    type: "extent",
    questionText: "To what extent does your team use AI for test automation strategy?"
  },
  {
    id: 76,
    area: "Testing",
    subArea: "Test Design & Development",
    practice: "Test Automation Architecture & Enablement",
    type: "extent",
    questionText: "To what extent does your team use AI for test automation architecture & enablement?"
  },
  {
    id: 77,
    area: "Testing",
    subArea: "Test Design & Development",
    practice: "Test Coverage",
    type: "extent",
    questionText: "To what extent does your team use AI for test coverage?"
  },
  {
    id: 78,
    area: "Testing",
    subArea: "Test Design & Development",
    practice: "Test Generation",
    type: "extent",
    questionText: "To what extent does your team use AI for test generation?"
  },
  {
    id: 79,
    area: "Testing",
    subArea: "Test Design & Development",
    practice: "Test Prioritization",
    type: "extent",
    questionText: "To what extent does your team use AI for test prioritization?"
  },
  {
    id: 80,
    area: "Testing",
    subArea: "Test Design & Development",
    practice: "Test case development and traceability",
    type: "extent",
    questionText: "To what extent does your team use AI for test case development and traceability?"
  },
  {
    id: 81,
    area: "Testing",
    subArea: "Test Design & Development",
    practice: "Test data management",
    type: "extent",
    questionText: "To what extent does your team use AI for test data management?"
  },
  {
    id: 82,
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Defect logging and triage",
    type: "extent",
    questionText: "To what extent does your team use AI for defect logging and triage?"
  },
  {
    id: 83,
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Flaky test detection",
    type: "extent",
    questionText: "To what extent does your team use AI for flaky test detection?"
  },
  {
    id: 84,
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Test Environment Scaling",
    type: "extent",
    questionText: "To what extent does your team use AI for test environment scaling?"
  },
  {
    id: 85,
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Test Execution Reporting & Quality Insights",
    type: "extent",
    questionText: "To what extent does your team use AI for test execution reporting & quality insights?"
  },
  {
    id: 86,
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Test Quality Evidence & Insights Management",
    type: "extent",
    questionText: "To what extent does your team use AI for test quality evidence & insights management?"
  },
  {
    id: 87,
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Test Scripting",
    type: "extent",
    questionText: "To what extent does your team use AI for test scripting?"
  },
  {
    id: 88,
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Test Suite Optimization",
    type: "extent",
    questionText: "To what extent does your team use AI for test suite optimization?"
  },
  {
    id: 89,
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Test environment management",
    type: "extent",
    questionText: "To what extent does your team use AI for test environment management?"
  },
  {
    id: 90,
    area: "Testing",
    subArea: "Test Execution & Reporting",
    practice: "Test execution planning & Orchestration",
    type: "extent",
    questionText: "To what extent does your team use AI for test execution planning & orchestration?"
  },
  {
    id: 91,
    area: "Testing",
    subArea: "Test Strategy & Planning",
    practice: "Define test objectives and scope",
    type: "extent",
    questionText: "To what extent does your team use AI for define test objectives and scope?"
  },
  {
    id: 92,
    area: "Testing",
    subArea: "Test Strategy & Planning",
    practice: "Identify test types and levels",
    type: "extent",
    questionText: "To what extent does your team use AI for identify test types and levels?"
  },
  {
    id: 93,
    area: "Testing",
    subArea: "Test Strategy & Planning",
    practice: "Resource and environment planning",
    type: "extent",
    questionText: "To what extent does your team use AI for resource and environment planning?"
  },
  {
    id: 94,
    area: "Testing",
    subArea: "Test Strategy & Planning",
    practice: "Risk-based test prioritization",
    type: "extent",
    questionText: "To what extent does your team use AI for risk-based test prioritization?"
  },
  {
    id: 95,
    area: "Testing",
    subArea: "Testing",
    practice: "E2E Test Execution Workflow",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The system can block a bad change without a human clicking approve. Agents generate, run, and triage failures automatically. If a human must approve every test run result, the quality gate is not real."
  },
  {
    id: 96,
    area: "Testing",
    subArea: "Testing",
    practice: "Non-Functional & Performance Testing",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: SLA thresholds are set by the team; the agent enforces them on every change. Non-functional regressions are caught automatically - a human does not spot them in a periodic performance review."
  },
  {
    id: 97,
    area: "Testing",
    subArea: "Testing",
    practice: "Offline Evaluation of AI Features",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: For any feature with an AI component, the agent runs structured evals against a golden dataset before code ships. The human sets the golden dataset and pass threshold once; the agent enforces it on every change."
  },
  {
    id: 98,
    area: "Testing",
    subArea: "Testing",
    practice: "Synthetic Test Data Creation",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The agent generates test data at scale from schema definitions and edge-case rules set by the engineer. A human does not curate or maintain test datasets manually - the agent produces them on demand."
  },
  {
    id: 99,
    area: "Testing",
    subArea: "Testing",
    practice: "Test Case Generation",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: AI generates test cases from requirements covering happy paths, edge cases, and negative scenarios. A human reviews and selects which cases to use - the engineer does not write test cases from scratch."
  },
  {
    id: 100,
    area: "Testing",
    subArea: "Testing",
    practice: "Test Script Generation",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: Tests run automatically on every change - triggered by the pipeline, not by a human. The agent generates and executes scripts; a human reviews results and decides whether to proceed to the next stage."
  },
  {
    id: 101,
    area: "Testing",
    subArea: "Testing",
    practice: "Vulnerability Simulation",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: Adversarial probes and prompt injection tests run as part of every standard pipeline. Security regressions are caught by the system before anyone on the team notices - not by periodic manual pen testing."
  },
  {
    id: 102,
    area: "Deployment",
    subArea: "CD / CI-CD",
    practice: "Automated Release Notes",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: An agent generates release notes from commit history and PRs. The engineer approves before distribution - they do not write release notes by hand."
  },
  {
    id: 103,
    area: "Deployment",
    subArea: "CD / CI-CD",
    practice: "Capacity Prediction",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The system predicts capacity needs and triggers scaling recommendations before engineers react to a problem. If scaling decisions are made reactively by a human watching metrics, this is not Achieved."
  },
  {
    id: 104,
    area: "Deployment",
    subArea: "CD / CI-CD",
    practice: "Deployment Script Generation",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: AI generates deployment scripts, Helm charts, and YAML manifests. The engineer reviews and triggers deployment - they do not write deployment config from scratch."
  },
  {
    id: 105,
    area: "Deployment",
    subArea: "CD / CI-CD",
    practice: "Initial Triage Assistance",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: When something breaks in production, a system notices and surfaces probable causes before an engineer manually investigates. If an engineer is always the first to notice an incident, this practice is not Achieved."
  },
  {
    id: 106,
    area: "Deployment",
    subArea: "CD / CI-CD",
    practice: "Root Cause Analysis (RCA)",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: When something breaks, a system triages it and produces a structured RCA before a human investigates. The engineer validates and acts on the analysis - they do not start the investigation from raw logs."
  },
  {
    id: 107,
    area: "Deployment",
    subArea: "CD / CI-CD",
    practice: "Runtime FinOps Optimisation",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The agent rightsizes resources and terminates idle instances automatically within cost thresholds the team has set. Cost is not managed by a human reviewing spend reports - the system optimises continuously."
  },
  {
    id: 108,
    area: "Deployment",
    subArea: "CD / CI-CD",
    practice: "Self-Healing Systems",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: When a service degrades, the system catches it, executes remediation, and - if the fix meets the defined guardrails - resolves it before anyone on the team knows it happened. Humans are pulled in only for ambiguous or high-risk incidents."
  },
  {
    id: 109,
    area: "Deployment",
    subArea: "CI / CI-CD",
    practice: "AI-Integrated Quality Gates",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: AI quality checks - linting, security scanning, coverage - run automatically on every commit. A human reads the results and decides whether to proceed. The checks run themselves; the human is still the gate."
  },
  {
    id: 110,
    area: "Deployment",
    subArea: "CI / CI-CD",
    practice: "Agents Integrated in CI via API",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: AI agents run as first-class CI pipeline steps via API, performing analysis and validation as part of the automated build. The agent acts in the pipeline; a human reviews output before merge."
  },
  {
    id: 111,
    area: "Deployment",
    subArea: "CI / CI-CD",
    practice: "Code Quality, AI Slop & Data Lineage Reporting",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The system blocks quality regressions and low-quality AI-generated code automatically on every pipeline run. A human does not periodically audit for code quality - the gate is always on."
  },
  {
    id: 112,
    area: "Deployment",
    subArea: "CI / CI-CD",
    practice: "OSS, Deprecated Code & Evergreening Scans",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: Low-risk dependency updates and evergreening PRs ship automatically within guardrails the team has set. A human does not review every maintenance PR - the system handles routine updates and escalates only non-routine ones."
  },
  {
    id: 113,
    area: "Deployment",
    subArea: "CI / CI-CD",
    practice: "Pipeline Creation Using AI",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: An agent generates CI pipeline configuration from requirements. The engineer reviews and approves - they do not write YAML or pipeline scripts from scratch."
  },
  {
    id: 114,
    area: "Deployment",
    subArea: "CI / CI-CD",
    practice: "Shift-Left Agents in Developer IDE",
    type: "extent",
    questionText: "To what extent is the following true in your current practice: The same agents that run in CI are available in the developer's IDE via a shared platform (MCP), not individually wired up by each engineer. Issues are caught before commit using the same rules as CI."
  },
  {
    id: 115,
    area: "Deployment",
    subArea: "Continuous Integration & Delivery",
    practice: "CI/CD Flow Optimization & Throughput Engineering",
    type: "extent",
    questionText: "To what extent does your team use AI for ci/cd flow optimization & throughput engineering?"
  },
  {
    id: 116,
    area: "Deployment",
    subArea: "Continuous Integration & Delivery",
    practice: "Continuous Integration & Deployment Automation",
    type: "extent",
    questionText: "To what extent does your team use AI for continuous integration & deployment automation?"
  },
  {
    id: 117,
    area: "Deployment",
    subArea: "Continuous Integration & Delivery",
    practice: "Pipeline Reliability Forecasting & Prevention",
    type: "extent",
    questionText: "To what extent does your team use AI for pipeline reliability forecasting & prevention?"
  },
  {
    id: 118,
    area: "Deployment",
    subArea: "Continuous Integration & Delivery",
    practice: "Release Risk Assessment & Controls",
    type: "extent",
    questionText: "To what extent does your team use AI for release risk assessment & controls?"
  },
  {
    id: 119,
    area: "Deployment",
    subArea: "Continuous Integration & Delivery",
    practice: "Release Rollback & Recovery Management",
    type: "extent",
    questionText: "To what extent does your team use AI for release rollback & recovery management?"
  },
  {
    id: 120,
    area: "Deployment",
    subArea: "Continuous Integration & Delivery",
    practice: "Release gating and approvals",
    type: "extent",
    questionText: "To what extent does your team use AI for release gating and approvals?"
  }
];

const dbData = {
  users: [],
  assessments: [],
  feedback: [],
  settings: {
    activeAIProvider: "expert",
    apiKeys: {
      openai: "",
      gemini: "",
      claude: ""
    },
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "llama3"
  },
  questions: questions
};

const dbPath = path.join(__dirname, 'db.json');
fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
console.log('Database file db.json successfully generated with 120 default questions!');
