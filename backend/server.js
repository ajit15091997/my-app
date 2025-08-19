// server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const Admin = mongoose.model('Admin', new mongoose.Schema({ username: String, password: String }));
const Question = mongoose.model('Question',
  new mongoose.Schema({ subject: String, chapter: String, question: String, options: [String], correct: String, explanation: String }));

// Seed Supreme Admin (unchanged)
(async () => {
  const exists = await Admin.findOne({ username: 'ajitquiz@53' });
  if (!exists) {
    const hash = await bcrypt.hash('ajit@15091997', 10);
    await Admin.create({ username: 'ajitquiz@53', password: hash });
    console.log('👑 Supreme admin created');
  }
})();

// -------- Auth Middleware --------
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

// -------- Admin Routes (unchanged) --------
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !await bcrypt.compare(password, admin.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const supreme = username === 'ajitquiz@53';
  const token = jwt.sign({ username, supreme }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, supreme });
});

app.post('/api/admins', auth, async (req, res) => {
  if (!req.user.supreme) return res.status(403).json({ error: 'Forbidden' });
  const { username, password } = req.body;
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
  await Admin.deleteMany({ username: { $in: req.body.usernames } });
  res.json({ success: true });
});

// -------- Quiz Data Routes (existing) --------
app.get('/api/subjects', async (req, res) => {
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

// -------- NEW: BULK UPLOAD SUPPORT --------

// CSV template download (secured so sirf admin hi le)
app.get('/api/questions/template', auth, (req, res) => {
  const header = 'subject,chapter,question,option1,option2,option3,option4,correct,explanation\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="questions_template.csv"');
  res.send(header);
});

// Multer (in-memory) for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

function normalizeRow(r) {
  // trim all string fields + ensure options array of length 4
  const safe = (v) => (typeof v === 'string' ? v.trim() : '');
  const options = [safe(r.option1), safe(r.option2), safe(r.option3), safe(r.option4)].filter(Boolean);
  return {
    subject: safe(r.subject),
    chapter: safe(r.chapter),
    question: safe(r.question),
    options,
    correct: safe(r.correct),
    explanation: safe(r.explanation || '')
  };
}

function isValid(doc) {
  return (
    doc.subject && doc.chapter && doc.question &&
    Array.isArray(doc.options) && doc.options.length >= 2 &&
    doc.correct && doc.options.includes(doc.correct)
  );
}

// Bulk JSON
app.post('/api/questions/bulk-json', auth, async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Array expected' });

  const rows = req.body.map(normalizeRow);
  const valids = [], errors = [];
  rows.forEach((d, i) => (isValid(d) ? valids.push(d) : errors.push({ index: i, reason: 'Invalid row', row: d })));

  if (!valids.length) return res.status(400).json({ inserted: 0, errors });

  try {
    const result = await Question.insertMany(valids, { ordered: false });
    res.json({ inserted: result.length, errors });
  } catch (e) {
    // collect duplicate/validation issues if any
    res.json({ inserted: (e.insertedDocs || []).length || 0, errors: [...errors, { reason: 'Insert error', detail: e.message }] });
  }
});

// Bulk CSV
app.post('/api/questions/bulk-csv', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });

  try {
    const text = req.file.buffer.toString('utf-8');
    const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
    const docs = rows.map(normalizeRow);

    const valids = [], errors = [];
    docs.forEach((d, i) => (isValid(d) ? valids.push(d) : errors.push({ index: i, reason: 'Invalid row', row: d })));

    if (!valids.length) return res.status(400).json({ inserted: 0, errors });

    const result = await Question.insertMany(valids, { ordered: false });
    res.json({ inserted: result.length, errors });
  } catch (e) {
    res.status(500).json({ error: 'Parse/Insert failed', detail: e.message });
  }
});

app.get('/', (req, res) => res.send('🟢 AKQuiz Backend Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server at port ${PORT}`));
