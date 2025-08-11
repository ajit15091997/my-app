const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quizapp');

const QuestionSchema = new mongoose.Schema({
  subject: String,
  chapter: String,
  question: String,
  options: [String],
  correct: String,
  explanation: String
});
const Question = mongoose.model('Question', QuestionSchema);

const AdminSchema = new mongoose.Schema({
  username: String,
  password: String,
  supreme: { type: Boolean, default: false }
});
const Admin = mongoose.model('Admin', AdminSchema);

const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Missing token' });
  const token = header.split(' ')[1];
  jwt.verify(token, 'SECRET_KEY', (err, admin) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.admin = admin;
    next();
  });
};

app.get('/api/subjects', async (req, res) => {
  const subs = await Question.distinct('subject');
  res.json(subs);
});

app.get('/api/subjects/:subject/chapters', async (req, res) => {
  const chaps = await Question.distinct('chapter', { subject: req.params.subject });
  res.json(chaps);
});

app.get('/api/subjects/:subject/chapters/:chapter/questions', async (req, res) => {
  const qs = await Question.find({ subject: req.params.subject, chapter: req.params.chapter });
  res.json(qs);
});

app.post('/api/questions', auth, async (req, res) => {
  try {
    const q = new Question(req.body);
    await q.save();
    res.json(q);
  } catch (err) {
    res.status(400).json({ error: 'Invalid data' });
  }
});

app.put('/api/questions/:id', auth, async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(q);
  } catch {
    res.status(400).json({ error: 'Update failed' });
  }
});

app.delete('/api/questions/:id', auth, async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
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

app.post('/api/admin/login', async (req, res) => {
  const admin = await Admin.findOne({ username: req.body.username });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(req.body.password, admin.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username: admin.username, supreme: admin.supreme }, 'SECRET_KEY');
  res.json({ token, supreme: admin.supreme });
});

app.post('/api/admins', auth, async (req, res) => {
  if (!req.admin.supreme) return res.status(403).json({ error: 'Forbidden' });
  const hash = await bcrypt.hash(req.body.password, 10);
  const admin = new Admin({ username: req.body.username, password: hash });
  await admin.save();
  res.json(admin);
});

app.get('/api/admins', auth, async (req, res) => {
  if (!req.admin.supreme) return res.status(403).json({ error: 'Forbidden' });
  const admins = await Admin.find({}, { password: 0 });
  res.json(admins);
});

app.delete('/api/admins', auth, async (req, res) => {
  if (!req.admin.supreme) return res.status(403).json({ error: 'Forbidden' });
  await Admin.deleteMany({ username: { $in: req.body.usernames } });
  res.json({ success: true });
});

/* =========================
   ✅ BULK UPLOAD ENDPOINT
   ========================= */
app.post('/api/questions/bulk', auth, async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length) {
      return res.status(400).json({ error: 'Invalid or empty bulk data' });
    }

    const validQuestions = questions.filter(q =>
      q.subject && q.chapter && q.question &&
      Array.isArray(q.options) && q.options.length === 4 &&
      q.correct
    );

    if (!validQuestions.length) {
      return res.status(400).json({ error: 'No valid questions in bulk data' });
    }

    const inserted = await Question.insertMany(validQuestions);
    res.json({ success: true, insertedCount: inserted.length });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
