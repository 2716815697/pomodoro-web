const STORAGE_KEY = 'pomodoro_history';
const TOKEN_KEY = 'pomodoro_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocal(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function normalize(record) {
  return {
    id: record.id,
    date: record.created_at || record.date,
    duration: record.duration,
    round: record.round,
    totalRounds: record.totalRounds ?? record.total_rounds
  };
}

async function apiGet(url) {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function apiPost(url, body) {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function apiDelete(url) {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getRecords() {
  const data = await apiGet('/api/records');
  if (data && data.records) {
    return data.records.map(normalize);
  }
  return loadLocal().reverse();
}

export async function addRecord({ duration, round, totalRounds }) {
  const data = await apiPost('/api/records', { duration, round, totalRounds });
  if (data && data.record) {
    const local = loadLocal();
    saveLocal(local);
    return normalize(data.record);
  }
  const records = loadLocal();
  records.unshift({ id: Date.now(), date: new Date().toLocaleString('zh-CN'), duration, round, totalRounds });
  saveLocal(records);
  return records[0];
}

export async function clearRecords() {
  const data = await apiDelete('/api/records');
  if (data && data.ok) return;
  localStorage.removeItem(STORAGE_KEY);
}
