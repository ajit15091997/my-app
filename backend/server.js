const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

/* ---------------- CORS (Reform Done) ----------------
   - Multiple origins supported (Render frontends)
   - Configurable via env ALLOWED_ORIGINS (comma-separated)
   - Handles preflight + sets allowed headers/methods
----------------------------------------------------- */
const DEFAULT_ALLOWED = [
  "https://my-app-1-vg5k.onrender.com", // your frontend (UI)
  "https://my-app-v7hb.onrender.com"    // your backend is called from this UI or vice-versa
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : DEFAULT_ALLOWED);

app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next(); });

app.use(cors({
  origin: (origin, cb) => {
    // allow non-browser / same-origin requests
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Preflight for all routes
app.options('*', cors());

app.use(express.json());

/* ---------------- DB CONNECTION ---------------- */
if (!process.env.MONGO_URI) {
  console.warn('⚠️  MONGO_URI missing in .env');
}
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET missing in .env (login will fail)');
}

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

/* ---------------- MODELS ---------------- */
const Admin = mongoose.model('Admin', new mongoose.Schema({
  username: String,
  password: String
}));

const Question = mongoose.model('Question', new mongoose.Schema({
  subject: String,
  chapter: String,
  question: String,
  options: [String],
  correct: String,
  explanation: String
}));

/* ---------------- SEED SUPREME ADMIN ---------------- */
(async () => {
  try {
    const exists = await Admin.findOne({ username: 'ajitquiz@53' });
    if (!exists) {
      const hash = await bcrypt.hash('ajit@15091997', 10);
      await Admin.create({ username: 'ajitquiz@53', password: hash });
      console.log('👑 Supreme admin created');
    }
  } catch (e) {
    console.error('❌ Error ensuring supreme admin:', e);
  }
})();

/* ---------------- AUTH MIDDLEWARE ---------------- */
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid' });
  }
}

/* ---------------- AUTH ROUTES ---------------- */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username & password required' });
    }
    const admin = await Admin.findOne({ username });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const supreme = username === 'ajitquiz@53';
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server JWT misconfigured' });
    }
    const token = jwt.sign({ username, supreme }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, supreme });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/admins', auth, async (req, res) => {
  if (!req.user.supreme) return res.status(403).json({ error: 'Forbidden' });
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username & password required' });
  if (await Admin.findOne({ username })) return res.status(400).json({ error: 'Username exists' });
  const hash = await bcrypt.hash(password, 10);
  await Admin.create({ username, password: hash });
  res.status(201).json({ success: true });
});

app.get('/api/admins', auth, async (req, res) => {
  if (!req.user.supreme) return res.status(403).json({ error: 'Forbidden' });
  const admins = await Admin.find({}, 'username');
  res.json(admins);
});

app.delete('/api/admins', auth, async (req, res) => {
  if (!req.user.supreme) return res.status(403).json({ error: 'Forbidden' });
  const { usernames } = req.body || {};
  if (!Array.isArray(usernames) || usernames.length === 0) {
    return res.status(400).json({ error: 'usernames[] required' });
  }
  await Admin.deleteMany({ username: { $in: usernames } });
  res.json({ success: true });
});

/* ---------------- QUIZ ROUTES ---------------- */
app.get('/api/subjects', async (_req, res) => {
  const subs = await Question.distinct('subject');
  res.json(subs);
});

app.get('/api/subjects/:subject/chapters', async (req, res) => {
  const chaps = await Question.find({ subject: req.params.subject }).distinct('chapter');
  res.json(chaps);
});

app.get('/api/subjects/:subject/chapters/:chapter/questions', async (req, res) => {
  const qs = await Question.find({ subject: req.params.subject, chapter: req.params.chapter });
  res.json(qs);
});

app.post('/api/questions', auth, async (req, res) => {
  await Question.create(req.body);
  res.status(201).json({ success: true });
});

// Bulk upload
app.post('/api/questions/bulk', auth, async (req, res) => {
  try {
    const questions = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Invalid input: expected an array of questions" });
    }
    const result = await Question.insertMany(questions);
    res.status(201).json({ success: true, inserted: result.length });
  } catch (err) {
    console.error('❌ Bulk insert error:', err);
    res.status(500).json({ error: "Bulk upload failed" });
  }
});

app.put('/api/questions/:id', auth, async (req, res) => {
  await Question.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.delete('/api/subjects/:subject', auth, async (req, res) => {
  await Question.deleteMany({ subject: req.params.subject });
  res.json({ success: true });
});

app.delete('/api/subjects/:subject/chapters/:chapter', auth, async (req, res) => {
  await Question.deleteMany({ subject: req.params.subject, chapter: req.params.chapter });
  res.json({ success: true });
});

app.delete('/api/questions/:id', auth, async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ---------------- DEBUG & HEALTH ---------------- */
// List all admins (for mobile check). Remove in production if you want.
app.get('/api/debug/admins', async (_req, res) => {
  const admins = await Admin.find({}, 'username');
  res.json(admins);
});

// Quick health info (does NOT leak secrets)
app.get('/api/debug/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1; // 1 = connected
  res.json({
    ok: true,
    mongoConnected: mongoOk,
    allowedOrigins: ALLOWED_ORIGINS,
    jwtConfigured: Boolean(process.env.JWT_SECRET)
  });
});

/* ---------------- SERVER ---------------- */
app.get('/', (_req, res) => res.send('🟢 AKQuiz Backend Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at port ${PORT}`));
