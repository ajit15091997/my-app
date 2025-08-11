// server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const Admin = mongoose.model('Admin', new mongoose.Schema({ username: String, password: String }));
const Question = mongoose.model('Question',
  new mongoose.Schema({ subject: String, chapter: String, question: String, options: [String], correct: String, explanation: String }));

// Create default supreme admin if missing (existing behaviour)
(async () => {
  try {
    const exists = await Admin.findOne({ username: 'ajitquiz@53' });
    if (!exists) {
      const hash = await bcrypt.hash('ajit@15091997', 10);
      await Admin.create({ username: 'ajitquiz@53', password: hash });
      console.log('👑 Supreme admin created');
    }
  } catch (err) {
    console.error('Error checking/creating admin:', err);
  }
})();

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalid' });
  }
}

// Auth & Admin routes (unchanged)
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

// Question endpoints (existing)
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

/*
  BULK upload endpoint
  URL: POST /api/questions/bulk/:subject/:chapter
  Body: array of question objects [{subject,chapter,question,options,correct,explanation}, ...]
*/
app.post('/api/questions/bulk/:subject/:chapter', auth, async (req, res) => {
  try {
    const subject = req.params.subject;
    const chapter = req.params.chapter;
    const data = Array.isArray(req.body) ? req.body : [];

    if (!data.length) return res.status(400).json({ error: 'Empty payload. Expected array of questions.' });

    const MAX_INSERT = 5000;
    if (data.length > MAX_INSERT) return res.status(400).json({ error: `Too many items. Max ${MAX_INSERT} per request.` });

    const toInsert = [];
    const errors = [];

    data.forEach((item, idx) => {
      const lineNum = idx + 1;
      const q = {
        subject,
        chapter,
        question: (item.question || '').toString().trim(),
        options: Array.isArray(item.options) ? item.options.map(o => (o || '').toString().trim()) : [],
        correct: (item.correct || '').toString().trim(),
        explanation: (item.explanation || '').toString().trim()
      };

      if (!q.question) { errors.push({ line: lineNum, error: 'Missing question text' }); return; }
      if (!q.options || q.options.length !== 4 || q.options.some(o => !o)) { errors.push({ line: lineNum, error: 'Options must be an array of 4 non-empty strings' }); return; }
      if (!q.correct) { errors.push({ line: lineNum, error: 'Missing correct answer' }); return; }

      // loose match: correct should equal one of options (case-insensitive trim)
      const normalize = s => (s || '').toString().trim().toLowerCase();
      if (!q.options.find(opt => normalize(opt) === normalize(q.correct))) {
        errors.push({ line: lineNum, error: 'Correct answer does not match any option' }); return;
      }

      toInsert.push(q);
    });

    if (!toInsert.length && errors.length) return res.status(400).json({ error: 'No valid rows to insert', details: errors });

    const insertResult = await Question.insertMany(toInsert, { ordered: false });

    res.json({
      success: true,
      requested: data.length,
      inserted: insertResult.length,
      invalidRows: errors
    });
  } catch (err) {
    console.error('Bulk insert error:', err);
    res.status(500).json({ error: 'Server error during bulk insert', details: err.message });
  }
});

app.get('/', (req, res) => res.send('🟢 AKQuiz Backend Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server at port ${PORT}`));
