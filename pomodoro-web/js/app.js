/**
 * 番茄钟主应用 - UI 绑定与交互
 */

import { createTimer } from './timer.js';
import { selectSound, getCurrentSound, playAlarm } from './audio.js';
import { getRecords, addRecord, clearRecords } from './history.js';
import { verifyToken, renderAuth, renderUserHeader, logout } from './auth.js';

const C = 276.46;

// ====== DOM 引用 ======
const $ = (id) => document.getElementById(id);
const dom = {
  authContainer: $('authContainer'),
  appContainer: $('appContainer'),
  userHeader: $('userHeader'),
  timerDisplay: $('timerDisplay'),
  phaseLabel: $('phaseLabel'),
  statusText: $('statusText'),
  progressCircle: $('progressCircle'),
  roundDots: $('roundDots'),
  startBtn: $('startBtn'),
  skipBtn: $('skipBtn'),
  resetBtn: $('resetBtn'),
  focusInput: $('focusInput'),
  breakInput: $('breakInput'),
  roundsInput: $('roundsInput'),
  soundBtns: document.querySelectorAll('[data-sound]'),
  modalOverlay: $('phaseModal'),
  modalIcon: $('modalIcon'),
  modalTitle: $('modalTitle'),
  modalDesc: $('modalDesc'),
  modalContinueBtn: $('modalContinueBtn'),
  historyToggle: $('historyToggle'),
  historyList: $('historyList'),
  historyClear: $('historyClear'),
  historyModal: $('historyModal'),
  historyClose: $('historyClose'),
  sideLeft: $('sideLeft'),
  sideRight: $('sideRight')
};

// ====== 格式化 ======
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ====== 渲染 ======
function render(s) {
  dom.timerDisplay.textContent = fmtTime(s.secondsLeft);

  const pct = s.totalSeconds > 0
    ? (s.totalSeconds - s.secondsLeft) / s.totalSeconds
    : 0;
  dom.progressCircle.style.strokeDashoffset = C * (1 - pct);
  dom.progressCircle.classList.toggle('break', s.phase === 'break');

  dom.phaseLabel.textContent = s.phase === 'focus' ? '🎯 专注' : '☕ 休息';

  if (s.completed) {
    dom.statusText.textContent = '🎉 全部完成！恭喜 🎉';
  } else if (s.running) {
    dom.statusText.textContent = s.phase === 'focus'
      ? `第 ${s.currentRound} / ${s.totalRounds} 轮 · 专注中`
      : `第 ${s.currentRound} / ${s.totalRounds} 轮 · 休息中`;
  } else if (s.paused) {
    dom.statusText.textContent = '⏸ 已暂停';
  } else {
    dom.statusText.textContent = '准备就绪';
  }

  const isBreak = s.phase === 'break';
  if (s.completed) {
    dom.startBtn.textContent = '🔄 重新开始';
    dom.startBtn.className = 'btn btn-primary';
  } else if (s.running) {
    dom.startBtn.textContent = '⏸ 暂停';
    dom.startBtn.className = `btn btn-primary ${isBreak ? 'break' : ''}`;
  } else {
    dom.startBtn.textContent = '▶ 继续';
    dom.startBtn.className = `btn btn-primary ${isBreak ? 'break' : ''}`;
  }

  dom.skipBtn.style.display = s.completed ? 'none' : 'inline-flex';

  renderDots(s);
}

function renderDots(s) {
  dom.roundDots.innerHTML = '';
  for (let i = 1; i <= s.totalRounds; i++) {
    const dot = document.createElement('div');
    dot.className = 'round-dot';
    dot.textContent = i;
    if (i < s.currentRound) dot.classList.add('done');
    else if (i === s.currentRound) {
      dot.classList.add(s.phase === 'break' ? 'break-active' : 'active');
    }
    dom.roundDots.appendChild(dot);
  }
}

// ====== 专注记录渲染 ======
function formatLocalTime(isoStr) {
  if (!isoStr) return '';
  // SQLite datetime('now') 输出格式 "2026-05-10 12:34:56"（UTC）
  const d = new Date(isoStr.includes('T') ? isoStr : isoStr.replace(' ', 'T') + 'Z');
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function renderHistory() {
  const records = await getRecords();
  dom.historyToggle.textContent = `📋 专注记录 (${records.length})`;
  dom.historyList.innerHTML = '';
  if (records.length === 0) {
    dom.historyList.innerHTML = '<div class="history-empty">还没有专注记录</div>';
    return;
  }
  records.forEach(r => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span class="history-item-round">${r.round}</span>
      <span class="history-item-dur">${r.duration} 分钟</span>
      <span class="history-item-date">${formatLocalTime(r.date)}</span>
    `;
    dom.historyList.appendChild(item);
  });
}

// ====== 弹窗控制 ======
function showModal(info) {
  if (info.type === 'focus-end') {
    dom.modalIcon.textContent = '☕';
    dom.modalTitle.textContent = `第 ${info.round} 轮专注结束`;
    dom.modalDesc.textContent = '休息一下，为下一轮充电';
  } else if (info.type === 'break-end') {
    dom.modalIcon.textContent = '🎯';
    dom.modalTitle.textContent = `第 ${info.round} 轮休息结束`;
    dom.modalDesc.textContent = '准备开始下一轮专注';
  } else if (info.type === 'all-done') {
    dom.modalIcon.textContent = '🎉';
    dom.modalTitle.textContent = '全部完成！';
    dom.modalDesc.textContent = `恭喜完成全部 ${info.totalRounds} 轮！`;
  }
  dom.modalOverlay.classList.add('show');
}

function hideModal() {
  dom.modalOverlay.classList.remove('show');
}

// ====== Auth 流程 ======
function showApp() {
  dom.authContainer.style.display = 'none';
  dom.appContainer.style.display = '';
  dom.sideLeft.style.display = '';
  dom.sideRight.style.display = '';
  renderUserHeader(dom.userHeader, handleLogout);
  timer.reset();
  renderHistory();
}

function showAuth() {
  dom.appContainer.style.display = 'none';
  dom.authContainer.style.display = '';
  dom.sideLeft.style.display = 'none';
  dom.sideRight.style.display = 'none';
  renderAuth(dom.authContainer, showApp);
}

function handleLogout() {
  logout();
  showAuth();
  timer.pause();
}

// ====== 初始化 ======
const timer = createTimer({
  focusMin: 25,
  breakMin: 5,
  totalRounds: 4,
  onPhaseEnd: (info) => {
    if (info.type === 'focus-end' || info.type === 'all-done') {
      addRecord({ duration: timer.state.focusMin, round: info.round, totalRounds: info.totalRounds })
        .then(() => renderHistory())
        .catch(() => {});
    }
    showModal(info);
  }
});

timer.subscribe(render);

// ====== 事件绑定 ======
dom.startBtn.addEventListener('click', () => {
  if (timer.state.completed) {
    timer.reset();
    timer.start();
    return;
  }
  timer.toggle();
});

dom.skipBtn.addEventListener('click', () => timer.skip());
dom.resetBtn.addEventListener('click', () => timer.reset());

dom.modalContinueBtn.addEventListener('click', () => {
  hideModal();
  timer.continueToNext();
});
dom.modalOverlay.addEventListener('click', (e) => {
  if (e.target === dom.modalOverlay) hideModal();
});

dom.historyToggle.addEventListener('click', async () => {
  await renderHistory();
  dom.historyModal.classList.add('show');
});
dom.historyClose.addEventListener('click', () => {
  dom.historyModal.classList.remove('show');
});
dom.historyModal.addEventListener('click', (e) => {
  if (e.target === dom.historyModal) dom.historyModal.classList.remove('show');
});
dom.historyClear.addEventListener('click', async () => {
  if (confirm('确定清空所有专注记录？')) {
    await clearRecords();
    await renderHistory();
  }
});

document.querySelectorAll('.step-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.input);
    if (!input) return;
    const dir = parseInt(btn.dataset.dir);
    const step = 1;
    const min = parseFloat(input.min) || 1;
    const max = parseFloat(input.max) || 999;
    let val = (parseFloat(input.value) || 0) + dir * step;
    val = Math.max(min, Math.min(max, val));
    input.value = val;
    applySettings();
  });
});

function applySettings() {
  const focus = parseInt(dom.focusInput.value) || 25;
  const rest = parseInt(dom.breakInput.value) || 5;
  const rounds = parseInt(dom.roundsInput.value) || 4;
  timer.updateSettings(focus, rest, rounds);
}
[dom.focusInput, dom.breakInput, dom.roundsInput].forEach(input => {
  input.addEventListener('change', applySettings);
  input.addEventListener('blur', applySettings);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.blur();
      applySettings();
    }
  });
});

dom.soundBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.soundBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectSound(btn.dataset.sound);
    playAlarm();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const key = e.key;
  if (key === ' ') {
    e.preventDefault();
    dom.startBtn.click();
    return;
  }
  if (key === 's' || key === 'S') {
    timer.skip();
    return;
  }
  if (key === 'r' || key === 'R') {
    timer.reset();
    return;
  }
});

// ====== 启动 ======
async function boot() {
  const user = await verifyToken();
  if (user) {
    showApp();
  } else {
    showAuth();
  }
}

boot();
