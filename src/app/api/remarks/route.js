import { NextResponse } from 'next/server';
import { getSettings, getQuestions } from '@/lib/db';

// ──────────────────────────────────────────────────────────────────
// Local Expert Rule-based generator (fallback/offline)
// ──────────────────────────────────────────────────────────────────
function generateExpertRemarks(scores, answers, questions) {
  const areaMaturities = {};
  for (const area in scores) {
    const score = scores[area];
    let classification = "L0: Traditional";
    if (score >= 4.5) classification = "L5: Agentic Enterprise";
    else if (score >= 3.5) classification = "L4: Autonomous Agent/Workforce";
    else if (score >= 2.5) classification = "L3: Supervised Agent/Factory";
    else if (score >= 1.5) classification = "L2: Delegated/Assistant";
    else if (score >= 0.5) classification = "L1: Assisted/Tool";
    areaMaturities[area] = { score, classification };
  }

  const strengths = {};
  const gaps = {};
  for (const area of ['Requirements', 'Architecture', 'Development', 'Testing', 'Deployment']) {
    strengths[area] = [];
    gaps[area] = [];
  }

  for (const qId in answers) {
    const ans = answers[qId];
    const q = questions.find(question => question.id === parseInt(qId));
    if (q) {
      const level = parseInt(ans.level) || 0;
      if (level >= 3) {
        strengths[q.area].push(q.practice);
      } else if (level <= 1) {
        gaps[q.area].push(q.practice);
      }
    }
  }

  const getFallbackText = (area) => {
    const topStrengths = strengths[area] || [];
    const topGaps = gaps[area] || [];
    const topPractice = topStrengths.length > 0 ? topStrengths[0] : null;
    const mainGap = topGaps.length > 0 ? topGaps[0] : null;

    let processStr = "";
    let toolsStr = "";
    let techniquesStr = "";

    if (area === 'Requirements') {
      processStr = topPractice
        ? `Requirements processes show capability in ${topPractice}. However, ${mainGap || 'backlog grooming'} remains a limitation, requiring structured framework planning to streamline backlog refinement.`
        : `Requirements processes are currently at a baseline level. Introducing structured framework planning is necessary to address standard backlog definition and scope mapping.`;
      toolsStr = `Jira Product Discovery, Gemini 1.5 Pro, Claude 3.5 Sonnet, and Productboard.`;
      techniquesStr = `Leverage Behavior-Driven Development (BDD) generation and automated user story decomposition via LLM agents.`;
    } else if (area === 'Architecture') {
      processStr = topPractice
        ? `Architecture processes demonstrate strength in ${topPractice}. A critical governance gap exists in ${mainGap || 'diagram synchronization'}, which should be targeted to prevent structural divergence.`
        : `Architecture workflows run manually without alignment check gates. Establishing automated model checking will prevent architectural divergence.`;
      toolsStr = `Mermaid.js, Eraser.io, Claude 3.5 Sonnet, and ArchUnit.`;
      techniquesStr = `Establish automated Architecture Decision Record (ADR) creation and code-level architectural drift detection using AST parsing linting rules.`;
    } else if (area === 'Development') {
      processStr = topPractice
        ? `Development practices exhibit competency in ${topPractice}. Addressing ${mainGap || 'inline generation templates'} is necessary to accelerate engineering velocity and guarantee coding standard compliance.`
        : `Development workflows rely on local environments. Incorporating structured developer guidelines and unit test suites will establish codebase quality baselines.`;
      toolsStr = `Cursor IDE, VS Code with GitHub Copilot, and Claude 3.5 Sonnet.`;
      techniquesStr = `Incorporate Model Context Protocol (MCP) servers for codebase searching and orchestrate agent-led refactoring and code reviews.`;
    } else if (area === 'Testing') {
      processStr = topPractice
        ? `Testing procedures show progress in ${topPractice}. However, ${mainGap || 'test case coverage'} presents a major quality bottleneck that increases the risk of regression errors.`
        : `Testing practices are manual and prone to human oversight. Transitioning to automated test suite execution will reduce validation loops and regression errors.`;
      toolsStr = `Playwright, Jest, Cypress, and Mockito.`;
      techniquesStr = `Implement automated agentic test generation, self-healing test suites, and dynamic synthetic mock data synthesis using generative models.`;
    } else if (area === 'Deployment') {
      processStr = topPractice
        ? `Deployment workflows show strength in ${topPractice}. The primary gap identified is ${mainGap || 'canary deployments'}, indicating a need for greater automation in release verification and monitoring.`
        : `Deployment pipelines are manually triggered and lack verification. Automating build and release orchestration will improve delivery security.`;
      toolsStr = `GitHub Actions, ArgoCD, Terraform, and Datadog.`;
      techniquesStr = `Utilize canary deployments with automated rollback verification and integrate AI-driven log analysis for pipeline anomaly discovery.`;
    }

    return `### Process\n${processStr}\n\n### Recommended Tools\n${toolsStr}\n\n### Techniques\n${techniquesStr}`;
  };

  let md = '';
  const areasList = ['Requirements', 'Architecture', 'Development', 'Testing', 'Deployment'];
  areasList.forEach((area, i) => {
    md += `## ${area}\n${getFallbackText(area)}`;
    if (i < areasList.length - 1) {
      md += '\n\n';
    }
  });

  return md;
}

// Helper for absolute fallback if database is completely unavailable
function generateDefaultRemarksOnlyScores(scores) {
  let md = '';
  const areasList = ['Requirements', 'Architecture', 'Development', 'Testing', 'Deployment'];
  
  const getFallbackText = (area, score) => {
    let classification = "L0: Traditional";
    if (score >= 4.5) classification = "L5: Agentic Enterprise";
    else if (score >= 3.5) classification = "L4: Autonomous Agent/Workforce";
    else if (score >= 2.5) classification = "L3: Supervised Agent/Factory";
    else if (score >= 1.5) classification = "L2: Delegated/Assistant";
    else if (score >= 0.5) classification = "L1: Assisted/Tool";

    let processStr = `${area} capability score is ${score.toFixed(1)}/5, placing the practice in the ${classification} stage. Focus on standardizing capabilities and deploying automated agents to streamline workflows.`;
    let toolsStr = "";
    let techniquesStr = "";

    if (area === 'Requirements') {
      toolsStr = "Jira Product Discovery, Gemini 1.5 Pro, Claude 3.5 Sonnet, and Productboard.";
      techniquesStr = "Leverage Behavior-Driven Development (BDD) generation and automated user story decomposition via LLM agents.";
    } else if (area === 'Architecture') {
      toolsStr = "Mermaid.js, Eraser.io, Claude 3.5 Sonnet, and ArchUnit.";
      techniquesStr = "Establish automated Architecture Decision Record (ADR) creation and code-level architectural drift detection.";
    } else if (area === 'Development') {
      toolsStr = "Cursor IDE, VS Code with GitHub Copilot, and Claude 3.5 Sonnet.";
      techniquesStr = "Incorporate Model Context Protocol (MCP) servers for codebase searching and orchestrate agent-led refactoring.";
    } else if (area === 'Testing') {
      toolsStr = "Playwright, Jest, Cypress, and Mockito.";
      techniquesStr = "Implement automated agentic test generation, self-healing test suites, and dynamic synthetic mock data synthesis.";
    } else if (area === 'Deployment') {
      toolsStr = "GitHub Actions, ArgoCD, Terraform, and Datadog.";
      techniquesStr = "Utilize canary deployments with automated rollback verification and integrate AI-driven log analysis.";
    }

    return `### Process\n${processStr}\n\n### Recommended Tools\n${toolsStr}\n\n### Techniques\n${techniquesStr}`;
  };

  areasList.forEach((area, i) => {
    const score = scores[area] || 0;
    md += `## ${area}\n${getFallbackText(area, score)}`;
    if (i < areasList.length - 1) {
      md += '\n\n';
    }
  });
  return md;
}

// ──────────────────────────────────────────────────────────────────
// POST /api/remarks
// ──────────────────────────────────────────────────────────────────
export async function POST(request) {
  let scores = {};
  try {
    const body = await request.json().catch(() => ({}));
    scores = body.scores || {};
    const answers = body.answers || {};
    if (!body.scores || !body.answers) {
      return NextResponse.json({ message: 'Missing scores or answers data' }, { status: 400 });
    }

    // Load questions and settings from MySQL
    const [questions, settings] = await Promise.all([getQuestions(), getSettings()]);
    const expertRemarks = generateExpertRemarks(scores, answers, questions);

    // ── Prepare individual area prompts ──
    const makePromptForArea = (area, score, levelLabel, strengthsList, gapsList) => {
      return `You are an expert SDLC AI Maturity Consultant.

Generate structured remarks for the following SDLC section:
* Section name: ${area}
* Section maturity level: ${levelLabel}
* Section score: ${score.toFixed(1)}/5
* Highest scoring capabilities: ${strengthsList.length > 0 ? strengthsList.join(', ') : 'None'}
* Lowest scoring capabilities: ${gapsList.length > 0 ? gapsList.join(', ') : 'None'}

You MUST structure your response into exactly three subheadings as markdown:
### Process
[Provide 2-3 sentences evaluating the current workflow, highlighting the strongest capability and addressing the primary gap or areas needing human-in-the-loop oversight.]

### Recommended Tools
[Suggest 2-4 specific tools (such as JIRA, Cursor, Copilot, Playwright, Terraform, Claude, Gemini, etc.) that will help automate or mature this section, tailored to the current maturity level.]

### Techniques
[Provide 2-3 sentences recommending advanced techniques (such as Behavior-Driven Development generation, Model Context Protocol (MCP) agents, Automated Test-Driven Development, self-healing test runs, containerized blue-green deployments, etc.) to elevate capabilities.]

Strict Requirements:
1. Do not output any main title or intro/outro text. Start directly with "### Process".
2. Use executive, precise, and professional language.
3. Avoid generic placeholder phrases like "further optimization is recommended" or "this can be enhanced".
4. Ensure the content reads like high-quality consulting insights.`;
    };

    const areas = ['Requirements', 'Architecture', 'Development', 'Testing', 'Deployment'];
    const areaMaturities = {};
    const strengths = {};
    const gaps = {};
    for (const a of areas) {
      strengths[a] = [];
      gaps[a] = [];
      const score = scores[a] || 0;
      let classification = "L0: Traditional";
      if (score >= 4.5) classification = "L5: Agentic Enterprise";
      else if (score >= 3.5) classification = "L4: Autonomous Agent/Workforce";
      else if (score >= 2.5) classification = "L3: Supervised Agent/Factory";
      else if (score >= 1.5) classification = "L2: Delegated/Assistant";
      else if (score >= 0.5) classification = "L1: Assisted/Tool";
      areaMaturities[a] = { score, classification };
    }

    questions.forEach(q => {
      const ans = answers[q.id] || answers[String(q.id)];
      if (ans && ans.level !== null && ans.level !== undefined) {
        const lvl = parseInt(ans.level);
        if (!isNaN(lvl)) {
          if (lvl >= 3) strengths[q.area].push(q.practice);
          else if (lvl <= 1) gaps[q.area].push(q.practice);
        }
      }
    });

    const areaPrompts = areas.map(area => {
      return {
        area,
        prompt: makePromptForArea(
          area,
          scores[area] || 0,
          areaMaturities[area]?.classification || 'L0: Traditional',
          strengths[area] || [],
          gaps[area] || []
        )
      };
    });

    // ── Determine active provider from settings ──
    const activeProvider = settings.activeAIProvider || 'expert';

    // Helper to query active AI provider for a single prompt
    async function callAIProvider(prompt) {
      if (activeProvider === 'ollama') {
        const configuredOllama = settings.apiEndpoints?.ollama || settings.ollamaUrl || 'http://localhost:11434';
        let cleanOllamaUrl = configuredOllama.trim();
        if (cleanOllamaUrl.endsWith('/')) {
          cleanOllamaUrl = cleanOllamaUrl.slice(0, -1);
        }
        const targetUrl = cleanOllamaUrl.includes('/api/generate') ? cleanOllamaUrl : `${cleanOllamaUrl}/api/generate`;
        const ollamaModel = settings.ollamaModel || process.env.OLLAMA_MODEL || 'llama3';
        try {
          const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              prompt: prompt,
              stream: false,
              options: { temperature: 0.2, num_predict: 200 }
            }),
            signal: AbortSignal.timeout(30000)
          });
          if (res.ok) {
            const data = await res.json();
            if (data.response && data.response.trim()) return data.response.trim();
          }
        } catch (e) {
          console.warn('[Remarks] Ollama area call failed:', e.message);
        }
      }

      if (activeProvider === 'openai') {
        const openaiUrl = (settings.apiEndpoints?.openai || 'https://api.openai.com/v1/chat/completions').trim();
        const apiKey = settings.apiKeys?.openai?.trim() || process.env.OPENAI_API_KEY || '';
        try {
          const res = await fetch(openaiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4-turbo',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2,
              max_tokens: 300
            }),
            signal: AbortSignal.timeout(20000)
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content;
            if (text && text.trim()) return text.trim();
          }
        } catch (e) {
          console.warn('[Remarks] OpenAI area call failed:', e.message);
        }
      }

      if (activeProvider === 'gemini') {
        const geminiModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
        const configuredGemini = (settings.apiEndpoints?.gemini || 'https://generativelanguage.googleapis.com').trim();
        let cleanGeminiUrl = configuredGemini;
        if (cleanGeminiUrl.endsWith('/')) {
          cleanGeminiUrl = cleanGeminiUrl.slice(0, -1);
        }
        const apiKey = settings.apiKeys?.gemini?.trim() || process.env.GEMINI_API_KEY || '';
        for (const model of geminiModels) {
          try {
            let targetUrl;
            if (cleanGeminiUrl.includes(':generateContent') || cleanGeminiUrl.includes('/models/')) {
              targetUrl = cleanGeminiUrl;
              if (targetUrl.includes('${model}')) {
                targetUrl = targetUrl.replace('${model}', model);
              }
              if (!targetUrl.includes('key=')) {
                const separator = targetUrl.includes('?') ? '&' : '?';
                targetUrl = `${targetUrl}${separator}key=${apiKey}`;
              }
            } else {
              targetUrl = `${cleanGeminiUrl}/v1/models/${model}:generateContent?key=${apiKey}`;
            }
            const res = await fetch(
              targetUrl,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                signal: AbortSignal.timeout(20000)
              }
            );
            if (res.ok) {
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text && text.trim()) return text.trim();
            }
          } catch (e) {
            console.warn(`[Remarks] Gemini (${model}) area call failed:`, e.message);
          }
        }
      }

      if (activeProvider === 'claude') {
        const claudeUrl = (settings.apiEndpoints?.claude || 'https://api.anthropic.com/v1/messages').trim();
        const apiKey = settings.apiKeys?.claude?.trim() || process.env.CLAUDE_API_KEY || '';
        try {
          const res = await fetch(claudeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 300,
              messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(20000)
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.content?.[0]?.text;
            if (text && text.trim()) return text.trim();
          }
        } catch (e) {
          console.warn('[Remarks] Claude area call failed:', e.message);
        }
      }
      return null;
    }

    // ── 1. EXPERT mode: return immediately — no external AI call ──
    if (activeProvider === 'expert') {
      console.log('[Remarks] Expert (rule-based) mode selected — skipping AI providers');
      return NextResponse.json({ remarks: expertRemarks, provider: 'expert' });
    }

    // Resolve API keys (fallback to environment variables if not present in DB settings)
    const geminiKey = settings.apiKeys?.gemini?.trim() || process.env.GEMINI_API_KEY || '';
    const openaiKey = settings.apiKeys?.openai?.trim() || process.env.OPENAI_API_KEY || '';
    const claudeKey = settings.apiKeys?.claude?.trim() || process.env.CLAUDE_API_KEY || '';

    // ── 2. Validate API key is present for cloud providers ──
    if (activeProvider === 'openai' && !openaiKey) {
      console.warn('[Remarks] OpenAI selected but API key is not configured — using expert engine fallback');
      return NextResponse.json({ remarks: expertRemarks, provider: 'expert-fallback' });
    }
    if (activeProvider === 'gemini' && !geminiKey) {
      console.warn('[Remarks] Gemini selected but API key is not configured — using expert engine fallback');
      return NextResponse.json({ remarks: expertRemarks, provider: 'expert-fallback' });
    }
    if (activeProvider === 'claude' && !claudeKey) {
      console.warn('[Remarks] Claude selected but API key is not configured — using expert engine fallback');
      return NextResponse.json({ remarks: expertRemarks, provider: 'expert-fallback' });
    }

    let generatedRemarksText = null;
    let finalProviderName = null;

    try {
      console.log(`[Remarks] Generating 5 area remarks in parallel using ${activeProvider}...`);
      const remarksResults = await Promise.all(areaPrompts.map(async ({ area, prompt }) => {
        const text = await callAIProvider(prompt);
        return { area, text };
      }));

      const failed = remarksResults.some(r => !r.text);
      if (!failed) {
        generatedRemarksText = remarksResults.map(r => `## ${r.area}\n${r.text}`).join('\n\n');
        finalProviderName = activeProvider === 'ollama' ? `ollama-${ollamaModel}` : activeProvider;
      } else {
        console.warn('[Remarks] One or more areas failed to generate remarks.');
      }
    } catch (err) {
      console.error('[Remarks] Parallel area generation failed:', err);
    }

    // ── 4. Return AI result if provider succeeded ──────────────────────────
    if (generatedRemarksText) {
      return NextResponse.json({ remarks: generatedRemarksText, provider: finalProviderName });
    }

    // ── 5. Provider was selected but call failed — expert fallback ──
    console.log(`[Remarks] ${activeProvider} failed — using expert engine as graceful fallback`);
    return NextResponse.json({
      remarks: expertRemarks,
      provider: 'expert-fallback'
    });

  } catch (error) {
    console.error('Remarks API Error:', error);
    try {
      const fallbackRemarks = generateDefaultRemarksOnlyScores(scores);
      return NextResponse.json({
        remarks: fallbackRemarks,
        provider: 'expert-fallback'
      });
    } catch (innerError) {
      return NextResponse.json({ message: 'Server error generating remarks' }, { status: 500 });
    }
  }
}
