const BASE_URL = "https://my-app-v7hb.onrender.com";
let token = null, isSupreme = false;

// DOM Elements
const subjectSelect = document.getElementById('subjectSelect');
const chapterSelect = document.getElementById('chapterSelect');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const explanationText = document.getElementById('explanationText');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const restartBtn = document.getElementById('restart');
const deleteSubjectBtn = document.getElementById('deleteSubject');
const deleteChapterBtn = document.getElementById('deleteChapter');
const deleteQuestionBtn = document.getElementById('deleteQuestion');
const editQuestionBtn = document.getElementById('editQuestion');
const scoreboardEl = document.getElementById('scoreboard');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const logoutSection = document.getElementById('logoutSection');
const addNewAdminBtn = document.getElementById('addNewAdminBtn');
const addAdminForm = document.getElementById('addAdminForm');
const deleteAdminSection = document.getElementById('deleteAdminSection');
const adminList = document.getElementById('adminList');
const bulkUploadSection = document.getElementById('bulkUploadSection');

// Form Inputs
const newSubject = document.getElementById('newSubject');
const newChapter = document.getElementById('newChapter');
const newQuestion = document.getElementById('newQuestion');
const option1 = document.getElementById('option1');
const option2 = document.getElementById('option2');
const option3 = document.getElementById('option3');
const option4 = document.getElementById('option4');
const correctAnswer = document.getElementById('correctAnswer');
const answerExplanation = document.getElementById('answerExplanation');
const addQuestionBtn = document.getElementById('addQuestion');

// Login Inputs
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Add Admin Inputs
const newAdminUsername = document.getElementById('newAdminUsername');
const newAdminPassword = document.getElementById('newAdminPassword');
const createAdminBtn = document.getElementById('createAdminBtn');
const cancelCreateAdminBtn = document.getElementById('cancelCreateAdminBtn');
const deleteSelectedAdminsBtn = document.getElementById('deleteSelectedAdminsBtn');

// Bulk Upload Inputs
const bulkSubject = document.getElementById('bulkSubject');
const bulkChapter = document.getElementById('bulkChapter');
const bulkTextarea = document.getElementById('bulkTextarea');
const previewBulkBtn = document.getElementById('previewBulkBtn');
const uploadBulkBtn = document.getElementById('uploadBulkBtn');
const bulkPreview = document.getElementById('bulkPreview');

// Variables
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let attempts = 0;
let editingQuestion = null;
let bulkQuestions = [];

// Fetch Functions
async function fetchSubjects() {
  const res = await fetch(`${BASE_URL}/api/subjects`);
  const data = await res.json();
  subjectSelect.innerHTML = `<option value="">Select Subject</option>`;
  data.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = sub;
    subjectSelect.appendChild(opt);
  });
}

async function fetchChapters(subject) {
  const res = await fetch(`${BASE_URL}/api/subjects/${subject}/chapters`);
  return res.json();
}

async function fetchQuestions(subject, chapter) {
  const res = await fetch(`${BASE_URL}/api/subjects/${subject}/chapters/${chapter}/questions`);
  return res.json();
}

// Quiz Functions
function loadQuestion() {
  optionsEl.innerHTML = '';
  explanationText.style.display = 'none';

  if (currentQuestionIndex < currentQuestions.length) {
    const q = currentQuestions[currentQuestionIndex];
    questionEl.textContent = q.question;
    q.options.forEach(opt => {
      const div = document.createElement('div');
      div.classList.add('option');
      div.textContent = opt;
      div.onclick = () => selectOption(div, q.correct, q.explanation);
      optionsEl.appendChild(div);
    });
    scoreboardEl.textContent = `Score: ${score} | Attempts: ${attempts}`;
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === currentQuestions.length - 1;
    deleteQuestionBtn.style.display = token ? 'inline-block' : 'none';
    editQuestionBtn.style.display = token ? 'inline-block' : 'none';
  } else {
    questionEl.textContent = 'Quiz Completed!';
    optionsEl.innerHTML = '';
    restartBtn.style.display = 'inline-block';
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    deleteQuestionBtn.style.display = 'none';
    editQuestionBtn.style.display = 'none';
  }
}

function selectOption(el, correct, explanation) {
  document.querySelectorAll('.option').forEach(o => o.style.pointerEvents = 'none');
  if (el.textContent.trim() === correct.trim()) {
    el.classList.add('correct');
    score++;
  } else {
    el.classList.add('wrong');
    document.querySelectorAll('.option').forEach(o => {
      if (o.textContent.trim() === correct.trim()) o.classList.add('correct');
    });
  }
  if (explanation) {
    explanationText.textContent = `Explanation: ${explanation}`;
    explanationText.style.display = 'block';
  }
  attempts++;
  scoreboardEl.textContent = `Score: ${score} | Attempts: ${attempts}`;
}

// Admin Panel Toggle
function toggleAdmin(loggedIn) {
  loginForm.style.display = loggedIn ? 'none' : 'block';
  adminPanel.style.display = loggedIn ? 'block' : 'none';
  logoutSection.style.display = loggedIn ? 'block' : 'none';

  // Supreme Admin Controls
  addNewAdminBtn.style.display = (loggedIn && isSupreme) ? 'inline-block' : 'none';
  deleteAdminSection.style.display = (loggedIn && isSupreme) ? 'block' : 'none';

  // Bulk Upload Controls
  bulkUploadSection.style.display = loggedIn ? 'block' : 'none';

  fetchSubjects();
}

// Bulk Upload Parser
function parseBulkText(text) {
  const blocks = text.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 6) {
      return {
        subject: bulkSubject.value.trim(),
        chapter: bulkChapter.value.trim(),
        question: lines[0],
        options: lines.slice(1, 5),
        correct: lines[5].replace(/^Answer[:\-]?\s*/i, ''),
        explanation: lines[6] || ''
      };
    }
    return null;
  }).filter(Boolean);
}

// Bulk Upload Handlers
previewBulkBtn.onclick = () => {
  if (!bulkSubject.value || !bulkChapter.value) return alert('Enter Subject and Chapter first!');
  bulkQuestions = parseBulkText(bulkTextarea.value);
  if (!bulkQuestions.length) return alert('No valid questions found!');
  bulkPreview.innerHTML = bulkQuestions.map((q, i) =>
    `<div><b>Q${i+1}:</b> ${q.question}<br>${q.options.join('<br>')}<br><b>Answer:</b> ${q.correct}<br><i>${q.explanation}</i></div>`
  ).join('<hr>');
  uploadBulkBtn.style.display = 'inline-block';
};

uploadBulkBtn.onclick = async () => {
  const toUpload = bulkQuestions.filter(q => q.subject && q.chapter && q.question && q.options.length === 4 && q.correct);
  if (!toUpload.length) return alert('No valid questions to upload.');
  try {
    const res = await fetch(`${BASE_URL}/api/questions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questions: toUpload })
    });
    if (res.status === 404) {
      alert("⚠️ Bulk upload feature not enabled on server. Please contact admin.");
      return;
    }
    const data = await res.json();
    if (res.ok) {
      alert(`✅ Uploaded ${data.insertedCount || toUpload.length} questions.`);
      bulkTextarea.value = '';
      bulkPreview.innerHTML = '';
      uploadBulkBtn.style.display = 'none';
      fetchSubjects();
    } else {
      alert(data.error || 'Bulk upload failed.');
    }
  } catch {
    alert('⚠️ Could not connect to server. Bulk upload may not be enabled.');
  }
};
