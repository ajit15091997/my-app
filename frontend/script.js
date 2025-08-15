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

/* ---------------- BULK UPLOAD FEATURE BELOW ---------------- */
const bulkUploadSection = document.getElementById('bulkUploadSection');
const bulkSubject = document.getElementById('bulkSubject');
const bulkChapter = document.getElementById('bulkChapter');
const bulkTextarea = document.getElementById('bulkTextarea');
const previewBulkBtn = document.getElementById('previewBulkBtn');
const uploadBulkBtn = document.getElementById('uploadBulkBtn');
const bulkPreview = document.getElementById('bulkPreview');

let bulkQuestions = [];

function toggleBulkSection(show) {
  if (bulkUploadSection) {
    bulkUploadSection.style.display = show ? 'block' : 'none';
  }
}

// Flexible parser for Hindi/English formats (A), (1), (१), etc.
function parseBulkText(text) {
  const blocks = text.trim().split(/\n\s*\n/);
  const parsed = [];

  blocks.forEach(block => {
    const lines = block.split("\n").map(l => l.trim()).filter(l => l);

    if (lines.length >= 6) {
      const question = lines[0].replace(/^(Q\s*[\.\:\-\d०-९]*)\s*/i, '').trim();

      const options = lines.slice(1, 5).map(opt =>
        opt.replace(/^[A-Da-d१२३४१-४\d०-९\(\)\.\:\-\s]+/u, '').trim()
      );

      const ansLine = lines.find(l =>
        /^सही\s*उत्तर|^उत्तर|^Answer|^Ans|^Correct/i.test(l)
      );

      let correct = '';
      if (ansLine) {
        const ansText = ansLine.split(/[:\-–]/)[1]?.trim() || '';
        correct = ansText.replace(/^[A-Da-d\d०-९\.\)\s]+/, '').trim();
      }

      const expLine = lines.find(l => /^Explanation|^व्याख्या/i.test(l));
      const explanation = expLine ? expLine.split(/[:\-–]/)[1]?.trim() : '';

      if (question && options.length === 4 && correct) {
        parsed.push({
          subject: bulkSubject.value.trim(),
          chapter: bulkChapter.value.trim(),
          question,
          options,
          correct,
          explanation
        });
      }
    }
  });

  return parsed;
}

// Preview bulk questions
previewBulkBtn.onclick = () => {
  if (!bulkSubject.value || !bulkChapter.value) return alert('Enter subject & chapter!');
  bulkQuestions = parseBulkText(bulkTextarea.value);
  if (!bulkQuestions.length) return alert('No valid questions found!');
  bulkPreview.innerHTML = '<h3>Preview:</h3>' +
    bulkQuestions.map((q, i) => `
    <div style="border:1px solid #FFD700; padding:8px; margin:5px;">
      <b>Q${i + 1}:</b> ${q.question}<br>
      ${q.options.map((o, j) => `<div>${String.fromCharCode(65 + j)}) ${o}</div>`).join('')}
      <b>Answer:</b> ${q.correct}<br>
      <i>${q.explanation || ''}</i>
    </div>
  `).join('');
  uploadBulkBtn.style.display = 'inline-block';
};

// Upload bulk questions
uploadBulkBtn.onclick = async () => {
  const toUpload = bulkQuestions.filter(q =>
    q.subject && q.chapter && q.question && q.options.length === 4 && q.correct
  );
  if (!toUpload.length) return alert('No valid questions to upload.');
  uploadBulkBtn.disabled = true;
  uploadBulkBtn.innerText = 'Uploading...';

  try {
    const res = await fetch(`${BASE_URL}/api/questions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questions: toUpload })
    });

    if (res.status === 404) {
      alert("⚠️ Bulk upload feature not enabled on server.");
      return;
    }

    const data = await res.json();
    if (res.ok) {
      alert(`✅ Uploaded ${data.insertedCount || toUpload.length} questions.`);
      bulkTextarea.value = '';
      bulkPreview.innerHTML = '';
      uploadBulkBtn.style.display = 'none';
      fetchSubjects();
      subjectSelect.value = bulkSubject.value.trim();
      subjectSelect.dispatchEvent(new Event('change'));
    } else {
      alert(data.error || 'Bulk upload failed.');
    }
  } catch (err) {
    console.error(err);
    alert('⚠️ Could not connect to server.');
  } finally {
    uploadBulkBtn.disabled = false;
    uploadBulkBtn.innerText = 'Upload All';
  }
};

let currentQuestions = [], currentQuestionIndex = 0, attempts = 0, score = 0, editingQuestion = null;

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

// ✅ Updated Logic
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
  console.log('🔐 Login attempt started');
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  console.log('Username entered:', username);

  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    console.log('📨 Server response:', data);

    if (res.ok) {
      token = data.token;
      isSupreme = data.supreme;
      toggleAdmin(true);
      alert('✅ Logged in successfully!');
    } else {
      loginError.innerText = data.error || '❌ Login failed';
      console.log('❌ Login failed:', data.error || 'Unknown error');
    }
  } catch (err) {
    console.log('🔥 Login fetch error:', err);
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
