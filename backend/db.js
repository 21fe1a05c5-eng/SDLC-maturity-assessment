/**
 * src/lib/db.js
 * MySQL database layer using mysql2 with connection pooling.
 * All methods are async and return Promises.
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

// ──────────────────────────────────────────────
// Connection Pool (singleton)
// ──────────────────────────────────────────────
function getPool() {
  if (!global.mysqlPool) {
    const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (connectionUri) {
      global.mysqlPool = mysql.createPool(connectionUri);
    } else {
      global.mysqlPool = mysql.createPool({
        host:     process.env.DB_HOST     || process.env.MYSQLHOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
        user:     process.env.DB_USER     || process.env.MYSQLUSER     || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'root123',
        database: process.env.DB_NAME     || process.env.MYSQLDATABASE || 'sdlc_maturity',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
      });
    }
  }
  return global.mysqlPool;
}

// ──────────────────────────────────────────────
// Auto-migration: add columns added after initial schema
// ──────────────────────────────────────────────
let migrationDone = false;

async function ensureSchema() {
  if (migrationDone) return;
  migrationDone = true;
  try {
    const p = getPool();

    // Add name & gender to users if missing
    const [nameCols] = await p.execute("SHOW COLUMNS FROM users LIKE 'name'");
    if (nameCols.length === 0) {
      console.log('🛠️ Migration: adding name/gender to users...');
      await p.execute("ALTER TABLE users ADD COLUMN name VARCHAR(255) DEFAULT NULL");
      await p.execute("ALTER TABLE users ADD COLUMN gender VARCHAR(20) DEFAULT NULL");
      console.log('✅ Migration complete.');
    }

    // Add overall_score to assessments if missing
    const [scoreCols] = await p.execute("SHOW COLUMNS FROM assessments LIKE 'overall_score'");
    if (scoreCols.length === 0) {
      console.log('🛠️ Migration: adding overall_score to assessments...');
      await p.execute("ALTER TABLE assessments ADD COLUMN overall_score INT DEFAULT 0");
      console.log('✅ Migration complete.');
    }

    // Add api_endpoints to settings if missing
    const [endpointCols] = await p.execute("SHOW COLUMNS FROM settings LIKE 'api_endpoints'");
    if (endpointCols.length === 0) {
      console.log('🛠️ Migration: adding api_endpoints to settings...');
      await p.execute("ALTER TABLE settings ADD COLUMN api_endpoints JSON DEFAULT NULL");
      console.log('✅ Migration complete.');
    }
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    migrationDone = false;
  }
}

// ──────────────────────────────────────────────
// Generic query helper
// ──────────────────────────────────────────────
async function query(sql, params = []) {
  const db = getPool();
  const isMetaQuery = sql.includes('SHOW COLUMNS') || sql.includes('ALTER TABLE');
  if (!migrationDone && !isMetaQuery) {
    await ensureSchema();
  }
  const [rows] = await db.execute(sql, params);
  return rows;
}

// ──────────────────────────────────────────────
// USER METHODS
// ──────────────────────────────────────────────
export async function getUsers() {
  return query('SELECT id, email, role, name, gender, created_at FROM users');
}

export async function createUser(email, password) {
  const bcrypt = await import('bcryptjs');
  const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (existing.length > 0) throw new Error('User already exists');

  const salt = await bcrypt.default.genSalt(10);
  const hashedPassword = await bcrypt.default.hash(password, salt);
  const id = 'user_' + Math.random().toString(36).substr(2, 9);

  await query(
    'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
    [id, email.toLowerCase(), hashedPassword, 'user']
  );
  return { id, email: email.toLowerCase() };
}

export async function authenticateUser(email, password) {
  const bcrypt = await import('bcryptjs');
  const rows = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (rows.length === 0) return null;

  const user = rows[0];
  const valid = await bcrypt.default.compare(password, user.password);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name || '',
    gender: user.gender || ''
  };
}

export async function getUserById(id) {
  const rows = await query(
    'SELECT id, email, role, name, gender, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function ensureAdminUser(passwordHash) {
  const rows = await query('SELECT id FROM users WHERE email = ?', ['admin@sdlc.com']);
  if (rows.length === 0) {
    await query(
      'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
      ['admin_user', 'admin@sdlc.com', passwordHash, 'admin']
    );
    return { id: 'admin_user', email: 'admin@sdlc.com', role: 'admin', name: '', gender: '' };
  }
  return { id: rows[0].id, email: rows[0].email, role: rows[0].role, name: rows[0].name || '', gender: rows[0].gender || '' };
}

export async function updateUserProfile(userId, name, gender) {
  await query('UPDATE users SET name = ?, gender = ? WHERE id = ?', [name, gender, userId]);
  return getUserById(userId);
}

// ──────────────────────────────────────────────
// ASSESSMENT METHODS
// ──────────────────────────────────────────────
export async function getAssessments(userId = null) {
  const rows = userId
    ? await query('SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC', [userId])
    : await query('SELECT * FROM assessments ORDER BY created_at DESC');
  return rows.map(parseAssessmentRow);
}

export async function getAssessmentById(id) {
  const rows = await query('SELECT * FROM assessments WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  return parseAssessmentRow(rows[0]);
}

export async function saveAssessment(assessmentData) {
  const id = assessmentData.id || 'asm_' + Math.random().toString(36).substr(2, 9);
  const existing = await query('SELECT id FROM assessments WHERE id = ?', [id]);

  const answers      = JSON.stringify(assessmentData.answers  || {});
  const scores       = JSON.stringify(assessmentData.scores   || {});
  const feedback     = JSON.stringify(assessmentData.feedback || null);
  const overallScore = parseInt(assessmentData.overallScore   || 0);

  if (existing.length > 0) {
    await query(
      `UPDATE assessments
       SET user_id=?, user_email=?, project_name=?, answers=?, scores=?, overall_score=?,
           remarks=?, remarks_provider=?, feedback=?, updated_at=NOW()
       WHERE id=?`,
      [
        assessmentData.userId || assessmentData.user_id,
        assessmentData.userEmail || assessmentData.user_email || '',
        assessmentData.projectName || assessmentData.project_name || '',
        answers, scores, overallScore,
        assessmentData.remarks || null,
        assessmentData.remarksProvider || assessmentData.remarks_provider || null,
        feedback, id
      ]
    );
  } else {
    await query(
      `INSERT INTO assessments
       (id, user_id, user_email, project_name, answers, scores, overall_score,
        remarks, remarks_provider, feedback)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        assessmentData.userId || assessmentData.user_id,
        assessmentData.userEmail || assessmentData.user_email || '',
        assessmentData.projectName || assessmentData.project_name || '',
        answers, scores, overallScore,
        assessmentData.remarks || null,
        assessmentData.remarksProvider || assessmentData.remarks_provider || null,
        feedback
      ]
    );
  }
  return getAssessmentById(id);
}

function parseAssessmentRow(row) {
  const scores = typeof row.scores === 'string' ? JSON.parse(row.scores) : (row.scores || {});
  let overallScore = row.overall_score != null ? parseInt(row.overall_score) : null;
  if (overallScore == null) {
    const vals = Object.values(scores);
    const avg  = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    overallScore = Math.round((avg / 5) * 100);
  }
  return {
    id:              row.id,
    userId:          row.user_id,
    userEmail:       row.user_email,
    projectName:     row.project_name,
    answers:         typeof row.answers  === 'string' ? JSON.parse(row.answers)  : (row.answers  || {}),
    scores,
    overallScore,
    remarks:         row.remarks,
    remarksProvider: row.remarks_provider,
    feedback:        typeof row.feedback === 'string' ? JSON.parse(row.feedback) : (row.feedback || null),
    createdAt:       row.created_at,
    updatedAt:       row.updated_at
  };
}

// ──────────────────────────────────────────────
// FEEDBACK METHODS
// ──────────────────────────────────────────────
export async function getFeedback() {
  return query('SELECT * FROM feedback ORDER BY created_at DESC');
}

export async function saveFeedback(feedbackData) {
  const id = 'fb_' + Math.random().toString(36).substr(2, 9);
  await query(
    'INSERT INTO feedback (id, assessment_id, user_id, user_email, rating, comments) VALUES (?, ?, ?, ?, ?, ?)',
    [id, feedbackData.assessmentId, feedbackData.userId, feedbackData.userEmail || '',
     feedbackData.rating, feedbackData.comments || '']
  );
  return {
    id,
    assessmentId:  feedbackData.assessmentId,
    userId:        feedbackData.userId,
    userEmail:     feedbackData.userEmail,
    rating:        feedbackData.rating,
    comments:      feedbackData.comments,
    createdAt:     new Date().toISOString()
  };
}

// ──────────────────────────────────────────────
// QUESTION METHODS
// ──────────────────────────────────────────────
export async function getQuestions() {
  const rows = await query('SELECT * FROM questions ORDER BY id ASC');
  return rows.map(row => ({
    id:           row.id,
    area:         row.area,
    subArea:      row.sub_area,
    practice:     row.practice,
    type:         row.type,
    questionText: row.question_text
  }));
}

export async function saveQuestion(questionData) {
  if (questionData.id) {
    const existing = await query('SELECT id FROM questions WHERE id = ?', [questionData.id]);
    if (existing.length > 0) {
      await query(
        'UPDATE questions SET area=?, sub_area=?, practice=?, type=?, question_text=? WHERE id=?',
        [questionData.area, questionData.subArea, questionData.practice,
         questionData.type || 'extent', questionData.questionText, questionData.id]
      );
      return true;
    }
  } else {
    // Check duplicate
    const duplicate = await query(
      'SELECT id FROM questions WHERE area = ? AND sub_area = ? AND practice = ?',
      [questionData.area, questionData.subArea, questionData.practice]
    );
    if (duplicate.length > 0) {
      const err = new Error('Duplicate entry for unique practice');
      err.code = 'ER_DUP_ENTRY';
      err.errno = 1062;
      throw err;
    }
  }
  await query(
    'INSERT INTO questions (area, sub_area, practice, type, question_text) VALUES (?, ?, ?, ?, ?)',
    [questionData.area, questionData.subArea, questionData.practice,
     questionData.type || 'extent', questionData.questionText]
  );
  return true;
}

export async function deleteQuestion(id) {
  const result = await query('DELETE FROM questions WHERE id = ?', [parseInt(id)]);
  return result.affectedRows > 0;
}

// ──────────────────────────────────────────────
// SETTINGS METHODS
// ──────────────────────────────────────────────
export async function getSettings() {
  const rows = await query('SELECT * FROM settings WHERE id = 1');
  if (rows.length === 0) {
    return {
      activeAIProvider: process.env.OLLAMA_MODEL ? 'ollama' : 'expert',
      apiKeys: { openai: '', gemini: '', claude: '' },
      ollamaUrl:   process.env.OLLAMA_URL   || 'http://localhost:11434',
      ollamaModel: process.env.OLLAMA_MODEL || 'llama3',
      apiEndpoints: { openai: '', gemini: '', claude: '', ollama: '' }
    };
  }
  const row = rows[0];
  const apiKeys = typeof row.api_keys === 'string' ? JSON.parse(row.api_keys) : (row.api_keys || {});
  const apiEndpoints = typeof row.api_endpoints === 'string' ? JSON.parse(row.api_endpoints) : (row.api_endpoints || { openai: '', gemini: '', claude: '', ollama: '' });
  return {
    activeAIProvider: row.active_ai_provider,
    apiKeys,
    ollamaUrl:   row.ollama_url   || process.env.OLLAMA_URL   || 'http://localhost:11434',
    ollamaModel: row.ollama_model || process.env.OLLAMA_MODEL || 'llama3',
    apiEndpoints
  };
}

export async function updateSettings(settingsData) {
  const current = await getSettings();
  const merged  = { ...current, ...settingsData };
  const apiKeys = JSON.stringify(merged.apiKeys || { openai: '', gemini: '', claude: '' });
  const apiEndpoints = JSON.stringify(merged.apiEndpoints || { openai: '', gemini: '', claude: '', ollama: '' });

  await query(
    `INSERT INTO settings (id, active_ai_provider, api_keys, ollama_url, ollama_model, api_endpoints)
     VALUES (1, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       active_ai_provider = VALUES(active_ai_provider),
       api_keys           = VALUES(api_keys),
       ollama_url         = VALUES(ollama_url),
       ollama_model       = VALUES(ollama_model),
       api_endpoints      = VALUES(api_endpoints)`,
    [merged.activeAIProvider || 'ollama', apiKeys,
     merged.ollamaUrl || 'http://localhost:11434', merged.ollamaModel || 'llama3',
     apiEndpoints]
  );
  return getSettings();
}

export async function updateAssessmentRemarks(id, remarks, provider) {
  await query(
    'UPDATE assessments SET remarks = ?, remarks_provider = ? WHERE id = ?',
    [remarks, provider || 'AI', id]
  );
  return getAssessmentById(id);
}