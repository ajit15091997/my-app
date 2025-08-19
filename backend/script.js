const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Allow only your frontend Render domain
app.use(cors({
  origin: "https://my-app-1-vg5k.onrender.com", // apna frontend domain yahan daalo
  credentials: true
}));

app.use(express.json());

// ❌ Agar frontend alag static site pe hai to ye zaroori nahi
// app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

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

// 👑 Ensure Supreme Admin exists
(async () => {
  const exists = await Admin.findOne({ username: 'ajitquiz@53' });
  if (!exists) {
    const hash = await bcrypt.hash('ajit@15091997', 10);
    await Admin.create({ username: 'ajitquiz@53', password: hash });
    console.log('👑 Supreme admin created');
  }
})();

// Middleware for protected routes
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

// ---------------- AUTH ROUTES ----------------
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !await bcrypt.compare(password, admin.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const supreme = username === 'ajitquiz@53';
  const token = jwt.sign({ username, supreme }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, supreme });
});

// (baaki aapke routes bilkul sahi hain – maine unme change nahi kiya)

app.get('/', (req, res) => res.send('🟢 AKQuiz Backend Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server at port ${PORT}`));
