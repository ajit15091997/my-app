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

// 🔹 NEW FEATURE ELEMENTS
const bulkSubjectInput = document.getElementById("bulkSubject");
const bulkChapterInput = document.getElementById("bulkChapter");
const bulkTextarea = document.getElementById("bulkTextarea");
const previewBtn = document.getElementById("previewBulkBtn");
const uploadBtn = document.getElementById("uploadBulkBtn");
const bulkPreview = document.getElementById("bulkPreview");

let currentQuestions = [], currentQuestionIndex = 0, attempts = 0, score = 0, editingQuestion = null;
let bulkParsedQuestions = [];

// ========================
// FETCH SUBJECTS/CHAPTERS/QUESTIONS (API)
// ========================
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

// ========================
// LOAD SINGLE QUESTION
// ========================
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

// ========================
// SELECT OPTION
// ========================
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

// ========================
// BULK UPLOAD: PREVIEW
// ========================
previewBtn?.addEventListener("click", () => {
  const rawText = bulkTextarea.value.trim();
  if (!bulkSubjectInput.value || !bulkChapterInput.value || !rawText) {
    alert("Please enter Subject, Chapter, and Bulk Questions.");
    return;
  }

  bulkParsedQuestions = parseBulkQuestions(rawText);

  if (bulkParsedQuestions.length === 0) {
    bulkPreview.innerHTML = "<p style='color:red;'>No valid questions found!</p>";
    uploadBtn.disabled = true;
    return;
  }

  let html = "<table border='1'><tr><th>#</th><th>Question</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Correct</th><th>Explanation</th></tr>";
  bulkParsedQuestions.forEach((q, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td>${q.question}</td>
      <td>${q.options[0] || ""}</td>
      <td>${q.options[1] || ""}</td>
      <td>${q.options[2] || ""}</td>
      <td>${q.options[3] || ""}</td>
      <td>${q.correct}</td>
      <td>${q.explanation || ""}</td>
    </tr>`;
  });
  html += "</table>";
  bulkPreview.innerHTML = html;

  uploadBtn.disabled = false;
});

// ========================
// BULK UPLOAD: SAVE TO BACKEND
// ========================
uploadBtn?.addEventListener("click", async () => {
  const subject = bulkSubjectInput.value.trim();
  const chapter = bulkChapterInput.value.trim();
  if (!bulkParsedQuestions.length) return alert("No questions to upload!");

  const payload = { subject, chapter, questions: bulkParsedQuestions };
  const res = await fetch(`${BASE_URL}/api/questions/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (res.ok) {
    alert("Bulk questions uploaded successfully!");
    bulkParsedQuestions = [];
    uploadBtn.disabled = true;
    bulkTextarea.value = "";
    bulkPreview.innerHTML = "Upload successful!";
    fetchSubjects();
  } else {
    alert(data.error || "Bulk upload failed");
  }
});

// ========================
// BULK PARSER FUNCTION
// ========================
function parseBulkQuestions(rawText) {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  let questions = [];
  let currentQ = null;

  lines.forEach(line => {
    if (/^(\d+\.?|[A-Za-zअ-ह][\.\)]?|[०-९]+\.?)/.test(line) || line.includes("?")) {
      if (currentQ) questions.push(currentQ);
      currentQ = { question: line.replace(/^(\d+\.?|[A-Za-zअ-ह][\.\)]?|[०-९]+\.?)/, "").trim(), options: [], correct: "", explanation: "" };
    }
    else if (/^[A-D]\)/i.test(line)) {
      if (currentQ) currentQ.options.push(line.replace(/^[A-D]\)/i, "").trim());
    }
    else if (/^(correct answer|answer|उत्तर|सही उत्तर)/i.test(line)) {
      if (currentQ) currentQ.correct = line.split(":")[1]?.trim() || line.split(" ")[1] || "";
    }
    else if (/^(explanation|व्याख्या)/i.test(line)) {
      if (currentQ) currentQ.explanation = line.split(":")[1]?.trim() || "";
    }
  });

  if (currentQ) questions.push(currentQ);
  return questions;
}

// ========================
// RESTART + NAVIGATION
// ========================
restartBtn.onclick = () => {
  subjectSelect.value = '';
  chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
  chapterSelect.disabled = true;
  quizArea.style.display = 'none';
  scoreboardEl.innerText = '';
  fetchSubjects();
};

nextBtn.onclick = () => {
  if (currentQuestionIndex < currentQuestions.length - 1) {
    currentQuestionIndex++;
    loadQuestion();
  }
};

prevBtn.onclick = () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
  }
};

// ========================
// EXISTING CRUD EVENTS (Add/Edit/Delete)
// (same as before, untouched except where needed)
// ========================
// ... (your original code for add/edit/delete remains as is)

// ========================
// ON LOAD
// ========================
window.onload = () => {
  fetchSubjects();
  toggleAdmin(false);
};
