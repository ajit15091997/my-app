// script.js (final with flexible bulk parser)
const BASE_URL = "https://my-app-1-vg5k.onrender.com";
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

let currentQuestions = [], currentQuestionIndex = 0, attempts = 0, score = 0, editingQuestion = null;

// BULK UI elements
const bulkTextarea = document.getElementById('bulkTextarea');
const bulkSubject = document.getElementById('bulkSubject');
const bulkChapter = document.getElementById('bulkChapter');
const previewBulkBtn = document.getElementById('previewBulkBtn');
const uploadBulkBtn = document.getElementById('uploadBulkBtn');
const clearBulkBtn = document.getElementById('clearBulkBtn');
const bulkPreview = document.getElementById('bulkPreview');
const bulkPreviewContent = document.getElementById('bulkPreviewContent');

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

restartBtn.onclick = () => {
  subjectSelect.value = '';
  chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
  chapterSelect.disabled = true;
  quizArea.style.display = 'none';
  scoreboardEl.innerText = '';
  fetchSubjects();
};

addQuestionBtn.onclick = async () => {
  const payload = {
    subject: newSubject.value.trim(), chapter: newChapter.value.trim(),
    question: newQuestion.value.trim(), options: [option1.value.trim(), option2.value.trim(), option3.value.trim(), option4.value.trim()],
    correct: correctAnswer.value.trim(), explanation: answerExplanation.value.trim()
  };
  if (!payload.subject || !payload.chapter || !payload.question || payload.options.includes('') || !payload.correct) return alert('Please fill inputs!');
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

deleteSubjectBtn.onclick = async () => {
  if (!subjectSelect.value || !confirm(`Delete subject "${subjectSelect.value}"?`)) return;
  const res = await fetch(`${BASE_URL}/api/subjects/${subjectSelect.value}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  alert(res.ok ? 'Deleted!' : 'Failed');
  fetchSubjects();
};

deleteChapterBtn.onclick = async () => {
  if (!chapterSelect.value || !confirm(`Delete chapter "${chapterSelect.value}"?`)) return;
  const url = `${BASE_URL}/api/subjects/${subjectSelect.value}/chapters/${chapterSelect.value}`;
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  alert(res.ok ? 'Deleted!' : 'Failed');
  fetchSubjects();
  subjectSelect.dispatchEvent(new Event('change'));
};

deleteQuestionBtn.onclick = async () => {
  const q = currentQuestions[currentQuestionIndex];
  if (!q || !confirm('Delete this question?')) return;
  const res = await fetch(`${BASE_URL}/api/questions/${q._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  alert(res.ok ? 'Deleted!' : 'Failed');
  subjectSelect.dispatchEvent(new Event('change'));
};

editQuestionBtn.onclick = () => {
  const q = currentQuestions[currentQuestionIndex];
  editingQuestion = q._id;
  newSubject.value = subjectSelect.value;
  newChapter.value = chapterSelect.value;
  newQuestion.value = q.question;
  [option1,option2,option3,option4].forEach((el,i) => el.value = q.options[i]);
  correctAnswer.value = q.correct;
  answerExplanation.value = q.explanation;
  addQuestionBtn.innerText = 'Save Edit';
};

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
};

addNewAdminBtn.onclick = () => addAdminForm.style.display = 'block';
cancelCreateAdminBtn.onclick = () => addAdminForm.style.display = 'none';
createAdminBtn.onclick = async () => {
  const res = await fetch(`${BASE_URL}/api/admins`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ username: newAdminUsername.value.trim(), password: newAdminPassword.value.trim() })
  });
  const data = await res.json();
  alert(res.ok ? 'Admin Created!' : (data.error || 'Failed'));
  addAdminForm.style.display = 'none'; loadAdminList();
};

deleteSelectedAdminsBtn.onclick = async () => {
  const sel = [...adminList.querySelectorAll('input:checked')].map(c => c.value);
  if (!sel.length || !confirm('Delete selected?')) return;
  const res = await fetch(`${BASE_URL}/api/admins`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ usernames: sel })
  });
  alert(res.ok ? 'Deleted!' : 'Failed');
  loadAdminList();
};

async function loadAdminList() {
  adminList.innerHTML = '';
  const res = await fetch(`${BASE_URL}/api/admins`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const arr = await res.json();
  arr.forEach(a => {
    const li = document.createElement('li');
    li.innerHTML = `<label><input type="checkbox" value="${a.username}"> ${a.username}</label>`;
    adminList.appendChild(li);
  });
}

function toggleAdmin(loggedIn) {
  loginForm.style.display = loggedIn ? 'none' : 'block';
  adminPanel.style.display = logoutSection.style.display = loggedIn ? 'block' : 'none';
  addNewAdminBtn.style.display = (loggedIn && isSupreme) ? 'inline-block' : 'none';
  deleteAdminSection.style.display = (loggedIn && isSupreme) ? 'block' : 'none';

  deleteSubjectBtn.style.display = subjectSelect.value && loggedIn ? 'inline-block' : 'none';
  deleteChapterBtn.style.display = chapterSelect.value && loggedIn ? 'inline-block' : 'none';

  fetchSubjects();
}

subjectSelect.onchange = async () => {
  deleteSubjectBtn.style.display = subjectSelect.value && token ? 'inline-block' : 'none';
  const chaps = await fetchChapters(subjectSelect.value);
  chapterSelect.disabled = false;
  chapterSelect.innerHTML = '<option>Select Chapter</option>';
  chaps.forEach(c => {
    const opt = document.createElement('option');
    opt.value = opt.innerText = c;
    chapterSelect.appendChild(opt);
  });
};

chapterSelect.onchange = async () => {
  deleteChapterBtn.style.display = chapterSelect.value && token ? 'inline-block' : 'none';
  currentQuestions = await fetchQuestions(subjectSelect.value, chapterSelect.value);
  currentQuestionIndex = attempts = score = 0;
  quizArea.style.display = 'block';
  restartBtn.style.display = 'inline-block';
  loadQuestion();
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

window.onload = () => {
  fetchSubjects();
  toggleAdmin(false);
};

/* ================= FLEXIBLE BULK PARSER ================= */

// Helpers
function stripLabelPrefix(line) {
  // remove common prefixes like "A) ", "a) ", "1) ", "१) ", "A. ", "1. ", "A -", "A:", etc.
  return line.replace(/^\s*[A-Za-z\u0966-\u096F0-9]+[\)\.\-\:\s]+/u, '').trim();
}
function normalize(s) {
  return (s || '').toString().replace(/\s+/g, ' ').trim().toLowerCase();
}

// Detect correct-answer line using many keywords
function matchCorrectLine(line) {
  const regex = /(सही\s*(उत्तर|जवाब)|correct\s*answer|right\s*answer|answer|ANSWER|CORRECT ANSWER)\s*[:\-]?\s*(.*)/i;
  const m = line.match(regex);
  if (m) return m[3].trim();
  return null;
}

// parse single pipe-style line
function parsePipeLine(line, subject, chapter) {
  const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
  // minimum 6 parts: q + 4 options + correct
  if (parts.length < 6) return { error: 'Pipe format requires at least 6 parts (question|opt1|opt2|opt3|opt4|correct|explanation?)' };
  const [questionText, o1, o2, o3, o4, correct, ...rest] = parts;
  const options = [o1, o2, o3, o4];
  const explanation = rest.join(' | ').trim();
  // validate
  if (!questionText) return { error: 'Empty question' };
  if (options.some(o => !o)) return { error: 'All 4 options required' };
  if (!correct) return { error: 'Correct answer missing' };
  // determine correct text: could be letter/number or full text
  let correctText = correct;
  // if correct is single letter or number -> map to option
  const single = correct.trim().toLowerCase();
  if (/^[a-d]$/i.test(single) || /^[\u0966-\u096F1-4]$/.test(single) || /^[1-4]$/.test(single)) {
    // map letters/numbers to index
    const map = { 'a':0,'b':1,'c':2,'d':3,'1':0,'2':1,'3':2,'4':3, '१':0,'२':1,'३':2,'४':3 };
    const idx = map[single];
    if (idx === undefined) return { error: 'Cannot map correct option' };
    correctText = options[idx];
  } else {
    // may contain "B) text", remove prefix
    correctText = stripLabelPrefix(correctText);
    // if still not matching any option, we will do loose match later in validation
  }

  return {
    question: questionText,
    options,
    correct: correctText,
    explanation
  };
}

// parse exam-style block (multiple lines)
function parseBlock(blockText, subject, chapter) {
  const lines = blockText.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
  if (!lines.length) return { error: 'Empty block' };

  // If single-line with pipes, delegate
  if (lines.length === 1 && lines[0].includes('|')) return parsePipeLine(lines[0], subject, chapter);

  // First line(s) until an option-like line appear -> question
  // Option-like line: starts with A)/a)/1)/१)/ or looks like option (we'll try to detect when 4 options gathered)
  const optionCandidates = [];
  let qIndex = 0;
  // find first option-like line index
  for (let i = 1; i < lines.length && optionCandidates.length < 4; i++) {
    // check if line looks like option (has prefix) or starts with letter like A) or number
    const l = lines[i];
    const hasPrefix = /^[\s]*([A-Za-z\u0966-\u096F0-9]+)[\)\.\-\:]/u.test(l);
    // also if line length small and contains ')', treat as option
    if (hasPrefix || (l.length < 200 && (l.includes(')') || l.includes('.')))) {
      optionCandidates.push(l);
      if (optionCandidates.length === 1 && qIndex === 0) qIndex = i - 1;
    } else {
      // if we haven't yet found options, continue accumulating until options found
      if (optionCandidates.length === 0) qIndex = 0;
      else optionCandidates.push(l);
    }
  }

  // fallback detection: if we didn't detect options by prefix, but have at least 5 lines, assume lines 1..4 are options
  let questionText = lines[0];
  let options = [];
  let correctLine = null;
  let explanation = '';

  // Heuristic approach:
  if (lines.length >= 6) {
    // common pattern: q, opt1, opt2, opt3, opt4, correct (then maybe explanation)
    questionText = lines[0];
    options = lines.slice(1, 5).map(l => stripLabelPrefix(l));
    // find correct line among remaining lines
    for (let i = 5; i < lines.length; i++) {
      const possible = matchCorrectLine(lines[i]);
      if (possible !== null) {
        correctLine = possible;
        // if there are any lines after this, join as explanation
        if (i + 1 < lines.length) explanation = lines.slice(i + 1).join(' ');
        break;
      }
    }
    // if correctLine still null, maybe the 5th line itself contains "सही" etc.
    if (!correctLine && lines[5]) {
      const maybe = matchCorrectLine(lines[4]) || matchCorrectLine(lines[5]);
      if (maybe) correctLine = maybe;
    }
  } else {
    // Short blocks handling: try to find options by detecting 4 option-like lines anywhere
    const optLines = [];
    let correctCandidate = null;
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      const isCorrectMarker = matchCorrectLine(l);
      if (isCorrectMarker !== null) { correctCandidate = isCorrectMarker; continue; }
      optLines.push(l);
    }
    if (optLines.length >= 4) {
      questionText = lines[0];
      options = optLines.slice(0, 4).map(l => stripLabelPrefix(l));
      if (correctCandidate) correctLine = correctCandidate;
    } else {
      return { error: 'Could not detect 4 options in block' };
    }
  }

  // If correctLine still null, maybe last line contains direct correct text
  if (!correctLine) {
    // look for any line that begins with letter/number only like "A" or "b) ...", or contains "Correct"
    for (let i = 1; i < lines.length; i++) {
      const m = matchCorrectLine(lines[i]);
      if (m) { correctLine = m; break; }
    }
  }

  // If correctLine still null, maybe the last line is like "सही उत्तर: b) text" or simply "B) text"
  if (!correctLine) {
    // try last line stripping label
    const last = lines[lines.length - 1];
    const maybe = last;
    const pref = stripLabelPrefix(maybe);
    // if pref equals one of options => treat as correct text
    if (options.find(o => normalize(o) === normalize(pref))) {
      correctLine = pref;
      // explanation none
    }
  }

  // Now determine correct text
  let correctText = '';
  if (correctLine) {
    const cl = correctLine.trim();
    // if cl is a single letter/number
    const single = cl.replace(/\)/g,'').replace(/\./g,'').trim().toLowerCase();
    if (/^[a-d]$/i.test(single) || /^[\u0966-\u096F1-4]$/.test(single) || /^[1-4]$/.test(single)) {
      const map = { 'a':0,'b':1,'c':2,'d':3,'1':0,'2':1,'3':2,'4':3, '१':0,'२':1,'३':2,'४':3 };
      const idx = map[single];
      if (idx !== undefined && options[idx]) correctText = options[idx];
      else correctText = cl; // leave as-is
    } else {
      // remove label prefix if present
      correctText = stripLabelPrefix(cl);
      // if it's exactly one of options, fine; else we'll accept and later validate
    }
  } else {
    // no explicit correct line: attempt to find line that starts with "Correct Answer" or contains option letter
    // fallback: assume option 1 as correct? NO — better to error
    return { error: 'Could not detect correct answer line' };
  }

  return {
  
