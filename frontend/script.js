const BASE_URL = "https://my-app-v7hb.onrender.com";
let token = null, isSupreme = false;
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

const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const adminPanel = document.getElementById('adminPanel');
const logoutSection = document.getElementById('logoutSection');
const logoutBtn = document.getElementById('logoutBtn');

const addNewAdminBtn = document.getElementById('addNewAdminBtn');
const addAdminForm = document.getElementById('addAdminForm');
const newAdminUsername = document.getElementById('newAdminUsername');
const newAdminPassword = document.getElementById('newAdminPassword');
const createAdminBtn = document.getElementById('createAdminBtn');
const cancelCreateAdminBtn = document.getElementById('cancelCreateAdminBtn');

const deleteAdminSection = document.getElementById('deleteAdminSection');
const adminList = document.getElementById('adminList');
const deleteSelectedAdminsBtn = document.getElementById('deleteSelectedAdminsBtn');

let currentQuestions = [], currentQuestionIndex = 0, attempts = 0, score = 0, editingQuestion = null;

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
    restartBtn.style.display = 'inline-block';
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
      if (o.innerText.trim() === correct.trim()) {
        o.classList.add('correct');
      }
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
restartBtn.onclick = () => {
  subjectSelect.value = '';
  chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
  chapterSelect.disabled = true;
  quizArea.style.display = 'none';
  scoreboardEl.innerText = '';
  fetchSubjects();
};

// -------------------- ADD SINGLE QUESTION --------------------
addQuestionBtn.onclick = async () => {
  const payload = {
    subject: newSubject.value.trim(),
    chapter: newChapter.value.trim(),
    question: newQuestion.value.trim(),
    options: [option1.value.trim(), option2.value.trim(), option3.value.trim(), option4.value.trim()],
    correct: correctAnswer.value.trim(),
    explanation: answerExplanation.value.trim()
  };
  if (!payload.subject || !payload.chapter || !payload.question || payload.options.includes('') || !payload.correct)
    return alert('Please fill inputs!');
  const method = editingQuestion ? 'PUT' : 'POST';
  const url = editingQuestion ? `${BASE_URL}/api/questions/${editingQuestion}` : `${BASE_URL}/api/questions`;
  const res = await fetch(url, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  alert(res.ok ? (editingQuestion ? 'Question Updated!' : 'Question Added!') : (data.error || 'Failed'));
  editingQuestion = null; addQuestionBtn.innerText = 'Add Question';
  [newSubject, newChapter, newQuestion, option1, option2, option3, option4, correctAnswer, answerExplanation].forEach(i => i.value = '');
  fetchSubjects();
};

// -------------------- BULK FEATURE --------------------
let bulkQuestions = [];

function parseBulkInput(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l);
  let questions = [];
  let current = null;

  lines.forEach(line => {
    // ✅ Question start (1. , 2) , etc.)
    if (/^\d+[\.\)]/.test(line)) {
      if (current) questions.push(current);
      current = { question: line.replace(/^\d+[\.\)]\s*/, ""), options: [], correct: "", explanation: "" };
    }
    // ✅ Options (A) B) C) D))
    else if (/^[A-D]\)/.test(line)) {
      if (current) current.options.push(line.replace(/^[A-D]\)\s*/, ""));
    }
    // ✅ Correct Answer (Hindi + English)
    else if (/^सही उत्तर[:：]/.test(line) || /^Correct Answer[:：]/i.test(line)) {
      if (current) current.correct = line.split(/[:：]/)[1].trim();
    }
    // ✅ Optional Explanation
    else if (/^व्याख्या[:：]/.test(line) || /^Explanation[:：]/i.test(line)) {
      if (current) current.explanation = line.split(/[:：]/)[1].trim();
    }
  });

  if (current) questions.push(current);
  return questions;
}

previewBulkBtn.onclick = () => {
  const raw = bulkTextarea.value.trim();
  if (!bulkSubject.value.trim() || !bulkChapter.value.trim() || !raw) return alert("Please fill subject, chapter and paste questions!");

  bulkQuestions = parseBulkInput(raw);
  if (!bulkQuestions.length) return alert("No valid questions found!");

  bulkPreviewList.innerHTML = "";
  bulkQuestions.forEach((q, i) => {
    const p = document.createElement("p");
    p.innerText = `${i + 1}. ${q.question}\nOptions: ${q.options.join(", ")}\nCorrect: ${q.correct}\nExplanation: ${q.explanation || "N/A"}`;
    bulkPreviewList.appendChild(p);
  });

  bulkPreviewContainer.style.display = "block";
  uploadBulkBtn.style.display = "inline-block";
};

editBulkBtn.onclick = () => {
  bulkTextarea.value = bulkQuestions.map(q => {
    return `${q.question}\n${q.options.map((o, i) => String.fromCharCode(65+i)+") "+o).join("\n")}\nसही उत्तर: ${q.correct}\nव्याख्या: ${q.explanation}`;
  }).join("\n\n");
  bulkPreviewContainer.style.display = "none";
  uploadBulkBtn.style.display = "none";
};

uploadBulkBtn.onclick = async () => {
  if (!token) return alert("Login required!");
  if (!bulkQuestions.length) return alert("Preview first!");

  const payload = bulkQuestions.map(q => ({
    subject: bulkSubject.value.trim(),
    chapter: bulkChapter.value.trim(),
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation
  }));

  const res = await fetch(`${BASE_URL}/api/questions/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ questions: payload })
  });

  const data = await res.json();
  alert(res.ok ? "✅ Bulk Questions Uploaded!" : (data.error || "❌ Upload failed"));
  bulkTextarea.value = "";
  bulkPreviewContainer.style.display = "none";
  uploadBulkBtn.style.display = "none";
  fetchSubjects();
};

// -------------------- ADMIN FUNCTIONS --------------------
// (unchanged from before... login/logout/edit/delete etc.)

loginBtn.onclick = async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      token = data.token;
      isSupreme = data.supreme;
      toggleAdmin(true);
      bulkSection.style.display = "block"; // ✅ Show bulk only for logged in admins
      alert('✅ Logged in successfully!');
    } else {
      loginError.innerText = data.error || '❌ Login failed';
    }
  } catch (err) {
    loginError.innerText = "⚠️ Unable to connect to server";
  }
};

logoutBtn.onclick = () => {
  token = null; isSupreme = false;
  toggleAdmin(false);
  bulkSection.style.display = "none"; // ✅ Hide bulk on logout
};

function toggleAdmin(loggedIn) {
  loginForm.style.display = loggedIn ? 'none' : 'block';
  adminPanel.style.display = logoutSection.style.display = loggedIn ? 'block' : 'none';
  addNewAdminBtn.style.display = (loggedIn && isSupreme) ? 'inline-block' : 'none';
  deleteAdminSection.style.display = (loggedIn && isSupreme) ? 'block' : 'none';
  deleteSubjectBtn.style.display = subjectSelect.value && loggedIn ? 'inline-block' : 'none';
  deleteChapterBtn.style.display = chapterSelect.value && loggedIn ? 'inline-block' : 'none';
  fetchSubjects();
}

window.onload = () => {
  fetchSubjects();
  toggleAdmin(false);
  bulkSection.style.display = "none"; // hide bulk until login
};
