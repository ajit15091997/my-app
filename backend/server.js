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

// ✅ Debug Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`➡️ ${req.method} ${req.url} | Body:`, req.body);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`⬅️ ${req.method} ${req.url} | Status: ${res.statusCode} | Time: ${duration}ms`);
  });

  next();
});

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const Admin = mongoose.model('Admin', new mongoose.Schema({ username: String, password: String }));
const Question = mongoose.model('Question',
  new mongoose.Schema({ subject: String, chapter: String, question: String, options: [String], correct: String, explanation: String }));

// ✅ Supreme admin auto-create
(async () => {
  const exists = await Admin.findOne({ username: 'ajitquiz@53' });
  if (!exists) {
    const hash = await bcrypt.hash('ajit@15091997', 10);
    await Admin.create({ username: 'ajitquiz@53', password: hash });
    console.log('👑 Supreme admin created');
  }
})();

// ✅ Middleware for protected routes
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

// ✅ Admin login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !await bcrypt.compare(password, admin.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const supreme = username === 'ajitquiz@53';
  const token = jwt.sign({ username, supreme }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, supreme });
});

// ✅ Admin management
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

// ✅ Quiz APIs
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

// ✅ BULK UPLOAD FEATURE (with safe checks)
app.post('/api/questions/bulk', auth, async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length) {
      return res.status(400).json({ error: 'Invalid bulk data' });
    }

    const inserted = await Question.insertMany(questions.map(q => ({
      subject: q.subject?.trim(),
      chapter: q.chapter?.trim(),
      question: q.question?.trim(),
      options: q.options?.map(opt => opt.trim()) || [],
      correct: q.correct?.trim(),
      explanation: q.explanation?.trim() || ''
    })));

    return res.json({ insertedCount: inserted.length });
  } catch (err) {
    console.error('❌ Bulk upload error:', err.message);
    return res.status(500).json({ error: 'Bulk upload failed' });
  }
});

// ✅ Update / Delete APIs
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

// ✅ Root test
app.get('/', (req, res) => res.send('🟢 AKQuiz Backend Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server at port ${PORT}`));
