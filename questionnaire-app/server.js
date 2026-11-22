import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'digital-diagnostic-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'data', 'questionnaire.db');
const db = new Database(dbPath);

// Initialize database tables
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'superuser')),
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Companies table - add user_id for ownership
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      industry TEXT,
      size TEXT,
      founded_year INTEGER,
      location TEXT,
      website TEXT,
      contact_person TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Questionnaire responses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      section TEXT NOT NULL,
      question_key TEXT NOT NULL,
      question_text TEXT NOT NULL,
      answer TEXT,
      answer_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  // Reports table for tracking generated reports
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      format TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
    CREATE INDEX IF NOT EXISTS idx_responses_company ON responses(company_id);
    CREATE INDEX IF NOT EXISTS idx_responses_section ON responses(section);
    CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_reports_company ON reports(company_id);
  `);

  // Create default superuser if not exists
  const existingSuperuser = db.prepare('SELECT id FROM users WHERE role = ?').get('superuser');
  if (!existingSuperuser) {
    const hashedPassword = bcrypt.hashSync('admin123', SALT_ROUNDS);
    const superuserId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(superuserId, 'admin', 'admin@digital-diag.com', hashedPassword, 'System Administrator', 'superuser');
    console.log('Default superuser created: admin / admin123');
  }
}

initializeDatabase();

// ============================================================
// Authentication Middleware
// ============================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireSuperuser = (req, res, next) => {
  if (req.user.role !== 'superuser') {
    return res.status(403).json({ error: 'Superuser access required' });
  }
  next();
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

// ============================================================
// Auth Routes
// ============================================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, username, email, password_hash, full_name || username, 'user');

    // Generate JWT
    const token = jwt.sign(
      { id: userId, username, email, role: 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: userId, username, email, full_name, role: 'user' },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username or email
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        full_name: user.full_name, 
        role: user.role 
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// Update user profile
app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { full_name, email, current_password, new_password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If changing email, check uniqueness
    if (email && email !== user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, user.id);
      if (existing) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // If changing password, verify current password
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password required to change password' });
      }
      const validPassword = await bcrypt.compare(current_password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(full_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (new_password) {
      updates.push('password_hash = ?');
      params.push(await bcrypt.hash(new_password, SALT_ROUNDS));
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(user.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    // Return updated user
    const updatedUser = db.prepare('SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users WHERE id = ?').get(user.id);
    res.json({ user: updatedUser });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================================
// Company Routes (User-scoped)
// ============================================================

// Create company
app.post('/api/companies', authenticateToken, (req, res) => {
  const id = uuidv4();
  const { name, industry, size, founded_year, location, website, contact_person, contact_email, contact_phone } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO companies (id, user_id, name, industry, size, founded_year, location, website, contact_person, contact_email, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, req.user.id, name, industry, size, founded_year, location, website, contact_person, contact_email, contact_phone);
  res.json({ id, user_id: req.user.id, ...req.body });
});

// Get all companies for current user
app.get('/api/companies', authenticateToken, (req, res) => {
  const companies = db.prepare('SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(companies);
});

// Get single company (must belong to user or be superuser)
app.get('/api/companies/:id', authenticateToken, (req, res) => {
  let company;
  if (req.user.role === 'superuser') {
    company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  } else {
    company = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  }
  
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json(company);
});

// Update company
app.put('/api/companies/:id', authenticateToken, (req, res) => {
  const { name, industry, size, founded_year, location, website, contact_person, contact_email, contact_phone } = req.body;
  
  let stmt;
  if (req.user.role === 'superuser') {
    stmt = db.prepare(`
      UPDATE companies 
      SET name = ?, industry = ?, size = ?, founded_year = ?, location = ?, website = ?, contact_person = ?, contact_email = ?, contact_phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, industry, size, founded_year, location, website, contact_person, contact_email, contact_phone, req.params.id);
  } else {
    stmt = db.prepare(`
      UPDATE companies 
      SET name = ?, industry = ?, size = ?, founded_year = ?, location = ?, website = ?, contact_person = ?, contact_email = ?, contact_phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(name, industry, size, founded_year, location, website, contact_person, contact_email, contact_phone, req.params.id, req.user.id);
  }
  
  if (stmt.changes === 0) return res.status(404).json({ error: 'Company not found' });
  res.json({ id: req.params.id, ...req.body });
});

// Delete company
app.delete('/api/companies/:id', authenticateToken, (req, res) => {
  let stmt;
  if (req.user.role === 'superuser') {
    stmt = db.prepare('DELETE FROM companies WHERE id = ?');
    stmt.run(req.params.id);
  } else {
    stmt = db.prepare('DELETE FROM companies WHERE id = ? AND user_id = ?');
    stmt.run(req.params.id, req.user.id);
  }
  
  if (stmt.changes === 0) return res.status(404).json({ error: 'Company not found' });
  res.json({ success: true });
});

// ============================================================
// Responses Routes (User-scoped via company ownership)
// ============================================================

app.post('/api/responses', authenticateToken, (req, res) => {
  const id = uuidv4();
  const { company_id, section, question_key, question_text, answer, answer_type } = req.body;
  
  // Verify company ownership
  const company = db.prepare('SELECT id FROM companies WHERE id = ? AND user_id = ?').get(company_id, req.user.id);
  if (!company && req.user.role !== 'superuser') {
    return res.status(403).json({ error: 'Access denied to this company' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO responses (id, company_id, section, question_key, question_text, answer, answer_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, company_id, section, question_key, question_text, JSON.stringify(answer), answer_type);
  res.json({ id, company_id, section, question_key, question_text, answer, answer_type });
});

app.get('/api/responses/:companyId', authenticateToken, (req, res) => {
  // Verify company ownership
  const company = db.prepare('SELECT id FROM companies WHERE id = ? AND user_id = ?').get(req.params.companyId, req.user.id);
  if (!company && req.user.role !== 'superuser') {
    return res.status(403).json({ error: 'Access denied to this company' });
  }
  
  const responses = db.prepare('SELECT * FROM responses WHERE company_id = ? ORDER BY section, question_key').all(req.params.companyId);
  const parsed = responses.map(r => ({ ...r, answer: JSON.parse(r.answer) }));
  res.json(parsed);
});

app.get('/api/responses/:companyId/:section', authenticateToken, (req, res) => {
  const company = db.prepare('SELECT id FROM companies WHERE id = ? AND user_id = ?').get(req.params.companyId, req.user.id);
  if (!company && req.user.role !== 'superuser') {
    return res.status(403).json({ error: 'Access denied to this company' });
  }
  
  const responses = db.prepare('SELECT * FROM responses WHERE company_id = ? AND section = ? ORDER BY question_key').all(req.params.companyId, req.params.section);
  const parsed = responses.map(r => ({ ...r, answer: JSON.parse(r.answer) }));
  res.json(parsed);
});

app.put('/api/responses/:id', authenticateToken, (req, res) => {
  const { answer } = req.body;
  
  // Verify ownership through company
  const response = db.prepare(`
    SELECT r.id FROM responses r
    JOIN companies c ON r.company_id = c.id
    WHERE r.id = ? AND (c.user_id = ? OR ? = 'superuser')
  `).get(req.params.id, req.user.id, req.user.role);
  
  if (!response) {
    return res.status(404).json({ error: 'Response not found' });
  }
  
  const stmt = db.prepare(`
    UPDATE responses 
    SET answer = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const result = stmt.run(JSON.stringify(answer), req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Response not found' });
  res.json({ id: req.params.id, answer });
});

// Bulk upsert responses
app.post('/api/responses/bulk', authenticateToken, (req, res) => {
  try {
    const { company_id, responses } = req.body;

    if (!company_id || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'company_id and responses array are required' });
    }

    // Verify company ownership
  const company = db.prepare('SELECT id FROM companies WHERE id = ? AND user_id = ?').get(company_id, req.user.id);
  if (!company && req.user.role !== 'superuser') {
    return res.status(403).json({ error: 'Access denied to this company' });
  }
  
  const insertStmt = db.prepare(`
    INSERT INTO responses (id, company_id, section, question_key, question_text, answer, answer_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const updateStmt = db.prepare(`
    UPDATE responses 
    SET answer = ?, updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND section = ? AND question_key = ?
  `);
  
  const checkStmt = db.prepare('SELECT id FROM responses WHERE company_id = ? AND section = ? AND question_key = ?');
  
  const transaction = db.transaction((responses) => {
    for (const r of responses) {
      const existing = checkStmt.get(company_id, r.section, r.question_key);
      if (existing) {
        updateStmt.run(JSON.stringify(r.answer), company_id, r.section, r.question_key);
      } else {
        insertStmt.run(uuidv4(), company_id, r.section, r.question_key, r.question_text, JSON.stringify(r.answer), r.answer_type);
      }
    }
  });
  
    transaction(responses);
    res.json({ success: true, count: responses.length });
  } catch (err) {
    console.error('Bulk response save error:', err);
    res.status(500).json({ error: err.message || 'Failed to save responses' });
  }
});

// ============================================================
// Export/Report Routes (User-scoped)
// ============================================================

app.get('/api/export/:companyId', authenticateToken, (req, res) => {
  // Verify company ownership
  const company = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(req.params.companyId, req.user.id);
  if (!company && req.user.role !== 'superuser') {
    return res.status(403).json({ error: 'Access denied to this company' });
  }
  
  const companyData = company || db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.companyId);
  if (!companyData) return res.status(404).json({ error: 'Company not found' });
  
  const responses = db.prepare('SELECT * FROM responses WHERE company_id = ? ORDER BY section, question_key').all(req.params.companyId);
  const parsedResponses = responses.map(r => ({ ...r, answer: JSON.parse(r.answer) }));
  
  const grouped = parsedResponses.reduce((acc, r) => {
    if (!acc[r.section]) acc[r.section] = [];
    acc[r.section].push(r);
    return acc;
  }, {});
  
  res.json({ company: companyData, responses: grouped });
});

// Generate advanced report
app.post('/api/report/generate/:companyId', authenticateToken, async (req, res) => {
  const { format } = req.body;
  const companyId = req.params.companyId;
  
  if (!['docx', 'pdf'].includes(format)) {
    return res.status(400).json({ error: 'Invalid format. Use "docx" or "pdf"' });
  }
  
  // Verify company ownership
  const company = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(companyId, req.user.id);
  if (!company && req.user.role !== 'superuser') {
    return res.status(403).json({ error: 'Access denied to this company' });
  }
  
  try {
    const { spawn } = await import('child_process');
    const fs = await import('fs');
    
    const scriptPath = path.join(__dirname, 'report_generator.py');
    const outputDir = path.join(__dirname, 'reports');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    
    const pythonExe = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
    
    const pythonProcess = spawn(pythonExe, [
      scriptPath,
      companyId,
      '--api', `http://localhost:${PORT}`,
      '--output', outputDir,
      '--formats', format,
      '--token', token
    ], {
      cwd: __dirname,
      env: { ...process.env, PYTHONPATH: __dirname }
    });
    
    let stderr = '';
    let stdout = '';
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Report generation failed:', stderr || stdout);
        return res.status(500).json({ 
          error: 'Report generation failed', 
          details: stderr || stdout || `Python process exited with code ${code}` 
        });
      }
      
      const files = fs.readdirSync(outputDir);
      const prefix = company.name.replace(/\s+/g, '_');
      // Pick the most recently generated file (not the first alphabetical match, which is the oldest)
      const reportFile = files
        .filter(f => f.startsWith(prefix) && f.endsWith(`.${format}`))
        .map(f => ({ f, t: fs.statSync(path.join(outputDir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t)
        .map(x => x.f)[0];
      
      if (reportFile) {
        const filePath = path.join(outputDir, reportFile);
        const stats = fs.statSync(filePath);
        
        // Save report record
        const reportId = uuidv4();
        db.prepare(`
          INSERT INTO reports (id, user_id, company_id, format, filename, file_path, file_size)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(reportId, req.user.id, companyId, format, reportFile, filePath, stats.size);
        
        res.json({ 
          success: true, 
          downloadUrl: `/api/report/download/${reportFile}`,
          filename: reportFile
        });
      } else {
        res.status(500).json({ error: 'Report file not found after generation' });
      }
    });
    
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: 'Failed to start report generation', details: err.message });
  }
});

// Download report
app.get('/api/report/download/:filename', authenticateToken, async (req, res) => {
  const fs = await import('fs');
  const outputDir = path.join(__dirname, 'reports');
  const filePath = path.join(outputDir, req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Verify user owns this report (or is superuser)
  const report = db.prepare(`
    SELECT r.* FROM reports r
    JOIN companies c ON r.company_id = c.id
    WHERE r.filename = ? AND (c.user_id = ? OR ? = 'superuser')
  `).get(req.params.filename, req.user.id, req.user.role);
  
  if (!report && req.user.role !== 'superuser') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.download(filePath, req.params.filename);
});

// Get user's reports
app.get('/api/reports', authenticateToken, (req, res) => {
  let reports;
  if (req.user.role === 'superuser') {
    reports = db.prepare(`
      SELECT r.*, u.username, u.full_name, c.name as company_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      JOIN companies c ON r.company_id = c.id
      ORDER BY r.created_at DESC
    `).all();
  } else {
    reports = db.prepare(`
      SELECT r.*, c.name as company_name
      FROM reports r
      JOIN companies c ON r.company_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.id);
  }
  res.json(reports);
});

// ============================================================
// Superuser Admin Routes
// ============================================================

// Get all users (superuser only)
app.get('/api/admin/users', authenticateToken, requireSuperuser, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, full_name, role, is_active, last_login, created_at,
           (SELECT COUNT(*) FROM companies WHERE user_id = users.id) as company_count,
           (SELECT COUNT(*) FROM reports WHERE user_id = users.id) as report_count
    FROM users
    ORDER BY created_at DESC
  `).all();
  res.json(users);
});

// Get user details with all data (superuser only)
app.get('/api/admin/users/:id', authenticateToken, requireSuperuser, (req, res) => {
  const user = db.prepare('SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const companies = db.prepare('SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC').all(req.params.id);
  
  const reports = db.prepare(`
    SELECT r.*, c.name as company_name
    FROM reports r
    JOIN companies c ON r.company_id = c.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);
  
  res.json({ user, companies, reports });
});

// Update user (superuser only)
app.put('/api/admin/users/:id', authenticateToken, requireSuperuser, async (req, res) => {
  try {
    const { full_name, email, role, is_active, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Prevent demoting last superuser
    if (user.role === 'superuser' && role === 'user') {
      const superuserCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('superuser');
      if (superuserCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last superuser' });
      }
    }
    
    // Check email uniqueness
    if (email && email !== user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.params.id);
      if (existing) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }
    
    const updates = [];
    const params = [];
    
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(full_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updates.push('password_hash = ?');
      params.push(await bcrypt.hash(password, SALT_ROUNDS));
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    
    const updatedUser = db.prepare('SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ user: updatedUser });
  } catch (err) {
    console.error('Admin user update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (superuser only)
app.delete('/api/admin/users/:id', authenticateToken, requireSuperuser, (req, res) => {
  // Prevent deleting self
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  // Prevent deleting last superuser
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
  if (user && user.role === 'superuser') {
    const superuserCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('superuser');
    if (superuserCount.count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last superuser' });
    }
  }
  
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(req.params.id);
  
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true });
});

// Get system stats (superuser only)
app.get('/api/admin/stats', authenticateToken, requireSuperuser, (req, res) => {
  const stats = {
    total_users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    active_users: db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count,
    superusers: db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('superuser').count,
    total_companies: db.prepare('SELECT COUNT(*) as count FROM companies').get().count,
    total_responses: db.prepare('SELECT COUNT(*) as count FROM responses').get().count,
    total_reports: db.prepare('SELECT COUNT(*) as count FROM reports').get().count,
    recent_logins: db.prepare('SELECT COUNT(*) as count FROM users WHERE last_login > datetime("now", "-7 days")').get().count,
  };
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});