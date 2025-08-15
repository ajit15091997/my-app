const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Proper CORS config
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, 
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Models
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

// Create default Supreme Admin if not exists
(async () => {
  const exists = await Admin.findOne({ username: 'ajitquiz@53' });
  if (!exists) {
    const hash = await bcrypt.hash('ajit@15091997', 10);
    await Admin.create({ username: 'ajitquiz@53', password: hash });
    console.log('👑 Supreme admin created');
  }
})();

// Auth Middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log("❌ Unauthorized access - No token provided");
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    console.log("❌ Unauthorized access - Invalid token");
    res.status(401).json({ error: 'Token invalid' });
  }
}

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  console.log("🔐 Login attempt for:", username);

  try {
    const admin = await Admin.findOne({ username });

    if (!admin) {
      console.log("❌ Login failed - Admin not found:", username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log("❌ Login failed - Wrong password for:", username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const supreme = username === 'ajitquiz@53';
    const token = jwt.sign({ username, supreme }, process.env.JWT_SECRET, { expiresIn: '2h' });

    console.log("✅ Login successful for:", username, "| Supreme:", supreme);
    res.json({ token, supreme });

  } catch (err) {
    console.error("🔥 Error during login:", err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Add Admin (Supreme only)
app.post('/api/admins', auth, async (req, res) => {
  if (!req.user.supreme) return res.status(403).json({ error: 'Forbidden' });
  const { username, password } = req.body;
  if (await Admin.findOne({ username })) return res.status(400).json({ error: 'Username exists' });
  const hash = await bcrypt.hash(password, 10);
  await Admin.create({ username, password: hash });
  res.status(201).json({ success: true });
});

// Get all admins (Supreme only)
app.get('/api/admins', auth, async (req, res) => {
  if (!req.user.supreme) return res.status(403).json({ error: 'Forbidden' });
  const admins = await Admin.find({}, 'username');
  res.json(admins);
});

// Delete admins (Supreme only)
app.delete('/api/admins', auth, async (req, res) => {
  if (!req.user.supreme) return res.status(403).json({ error: 'Forbidden' });
  await Admin.deleteMany({ username: { $in: req.body.usernames } });
  res.json({ success: true });
});

// Get subjects
app.get('/api/subjects', async (req, res) => {
  const subs = await Question.distinct('subject');
  console.log(`📚 Subjects fetched: ${subs.length}`);
  res.json(subs);
});

// Get chapters of a subject
app.get('/api/subjects/:subject/chapters', async (req, res) => {
  const chaps = await Question.find({ subject: req.params.subject }).distinct('chapter');
  console.log(`📂 Chapters fetched for subject "${req.params.subject}": ${chaps.length}`);
  res.json(chaps);
});

// Get questions of a chapter
app.get('/api/subjects/:subject/chapters/:chapter/questions', async (req, res) => {
  const qs = await Question.find({ subject: req.params.subject, chapter: req.params.chapter });
  console.log(`❓ Questions fetched for ${req.params.subject} / ${req.params.chapter}: ${qs.length}`);
  res.json(qs);
});

// Add a question
app.post('/api/questions', auth, async (req, res) => {
  await Question.create(req.body);
  console.log("✅ New question added:", req.body.question);
  res.status(201).json({ success: true });
});

// Update a question
app.put('/api/questions/:id', auth, async (req, res) => {
  await Question.findByIdAndUpdate(req.params.id, req.body);
  console.log("✏️ Question updated:", req.params.id);
  res.json({ success: true });
});

// Delete subject
app.delete('/api/subjects/:subject', auth, async (req, res) => {
  await Question.deleteMany({ subject: req.params.subject });
  console.log(`🗑️ Subject deleted: ${req.params.subject}`);
  res.json({ success: true });
});

// Delete chapter
app.delete('/api/subjects/:subject/chapters/:chapter', auth, async (req, res) => {
  await Question.deleteMany({ subject: req.params.subject, chapter: req.params.chapter });
  console.log(`🗑️ Chapter deleted: ${req.params.chapter} from subject ${req.params.subject}`);
  res.json({ success: true });
});

// Delete question
app.delete('/api/questions/:id', auth, async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  console.log(`🗑️ Question deleted: ${req.params.id}`);
  res.json({ success: true });
});

// ✅ Bulk Upload Questions API
app.post('/api/questions/bulk', auth, async (req, res) => {
  try {
    if (!req.user) return res.status(403).json({ error: 'Not authorized' });

    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length) {
      console.log("⚠️ Bulk upload failed - No valid questions provided");
      return res.status(400).json({ error: 'Invalid bulk data' });
    }

    const inserted = await Question.insertMany(questions.map(q => ({
      subject: q.subject.trim(),
      chapter: q.chapter.trim(),
      question: q.question.trim(),
      options: q.options.map(opt => opt.trim()),
      correct: q.correct.trim(),
      explanation: q.explanation?.trim() || ''
    })));

    console.log(`✅ Bulk upload successful - ${inserted.length} questions inserted`);
    res.json({ insertedCount: inserted.length });
  } catch (err) {
    console.error('🔥 Bulk upload error:', err);
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

// Root Endpoint
app.get('/', (req, res) => res.send('🟢 AKQuiz Backend Running!'));

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server at port ${PORT}`));
