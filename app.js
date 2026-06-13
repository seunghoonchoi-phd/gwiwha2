/* =====================================================================
   귀화시험 종합평가 연습 앱  (순수 정적 PWA)
   - 동기화: questions.json 을 네트워크에서 받아 localStorage 에 저장
   - 오프라인: 마지막으로 받은 문제(캐시)로 동작
   - 모드: 모의고사 / 영역별 연습 / 작문·구술 / 오답노트 / 통계
   ===================================================================== */

'use strict';

/* ---------- 저장소 키 ---------- */
const K = {
  bank: 'nq_bank',
  meta: 'nq_meta',
  wrong: 'nq_wrong',
  stats: 'nq_stats',
  history: 'nq_history',
  drafts: 'nq_drafts',
};

/* ---------- 아주 최소한의 내장 예비 문제 (네트워크/캐시 모두 없을 때만 사용) ---------- */
const FALLBACK = {
  version: '내장본',
  title: '귀화용 종합평가 연습(내장 예비)',
  questions: [
    { id: 'fb1', category: '사회·문화', type: 'mc', q: '대한민국의 국기 이름은?', choices: ['일장기', '태극기', '성조기', '오성홍기'], answer: 1, explanation: '대한민국의 국기는 태극기입니다.' },
    { id: 'fb2', category: '역사', type: 'mc', q: '한글을 만든 조선의 왕은?', choices: ['태조', '세종대왕', '정조', '영조'], answer: 1, explanation: '세종대왕이 훈민정음을 창제했습니다.' },
    { id: 'fb3', category: '정치·헌법', type: 'mc', q: '대한민국 대통령의 임기는?', choices: ['4년', '5년', '6년', '7년'], answer: 1, explanation: '대통령 임기는 5년 단임입니다.' },
  ],
};

/* ---------- 상태 ---------- */
let BANK = [];          // 전체 문제 배열
let META = { version: '-', syncedAt: null };
let quiz = null;        // 현재 진행 중인 퀴즈 상태

/* ---------- 유틸 ---------- */
const $ = (id) => document.getElementById(id);
const NUM = ['①', '②', '③', '④', '⑤'];

function ls(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function toast(msg, ms = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}
function fmtDate(iso) {
  if (!iso) return '없음';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
const mcOnly = () => BANK.filter((q) => q.type === 'mc');
const byType = (t) => BANK.filter((q) => q.type === t);

/* =====================================================================
   초기화
   ===================================================================== */
async function init() {
  // 서비스워커 등록(오프라인 지원). file:// 에서는 무시됨.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  loadBankFromStorageOrFallback();
  wireEvents();
  showView('home');
  renderHome();

  // 자동으로 한 번 동기화 시도(조용히). 실패해도 캐시로 동작.
  sync({ silent: true });
}

function loadBankFromStorageOrFallback() {
  const cached = ls(K.bank, null);
  const meta = ls(K.meta, null);
  if (cached && Array.isArray(cached) && cached.length) {
    BANK = cached;
    META = meta || { version: '?', syncedAt: null };
  } else {
    BANK = FALLBACK.questions;
    META = { version: FALLBACK.version, syncedAt: null };
  }
}

/* =====================================================================
   동기화
   ===================================================================== */
async function sync({ silent = false } = {}) {
  const btn = $('syncBtn');
  btn.classList.add('is-syncing');
  if (!silent) toast('최신 문제를 받는 중…');

  try {
    const res = await fetch('questions.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.questions;
    if (!Array.isArray(list) || !list.length) throw new Error('문제 형식 오류');

    BANK = list;
    META = { version: (data.version || '?'), syncedAt: new Date().toISOString() };
    save(K.bank, BANK);
    save(K.meta, META);

    setSyncStatus(`최신 문제로 동기화됨 · 총 ${BANK.length}문항`, false);
    if (!silent) toast(`동기화 완료! 총 ${BANK.length}문항`);
    renderHome();
  } catch (e) {
    if (META.syncedAt) {
      setSyncStatus(`오프라인 — 마지막 동기화한 ${BANK.length}문항으로 진행`, true);
      if (!silent) toast('인터넷 연결을 확인하세요. 저장된 문제로 계속할 수 있어요.');
    } else {
      setSyncStatus('아직 문제를 받지 못했습니다. 인터넷 연결 후 동기화를 눌러주세요.', true);
      if (!silent) toast('문제를 받지 못했습니다.');
    }
  } finally {
    btn.classList.remove('is-syncing');
  }
}

function setSyncStatus(text, isError) {
  const el = $('syncStatus');
  el.textContent = text;
  el.classList.toggle('is-error', !!isError);
}

/* =====================================================================
   화면 전환
   ===================================================================== */
const VIEWS = ['home', 'practice', 'examintro', 'quiz', 'writing', 'result', 'wrong', 'stats'];
function showView(name) {
  VIEWS.forEach((v) => $('view-' + v).classList.toggle('hidden', v !== name));
  if (name !== 'quiz') document.body.classList.remove('exam-mode'); // 시험지 테마는 퀴즈 화면에서만
  window.scrollTo(0, 0);
}

/* =====================================================================
   홈
   ===================================================================== */
function renderHome() {
  const wrong = ls(K.wrong, []);
  $('wrongCount').textContent = `틀린 문제 ${wrong.length}개`;
  const mc = mcOnly().length;
  $('bankInfo').textContent =
    `문제집 버전: ${META.version} · 객관식 ${mc}문항 · 마지막 동기화: ${fmtDate(META.syncedAt)}`;
  if (META.syncedAt) setSyncStatus(`준비 완료 · 총 ${BANK.length}문항 (객관식 ${mc})`, false);
  else setSyncStatus('동기화를 누르면 최신 문제를 받아옵니다.', false);
}

/* =====================================================================
   영역별 연습 - 카테고리 목록
   ===================================================================== */
function renderCategories() {
  const cats = {};
  mcOnly().forEach((q) => { cats[q.category] = (cats[q.category] || 0) + 1; });
  const wrap = $('categoryList');
  wrap.innerHTML = '';

  // 전체 섞기 카드
  wrap.appendChild(catItem('🎲 전체 무작위', mcOnly().length, () => startQuiz(shuffle(mcOnly()), 'practice')));

  Object.keys(cats).forEach((c) => {
    wrap.appendChild(catItem(c, cats[c], () => {
      const list = shuffle(mcOnly().filter((q) => q.category === c));
      startQuiz(list, 'practice');
    }));
  });
}
function catItem(name, count, onClick) {
  const el = document.createElement('button');
  el.className = 'cat-item';
  el.innerHTML = `<span>${name}</span><span class="cat-item__count">${count}문항</span>`;
  el.addEventListener('click', onClick);
  return el;
}

/* =====================================================================
   퀴즈 엔진  (mode: 'practice' | 'mock' | 'wrong')
   ===================================================================== */
function startQuiz(questions, mode) {
  if (!questions.length) { toast('풀 수 있는 문제가 없습니다. 동기화를 먼저 해주세요.'); return; }
  quiz = {
    mode,
    list: questions,
    i: 0,
    answers: new Array(questions.length).fill(null), // 객관식: 선택한 보기 index
    text: {},                                         // 작문: 문항 id별 작성 답안
    graded: mode === 'practice' || mode === 'wrong',  // 즉시 채점 여부
    startTime: Date.now(),
    timer: null,
    timeLeft: 60 * 60, // 모의고사용 60분
  };
  showView('quiz');

  const isMock = mode === 'mock';
  document.body.classList.toggle('exam-mode', isMock);
  $('examBanner').classList.toggle('hidden', !isMock);
  $('quizTimer').classList.toggle('hidden', !isMock);
  $('quizCat').classList.toggle('hidden', isMock);
  if (isMock) startTimer();

  renderQuestion();
}

/* 모의고사 표지(유의사항) → 시험 시작 */
function showExamIntro() {
  if (!mcOnly().length) { toast('문제가 없습니다. 동기화를 먼저 해주세요.'); return; }
  // 수험번호 자동 생성(겉보기용)
  $('examNo').value = 'KINAT-' + String(Math.floor(1000 + Math.random() * 9000));
  showView('examintro');
}
function startMockExam() {
  // 객관식 36문항 + 작문형 전체(순서대로 뒤에 배치)
  const mc = shuffle(mcOnly()).slice(0, 36);
  const writing = byType('writing');
  startQuiz(mc.concat(writing), 'mock');
}

/* 작문 답안 입력 */
function onWriteInput() {
  const q = quiz.list[quiz.i];
  const val = $('writeInput').value;
  quiz.text[q.id] = val;
  const meta = $('writeArea').querySelector('.write-area__meta');
  $('writeCount').textContent = val.length + '자';
  meta.classList.toggle('over', val.length > 200);
}

function startTimer() {
  updateTimerLabel();
  quiz.timer = setInterval(() => {
    quiz.timeLeft--;
    updateTimerLabel();
    if (quiz.timeLeft <= 0) { clearInterval(quiz.timer); toast('시간 종료! 자동 채점합니다.'); gradeMock(); }
  }, 1000);
}
function updateTimerLabel() {
  const m = Math.floor(quiz.timeLeft / 60), s = quiz.timeLeft % 60;
  $('quizTimer').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderQuestion() {
  const q = quiz.list[quiz.i];
  const total = quiz.list.length;
  const isWriting = q.type !== 'mc';

  $('quizProgress').textContent = `${quiz.i + 1} / ${total}`;
  $('progressFill').style.width = `${((quiz.i + 1) / total) * 100}%`;
  if (quiz.mode !== 'mock') $('quizCat').textContent = q.category;

  // 영역 배너(모의고사 시험지)
  if (quiz.mode === 'mock') {
    const mcCount = quiz.list.filter((x) => x.type === 'mc').length;
    if (!isWriting) {
      $('examBanner').textContent = `【객관식】  ${quiz.i + 1} / ${mcCount}`;
    } else {
      const wDone = quiz.list.slice(0, quiz.i + 1).filter((x) => x.type !== 'mc').length;
      const wTotal = quiz.list.filter((x) => x.type !== 'mc').length;
      $('examBanner').textContent = `【작문형】  ${wDone} / ${wTotal}  ·  200자 이내`;
    }
  }

  $('questionBox').innerHTML = q.q;

  const chosen = quiz.answers[quiz.i];
  const showAnswer = quiz.graded && !isWriting && chosen !== null;

  // 객관식 보기 / 작문 답안칸 토글
  $('choices').classList.toggle('hidden', isWriting);
  $('writeArea').classList.toggle('hidden', !isWriting);

  if (isWriting) {
    const ta = $('writeInput');
    ta.value = quiz.text[q.id] || '';
    $('writeCount').textContent = ta.value.length + '자';
    $('writeArea').querySelector('.write-area__meta').classList.toggle('over', ta.value.length > 200);
    $('feedback').classList.add('hidden'); // 시험 중에는 도움말 숨김(채점 후 다시보기에서 제공)
  } else {
    const cwrap = $('choices');
    cwrap.innerHTML = '';
    q.choices.forEach((c, idx) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `<span class="choice__num">${NUM[idx]}</span><span>${c}</span>`;
      if (chosen === idx) b.classList.add('is-selected');
      if (showAnswer) {
        b.disabled = true;
        if (idx === q.answer) b.classList.add('is-correct');
        else if (idx === chosen) b.classList.add('is-wrong');
      }
      b.addEventListener('click', () => onChoose(idx));
      cwrap.appendChild(b);
    });

    const fb = $('feedback');
    if (showAnswer) {
      const ok = chosen === q.answer;
      fb.className = 'feedback' + (ok ? '' : ' is-wrong');
      fb.innerHTML = `<strong>${ok ? '정답입니다! ✅' : '오답입니다 ❌  정답: ' + NUM[q.answer] + ' ' + q.choices[q.answer]}</strong>${q.explanation || ''}`;
      fb.classList.remove('hidden');
    } else {
      fb.classList.add('hidden');
    }
  }

  // 버튼 상태
  const last = quiz.i === total - 1;
  $('prevBtn').classList.toggle('hidden', quiz.mode !== 'mock' || quiz.i === 0);
  if (quiz.mode === 'mock') {
    // 모의고사는 답을 고르지 않아도 넘어갈 수 있음. (연습 모드와 공유되는 버튼이므로 상태 초기화)
    $('nextBtn').classList.toggle('hidden', last);
    $('nextBtn').disabled = false;
    $('nextBtn').style.opacity = '1';
    $('nextBtn').textContent = '다음 →';
    $('submitBtn').classList.toggle('hidden', !last);
  } else {
    // 연습/오답: 정답을 골라야 다음으로
    $('nextBtn').classList.toggle('hidden', false);
    $('nextBtn').textContent = last ? '결과 보기' : '다음 →';
    $('nextBtn').disabled = chosen === null;
    $('nextBtn').style.opacity = chosen === null ? '.5' : '1';
    $('submitBtn').classList.add('hidden');
  }
}

function onChoose(idx) {
  const already = quiz.answers[quiz.i];
  // 연습/오답 모드는 한 번 고르면 채점 확정(바꾸기 금지)
  if (quiz.graded && already !== null) return;

  quiz.answers[quiz.i] = idx;

  if (quiz.graded) {
    const q = quiz.list[quiz.i];
    const ok = idx === q.answer;
    recordAnswer(q, ok);
    if (!ok) addWrong(q.id); else removeWrong(q.id);
  }
  renderQuestion();
}

function nextQuestion() {
  if (quiz.mode !== 'mock' && quiz.answers[quiz.i] === null) return;
  if (quiz.i < quiz.list.length - 1) {
    quiz.i++;
    renderQuestion();
  } else {
    // 마지막
    if (quiz.mode === 'mock') gradeMock();
    else finishPractice();
  }
}
function prevQuestion() {
  if (quiz.i > 0) { quiz.i--; renderQuestion(); }
}

/* ---------- 연습/오답 종료 → 간단 결과 ---------- */
function finishPractice() {
  let correct = 0;
  quiz.list.forEach((q, i) => { if (quiz.answers[i] === q.answer) correct++; });
  renderResult(quiz.list, quiz.answers, correct, { isMock: false, totalMc: quiz.list.length });
}

/* ---------- 모의고사 채점 (객관식만 자동 채점, 작문은 자기 점검) ---------- */
function gradeMock() {
  if (quiz.timer) clearInterval(quiz.timer);
  const totalMc = quiz.list.filter((q) => q.type === 'mc').length;
  let correct = 0;
  quiz.list.forEach((q, i) => {
    if (q.type !== 'mc') return;            // 작문형은 자동채점·통계·오답에서 제외
    const ok = quiz.answers[i] === q.answer;
    if (ok) correct++;
    recordAnswer(q, ok);
    if (quiz.answers[i] === null || !ok) addWrong(q.id); else removeWrong(q.id);
  });

  const pct = totalMc ? Math.floor((correct / totalMc) * 100) : 0;
  const hist = ls(K.history, []);
  hist.unshift({ date: new Date().toISOString(), correct, total: totalMc, pct });
  save(K.history, hist.slice(0, 30));

  document.body.classList.remove('exam-mode');
  renderResult(quiz.list, quiz.answers, correct, { isMock: true, totalMc });
}

/* =====================================================================
   결과 화면
   ===================================================================== */
function renderResult(list, answers, correct, { isMock, totalMc }) {
  showView('result');
  const denom = totalMc || list.length;
  const pct = denom ? Math.floor((correct / denom) * 100) : 0;
  const hasWriting = list.some((q) => q.type !== 'mc');
  $('scorePct').textContent = pct;
  $('scoreFrac').textContent = `객관식 ${denom}문항 중 ${correct}문항 정답`
    + (hasWriting ? ' · 작문은 아래에서 직접 확인' : '');

  const passEl = $('scorePass');
  if (isMock) {
    const pass = pct >= 60;
    passEl.textContent = pass ? '합격선(60점) 통과 🎉' : '합격선(60점)까지 조금 더!';
    passEl.className = 'score-card__pass ' + (pass ? 'pass' : 'fail');
    passEl.title = '실제 시험은 작문 10점 + 구술 25점이 포함된 100점 만점 기준입니다.';
  } else {
    passEl.textContent = '연습 모드 결과입니다.';
    passEl.className = 'score-card__pass';
  }

  // 카테고리별 (객관식만)
  const cat = {};
  list.forEach((q, i) => {
    if (q.type !== 'mc') return;
    cat[q.category] = cat[q.category] || { c: 0, t: 0 };
    cat[q.category].t++;
    if (answers[i] === q.answer) cat[q.category].c++;
  });
  const cb = $('catBreakdown');
  cb.innerHTML = '';
  Object.keys(cat).forEach((c) => {
    const { c: cc, t } = cat[c];
    const p = Math.round((cc / t) * 100);
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = `<span class="cat-row__name">${c}</span>
      <span class="cat-row__bar"><span style="width:${p}%"></span></span>
      <span class="cat-row__val">${cc}/${t}</span>`;
    cb.appendChild(row);
  });

  // 문제 다시보기
  const texts = (quiz && quiz.text) ? quiz.text : {};
  const rl = $('reviewList');
  rl.innerHTML = '';
  list.forEach((q, i) => rl.appendChild(reviewItem(q, answers[i], texts[q.id])));

  // 틀린 문제만 다시 풀기 버튼(객관식)
  const wrongQs = list.filter((q, i) => q.type === 'mc' && answers[i] !== q.answer);
  $('retryWrongBtn').classList.toggle('hidden', wrongQs.length === 0);
  $('retryWrongBtn').onclick = () => startQuiz(shuffle(wrongQs), 'practice');
}

function reviewItem(q, chosen, writeText) {
  const el = document.createElement('div');
  el.className = 'review-item';

  // 작문형: 내가 쓴 답안 + 도움말
  if (q.type !== 'mc') {
    const ans = (writeText || '').trim().replace(/</g, '&lt;');
    el.innerHTML = `<div class="review-item__q">✍️ ${q.q}</div>
      <div class="review-item__write ${ans ? '' : 'empty-ans'}">${ans || '작성한 답안이 없습니다.'}</div>
      ${q.guide ? `<div class="review-item__exp">💡 ${q.guide}</div>` : ''}`;
    return el;
  }

  let opts = '';
  q.choices.forEach((c, idx) => {
    let cls = '';
    if (idx === q.answer) cls = 'correct';
    else if (idx === chosen) cls = 'chosen-wrong';
    opts += `<div class="review-item__opt ${cls}">${NUM[idx]} ${c}${idx === q.answer ? ' ✓' : ''}</div>`;
  });
  const unanswered = chosen === null || chosen === undefined;
  el.innerHTML = `<div class="review-item__q">${q.q}</div>${opts}
    ${unanswered ? '<div class="review-item__opt chosen-wrong">선택 안 함</div>' : ''}
    ${q.explanation ? `<div class="review-item__exp">💡 ${q.explanation}</div>` : ''}`;
  return el;
}

/* =====================================================================
   오답노트
   ===================================================================== */
function addWrong(id) {
  const w = ls(K.wrong, []);
  if (!w.includes(id)) { w.push(id); save(K.wrong, w); }
}
function removeWrong(id) {
  let w = ls(K.wrong, []);
  if (w.includes(id)) { w = w.filter((x) => x !== id); save(K.wrong, w); }
}
function renderWrong() {
  const ids = ls(K.wrong, []);
  const list = ids.map((id) => BANK.find((q) => q.id === id)).filter(Boolean);
  $('startWrongBtn').classList.toggle('hidden', list.length === 0);
  const rl = $('wrongList');
  rl.innerHTML = '';
  if (!list.length) { rl.innerHTML = '<div class="empty">틀린 문제가 없습니다. 잘하고 있어요! 👏</div>'; return; }
  list.forEach((q) => rl.appendChild(reviewItem(q, null)));
}

/* =====================================================================
   작문 / 구술
   ===================================================================== */
let writingType = 'writing';
function renderWriting() {
  const list = byType(writingType);
  const drafts = ls(K.drafts, {});
  const wrap = $('writingList');
  wrap.innerHTML = '';
  if (!list.length) { wrap.innerHTML = '<div class="empty">해당 유형의 문제가 없습니다.</div>'; return; }

  list.forEach((q) => {
    const card = document.createElement('div');
    card.className = 'writing-card';
    const isWriting = q.type === 'writing';
    card.innerHTML = `
      <div class="writing-card__q">${q.q}</div>
      ${isWriting ? `
        <textarea data-id="${q.id}" placeholder="여기에 답을 작성해 보세요 (200자 이내)">${drafts[q.id] || ''}</textarea>
        <div class="writing-card__meta">
          <span class="writing-card__count">0자</span>
        </div>` : ''}
      <button class="writing-card__guide-toggle">💡 도움말 보기</button>
      <div class="writing-card__guide hidden">${q.guide || ''}</div>`;

    if (isWriting) {
      const ta = card.querySelector('textarea');
      const cnt = card.querySelector('.writing-card__count');
      const upd = () => {
        const n = ta.value.length;
        cnt.textContent = `${n}자`;
        cnt.classList.toggle('over', n > 200);
      };
      ta.addEventListener('input', () => {
        upd();
        const d = ls(K.drafts, {}); d[q.id] = ta.value; save(K.drafts, d);
      });
      upd();
    }
    const tg = card.querySelector('.writing-card__guide-toggle');
    const gd = card.querySelector('.writing-card__guide');
    tg.addEventListener('click', () => {
      gd.classList.toggle('hidden');
      tg.textContent = gd.classList.contains('hidden') ? '💡 도움말 보기' : '💡 도움말 숨기기';
    });
    wrap.appendChild(card);
  });
}

/* =====================================================================
   통계
   ===================================================================== */
function recordAnswer(q, ok) {
  const s = ls(K.stats, { total: 0, correct: 0, cat: {} });
  s.total++; if (ok) s.correct++;
  s.cat[q.category] = s.cat[q.category] || { t: 0, c: 0 };
  s.cat[q.category].t++; if (ok) s.cat[q.category].c++;
  save(K.stats, s);
}
function renderStats() {
  const s = ls(K.stats, { total: 0, correct: 0, cat: {} });
  const acc = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  $('statsBox').innerHTML = `
    <div class="stat"><div class="stat__num">${s.total}</div><div class="stat__label">총 푼 문제</div></div>
    <div class="stat"><div class="stat__num">${acc}%</div><div class="stat__label">전체 정답률</div></div>`;

  // 카테고리별 막대
  let cat = '';
  Object.keys(s.cat).forEach((c) => {
    const { t, c: cc } = s.cat[c];
    const p = t ? Math.round((cc / t) * 100) : 0;
    cat += `<div class="cat-row"><span class="cat-row__name">${c}</span>
      <span class="cat-row__bar"><span style="width:${p}%"></span></span>
      <span class="cat-row__val">${p}%</span></div>`;
  });
  if (cat) $('statsBox').insertAdjacentHTML('afterend', '');
  const hist = ls(K.history, []);
  const hl = $('historyList');
  if (cat) {
    hl.innerHTML = `<div class="cat-breakdown" style="margin-bottom:18px">${cat}</div>`;
  } else hl.innerHTML = '';

  if (!hist.length) {
    hl.insertAdjacentHTML('beforeend', '<div class="empty">아직 모의고사 기록이 없습니다.</div>');
    return;
  }
  hist.forEach((h) => {
    hl.insertAdjacentHTML('beforeend', `<div class="history-item">
      <span>${fmtDate(h.date)}</span>
      <span class="history-item__score">${h.pct}점 (${h.correct}/${h.total})</span></div>`);
  });
}

/* =====================================================================
   이벤트 연결
   ===================================================================== */
function wireEvents() {
  $('homeBtn').addEventListener('click', () => { showView('home'); renderHome(); });
  $('syncBtn').addEventListener('click', () => sync({ silent: false }));

  // 홈 메뉴 카드
  document.querySelectorAll('[data-go]').forEach((el) => {
    el.addEventListener('click', () => {
      const go = el.dataset.go;
      if (go === 'home') { showView('home'); renderHome(); }
      else if (go === 'mock') { showExamIntro(); }
      else if (go === 'practice') { renderCategories(); showView('practice'); }
      else if (go === 'writing') { writingType = 'writing'; syncSeg(); renderWriting(); showView('writing'); }
      else if (go === 'wrong') { renderWrong(); showView('wrong'); }
      else if (go === 'stats') { renderStats(); showView('stats'); }
    });
  });

  // 퀴즈 버튼
  $('nextBtn').addEventListener('click', nextQuestion);
  $('prevBtn').addEventListener('click', prevQuestion);
  $('submitBtn').addEventListener('click', () => {
    if (confirm('제출하고 채점할까요?')) gradeMock();
  });
  $('examStartBtn').addEventListener('click', startMockExam);
  $('writeInput').addEventListener('input', onWriteInput);

  // 작문/구술 탭
  $('writingSeg').querySelectorAll('.seg__btn').forEach((b) => {
    b.addEventListener('click', () => { writingType = b.dataset.wt; syncSeg(); renderWriting(); });
  });

  // 오답노트
  $('startWrongBtn').addEventListener('click', () => {
    const ids = ls(K.wrong, []);
    const list = ids.map((id) => BANK.find((q) => q.id === id)).filter(Boolean);
    startQuiz(shuffle(list), 'wrong');
  });
  $('clearWrongBtn').addEventListener('click', () => {
    if (confirm('오답노트를 모두 비울까요?')) { save(K.wrong, []); renderWrong(); toast('오답노트를 비웠습니다.'); }
  });

  // 통계 초기화
  $('resetStatsBtn').addEventListener('click', () => {
    if (confirm('학습 통계와 기록을 모두 초기화할까요?')) {
      save(K.stats, { total: 0, correct: 0, cat: {} });
      save(K.history, []);
      renderStats(); toast('초기화했습니다.');
    }
  });
}

function syncSeg() {
  $('writingSeg').querySelectorAll('.seg__btn').forEach((b) => {
    b.classList.toggle('seg__btn--active', b.dataset.wt === writingType);
  });
}

/* ---------- 시작 ---------- */
window.addEventListener('DOMContentLoaded', init);
