const BASE_URL = "https://my-app-v7hb.onrender.com";
let token = null, isSupreme = false;
let currentQuestions = [], currentQuestionIndex = 0, attempts = 0, score = 0, editingQuestion = null;

// -------------------- DOM ELEMENTS --------------------
const subjectSelect = document.getElementById('subjectSelect');
const chapterSelect = document.getElementById('chapterSelect');
const quizArea = document.getElementById('quizArea');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const explanationText = document.getElementById('explanationText');
const restartBtn = document.getElementById('restart');
const deleteSubjectBtn = document.getElementById('deleteSubject');
const deleteChapterBtn = document.getElementById('deleteChapter');
const deleteQuestionBtn = document.getElementById('deleteQuestion');
const editQuestionBtn = document.getElementById('editQuestion');
const scoreboardEl = document.getElementById('scoreboard');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// ✅ Bulk Elements
const bulkSection = document.getElementById('bulkUploadSection');
const bulkSubject = document.getElementById('bulkSubject');
const bulkChapter = document.getElementById('bulkChapter');
const bulkTextarea = document.getElementById('bulkTextarea');
const previewBulkBtn = document.getElementById('previewBulk');
const uploadBulkBtn = document.getElementById('uploadBulk');
const editBulkBtn = document.getElementById('editBulk');
const bulkPreviewContainer = document.getElementById('bulkPreviewContainer');
const bulkPreviewList = document.getElementById('bulkPreviewList');

// Admin Inputs
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

// Login/Logout
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const adminPanel = document.getElementById('adminPanel');
const logoutSection = document.getElementById('logoutSection');
const logoutBtn = document.getElementById('logoutBtn');

// Admin Management
const addNewAdminBtn = document.getElementById('addNewAdminBtn');
const addAdminForm = document.getElementById('addAdminForm');
const newAdminUsername = document.getElementById('newAdminUsername');
const newAdminPassword = document.getElementById('newAdminPassword');
const createAdminBtn = document.getElementById('createAdminBtn');
const cancelCreateAdminBtn = document.getElementById('cancelCreateAdminBtn');
const deleteAdminSection = document.getElementById('deleteAdminSection');
const adminList = document.getElementById('adminList');
const deleteSelectedAdminsBtn = document.getElementById('deleteSelectedAdminsBtn');

// -------------------- FETCH FUNCTIONS --------------------
async function fetchSubjects() {
  const res = await fetch(`${BASE_URL}/api/subjects`);
  const subs = await res.json();
  subjectSelect.innerHTML = '<option value="">Select Subject</option>';
  subs.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = opt.innerText = sub;
    subjectSelect.appendChild(opt);
  });
}

// ✅ UPDATE 2 : Subject select → Chapters load
subjectSelect.onchange = async () => {
  const sub = subjectSelect.value;
  if (!sub) {
    chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
    chapterSelect.disabled = true;
    return;
  }
  const chapters = await fetchChapters(sub);
  chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
  chapters.forEach(ch => {
    const opt = document.createElement('option');
    opt.value = opt.innerText = ch;
    chapterSelect.appendChild(opt);
  });
  chapterSelect.disabled = false;
};

// ✅ UPDATE 3 : Chapter select → Questions load
chapterSelect.onchange = async () => {
  const sub = subjectSelect.value;
  const ch = chapterSelect.value;
  if (!sub || !ch) return;
  currentQuestions = await fetchQuestions(sub, ch);
  currentQuestionIndex = 0;
  attempts = 0; score = 0;
  quizArea.style.display = 'block';
  restartBtn.style.display = 'inline-block'; // show restart only when quiz starts
  loadQuestion();
};

async function fetchChapters(sub) {
  return (await fetch(`${BASE_URL}/api/subjects/${sub}/chapters`)).json();
}

async function fetchQuestions(sub, ch) {
  return (await fetch(`${BASE_URL}/api/subjects/${sub}/chapters/${ch}/questions`)).json();
}

// -------------------- QUIZ LOADING --------------------
function loadQuestion() {
  optionsEl.innerHTML = '';
  explanationText.style.display = 'none';
  if (currentQuestionIndex < currentQuestions.length) {
    const q = currentQuestions[currentQuestionIndex];
    questionEl.innerText = q.question;
    q.options.forEach(opt => {
      const div = document.createElement('div');
      div.classList.add('option');
      div.innerText = opt;
      div.onclick = () => selectOption(div, q.correct, q.explanation);
      optionsEl.appendChild(div);
    });
    deleteQuestionBtn.style.display = token ? 'inline-block' : 'none';
    editQuestionBtn.style.display = token ? 'inline-block' : 'none';
    prevBtn.style.display = nextBtn.style.display = 'inline-block';
    scoreboardEl.innerText = `Score: ${score} | Attempts: ${attempts}`;
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex >= currentQuestions.length - 1;
  } else {
    questionEl.innerText = "Quiz Completed!";
    optionsEl.innerHTML = '';
    scoreboardEl.innerText = `Final Score: ${score} / ${attempts}`;
    [prevBtn, nextBtn, deleteQuestionBtn, editQuestionBtn].forEach(b => b.style.display = 'none');
  }
}

function selectOption(el, correct, explanation) {
  document.querySelectorAll('.option').forEach(o => {
    o.style.pointerEvents = 'none';
    o.classList.remove('correct', 'wrong');
  });
  if (el.innerText.trim() === correct.trim()) {
    el.classList.add('correct');
    score++;
  } else {
    el.classList.add('wrong');
    document.querySelectorAll('.option').forEach(o => {
      if (o.innerText.trim() === correct.trim()) o.classList.add('correct');
    });
  }
  if (explanation?.trim()) {
    explanationText.innerText = `Explanation: ${explanation}`;
    explanationText.style.display = 'block';
  }
  attempts++;
  scoreboardEl.innerText = `Score: ${score} | Attempts: ${attempts}`;
}

// -------------------- RESTART --------------------
// ✅ UPDATE 1 : Restart button hidden initially, visible only after quiz starts
restartBtn.style.display = 'none';
restartBtn.onclick = () => {
  currentQuestions = [];
  currentQuestionIndex = 0;
  score = 0; attempts = 0;
  subjectSelect.value = '';
  chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
  chapterSelect.disabled = true;
  quizArea.style.display = 'none';
  scoreboardEl.innerText = '';
  restartBtn.style.display = 'none'; // hide again after restart
  fetchSubjects();
};

// -------------------- BULK / ADD / DELETE / EDIT --------------------
// 🔴 तुम्हारे पुराने कोड का पूरा हिस्सा जैसा है वैसा ही रहेगा
// (मैंने सिर्फ ऊपर के चार अपडेट्स डाले हैं, बाक़ी unchanged है)
