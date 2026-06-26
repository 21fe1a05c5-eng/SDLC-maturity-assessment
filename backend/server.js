import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {
  getUsers,
  createUser,
  authenticateUser,
  getUserById,
  ensureAdminUser,
  updateUserProfile,
  getAssessments,
  getAssessmentById,
  saveAssessment,
  getFeedback,
  saveFeedback,
  getQuestions,
  saveQuestion,
  deleteQuestion,
  getSettings,
  updateSettings,
  updateAssessmentRemarks
} from './db.js';
import { getUserIdFromRequest, signToken } from './auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS setup: allow credentials and request headers from frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Helper middleware to require authentication
async function requireAuth(req, res, next) {
  const user = getUserIdFromRequest(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = user;
  next();
}

// Helper middleware to require admin role
async function requireAdmin(req, res, next) {
  const user = getUserIdFromRequest(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized - Admin only' });
  }
  req.user = user;
  next();
}

// ──────────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ──────────────────────────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(200).json({ success: false, message: 'Email and password are required' });
    }

    let authenticatedUser = await authenticateUser(email, password);

    // Bootstrap: allow default admin account if it isn't in DB yet
    if (!authenticatedUser && email.toLowerCase() === 'admin@sdlc.com' && password === 'admin123') {
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash(password, salt);
      const adminUser = await ensureAdminUser(hashedPassword);

      const token = signToken({ id: adminUser.id, email: 'admin@sdlc.com', role: 'admin' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
      return res.status(200).json({
        token,
        message: 'Admin login successful',
        user: { id: adminUser.id, email: 'admin@sdlc.com', role: 'admin' }
      });
    }

    if (!authenticatedUser) {
      return res.status(200).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(authenticatedUser);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.status(200).json({
      token,
      message: 'Login successful',
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        name: authenticatedUser.name || '',
        gender: authenticatedUser.gender || ''
      }
    });
  } catch (error) {
    console.error('Login API Error:', error);
    return res.status(500).json({ message: 'Error authenticating user' });
  }
});

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(200).json({ success: false, message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(200).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const newUser = await createUser(email, password);
    const token = signToken(newUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    return res.status(201).json({
      token,
      message: 'User created successfully',
      user: { id: newUser.id, email: newUser.email }
    });
  } catch (error) {
    console.warn('Signup API warning:', error.message || error);
    return res.status(200).json({ success: false, message: error.message || 'Error creating user' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.status(200).json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
  try {
    const userPayload = getUserIdFromRequest(req);

    if (!userPayload) {
      return res.status(200).json({ user: null, message: 'Not authenticated' });
    }

    const dbUser = await getUserById(userPayload.id);
    if (!dbUser) {
      return res.status(200).json({ user: null, message: 'User not found' });
    }

    // Get cookie token or bearer token
    let token = req.cookies.token || null;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    return res.status(200).json({
      token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name || '',
        gender: dbUser.gender || ''
      }
    });
  } catch (error) {
    console.error('Me API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────
// USER & PROFILE ENDPOINTS
// ──────────────────────────────────────────────────────────────────

// GET /api/users
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await getUsers();
    return res.json({ users });
  } catch (error) {
    console.error('Users GET API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/profile
app.post('/api/users/profile', requireAuth, async (req, res) => {
  try {
    const { name, gender } = req.body;
    const cleanName = (name || '').trim();
    const cleanGender = (gender || '').trim();

    const updatedUser = await updateUserProfile(req.user.id, cleanName, cleanGender);
    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        name: updatedUser.name || '',
        gender: updatedUser.gender || ''
      }
    });
  } catch (error) {
    console.error('Profile Update API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────
// SETTINGS ENDPOINTS
// ──────────────────────────────────────────────────────────────────

// GET /api/settings
app.get('/api/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await getSettings();
    
    // Check which keys are present in .env
    settings.envKeys = {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      claude: !!process.env.CLAUDE_API_KEY
    };

    return res.json({ settings });
  } catch (error) {
    console.error('Settings GET API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/settings
app.post('/api/settings', requireAdmin, async (req, res) => {
  try {
    const settingsData = req.body;
    const { activeAIProvider } = settingsData;

    // Validate that the selected provider's API key is present in environment
    if (activeAIProvider === 'openai') {
      const key = process.env.OPENAI_API_KEY;
      if (!key || !key.trim()) {
        return res.status(400).json({ message: 'OpenAI API key (OPENAI_API_KEY) is not present in the .env file.' });
      }
    } else if (activeAIProvider === 'gemini') {
      const key = process.env.GEMINI_API_KEY;
      if (!key || !key.trim()) {
        return res.status(400).json({ message: 'Google Gemini API key (GEMINI_API_KEY) is not present in the .env file.' });
      }
    } else if (activeAIProvider === 'claude') {
      const key = process.env.CLAUDE_API_KEY;
      if (!key || !key.trim()) {
        return res.status(400).json({ message: 'Anthropic Claude API key (CLAUDE_API_KEY) is not present in the .env file.' });
      }
    }

    const updated = await updateSettings(settingsData);
    return res.json({ message: 'Settings updated successfully', settings: updated });
  } catch (error) {
    console.error('Settings POST API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────
// QUESTIONS ENDPOINTS
// ──────────────────────────────────────────────────────────────────

// GET /api/questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await getQuestions();
    return res.json({ questions });
  } catch (error) {
    console.error('Questions GET API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/questions
app.post('/api/questions', requireAdmin, async (req, res) => {
  try {
    const questionData = req.body;
    if (!questionData.area || !questionData.subArea || !questionData.practice || !questionData.questionText) {
      return res.status(400).json({ message: 'Missing required question fields' });
    }

    await saveQuestion(questionData);
    return res.json({ message: 'Question saved successfully' });
  } catch (error) {
    // MySQL duplicate entry — UNIQUE constraint on (area, sub_area, practice)
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({
        message: 'A question with this Area, Sub-Area and Practice already exists. Please use a unique combination.'
      });
    }
    console.error('Questions POST API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/questions (query param) or DELETE /api/questions/:id (route param)
const deleteQuestionHandler = async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    if (!id) {
      return res.status(400).json({ message: 'Question ID is required' });
    }

    const deleted = await deleteQuestion(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Question not found' });
    }

    return res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Questions DELETE API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

app.delete('/api/questions/:id', requireAdmin, deleteQuestionHandler);
app.delete('/api/questions', requireAdmin, deleteQuestionHandler);

// ──────────────────────────────────────────────────────────────────
// ASSESSMENT ENDPOINTS
// ──────────────────────────────────────────────────────────────────

// GET /api/assessments
app.get('/api/assessments', requireAuth, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const assessments = await getAssessments(userId);
    return res.json({ assessments });
  } catch (error) {
    console.error('Assessments GET API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/assessments
app.post('/api/assessments', requireAuth, async (req, res) => {
  try {
    const assessmentData = req.body;
    if (!assessmentData.projectName || !assessmentData.answers) {
      return res.status(400).json({ message: 'Missing required assessment fields' });
    }

    assessmentData.userId = req.user.id;
    assessmentData.userEmail = req.user.email;

    const saved = await saveAssessment(assessmentData);
    return res.json({ message: 'Assessment saved successfully', assessment: saved });
  } catch (error) {
    console.error('Assessments POST API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/assessments/:id
app.get('/api/assessments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await getAssessmentById(id);

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    if (req.user.role !== 'admin' && assessment.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to view this assessment' });
    }

    return res.json({ assessment });
  } catch (error) {
    console.error('Assessments GET ID API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/assessments/:id
app.patch('/api/assessments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    if (req.user.role !== 'admin' && assessment.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { remarks, provider } = req.body;
    const updated = await updateAssessmentRemarks(id, remarks, provider || 'llama3.2');
    return res.json({ assessment: updated });
  } catch (error) {
    console.error('Assessments PATCH Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────
// FEEDBACK ENDPOINTS
// ──────────────────────────────────────────────────────────────────

// GET /api/feedback
app.get('/api/feedback', requireAdmin, async (req, res) => {
  try {
    const feedback = await getFeedback();
    return res.json({ feedback });
  } catch (error) {
    console.error('Feedback GET API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/feedback
app.post('/api/feedback', requireAuth, async (req, res) => {
  try {
    const feedbackData = req.body;
    if (!feedbackData.assessmentId || !feedbackData.rating) {
      return res.status(400).json({ message: 'Missing feedback rating or assessment ID' });
    }

    feedbackData.userId = req.user.id;
    feedbackData.userEmail = req.user.email;

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

    return res.json({ message: 'Feedback submitted successfully', feedback: saved });
  } catch (error) {
    console.error('Feedback POST API Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────
// REMARKS ENDPOINTS (AI INSIGHTS GENERATION)
// ──────────────────────────────────────────────────────────────────

// Offline Rule-Based Generator (fallback/offline)
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

// POST /api/remarks
app.post('/api/remarks', async (req, res) => {
  let scores = {};
  try {
    const body = req.body || {};
    scores = body.scores || {};
    const answers = body.answers || {};
    if (!body.scores || !body.answers) {
      return res.status(400).json({ message: 'Missing scores or answers data' });
    }

    const [questions, settings] = await Promise.all([getQuestions(), getSettings()]);
    const expertRemarks = generateExpertRemarks(scores, answers, questions);

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

    const activeProvider = settings.activeAIProvider || 'expert';

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

    if (activeProvider === 'expert') {
      console.log('[Remarks] Expert (rule-based) mode selected — skipping AI providers');
      return res.json({ remarks: expertRemarks, provider: 'expert' });
    }

    const geminiKey = settings.apiKeys?.gemini?.trim() || process.env.GEMINI_API_KEY || '';
    const openaiKey = settings.apiKeys?.openai?.trim() || process.env.OPENAI_API_KEY || '';
    const claudeKey = settings.apiKeys?.claude?.trim() || process.env.CLAUDE_API_KEY || '';

    if (activeProvider === 'openai' && !openaiKey) {
      console.warn('[Remarks] OpenAI selected but API key is not configured — using expert engine fallback');
      return res.json({ remarks: expertRemarks, provider: 'expert-fallback' });
    }
    if (activeProvider === 'gemini' && !geminiKey) {
      console.warn('[Remarks] Gemini selected but API key is not configured — using expert engine fallback');
      return res.json({ remarks: expertRemarks, provider: 'expert-fallback' });
    }
    if (activeProvider === 'claude' && !claudeKey) {
      console.warn('[Remarks] Claude selected but API key is not configured — using expert engine fallback');
      return res.json({ remarks: expertRemarks, provider: 'expert-fallback' });
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
        finalProviderName = activeProvider === 'ollama' ? `ollama` : activeProvider;
      } else {
        console.warn('[Remarks] One or more areas failed to generate remarks.');
      }
    } catch (err) {
      console.error('[Remarks] Parallel area generation failed:', err);
    }

    if (generatedRemarksText) {
      return res.json({ remarks: generatedRemarksText, provider: finalProviderName });
    }

    console.log(`[Remarks] ${activeProvider} failed — using expert engine as graceful fallback`);
    return res.json({
      remarks: expertRemarks,
      provider: 'expert-fallback'
    });

  } catch (error) {
    console.error('Remarks API Error:', error);
    try {
      const fallbackRemarks = generateDefaultRemarksOnlyScores(scores);
      return res.json({
        remarks: fallbackRemarks,
        provider: 'expert-fallback'
      });
    } catch (innerError) {
      return res.status(500).json({ message: 'Server error generating remarks' });
    }
  }
});
if (process.env.RUN_DB_INIT === "true") {
  import("./init_mysql.cjs");
}
// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Backend Express server running on port ${PORT}`);
});
