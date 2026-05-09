/** 专注记录 - localStorage 持久化 */

const STORAGE_KEY = 'pomodoro_history';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getRecords() {
  return load();
}

export function addRecord({ duration, round, totalRounds }) {
  const records = load();
  records.unshift({
    id: Date.now(),
    date: new Date().toLocaleString('zh-CN'),
    duration,
    round,
    totalRounds
  });
  save(records);
  return records;
}

export function clearRecords() {
  localStorage.removeItem(STORAGE_KEY);
}
