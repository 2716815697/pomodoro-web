const TOKEN_KEY = 'pomodoro_token';
const USER_KEY = 'pomodoro_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

export function getUsername() {
  return localStorage.getItem(USER_KEY);
}

export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, data.user.username);
  return data.user;
}

export async function register(username, password) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, data.user.username);
  return data.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function verifyToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      logout();
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export function renderAuth(container, onLogin) {
  let mode = 'login';

  function renderForm() {
    const isLogin = mode === 'login';
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-accent-bar"></div>
        <div class="auth-brand">
          <div class="auth-logo">
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2.5" opacity="0.3"/>
              <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2.5"
                stroke-dasharray="138" stroke-dashoffset="34.5"
                stroke-linecap="round" transform="rotate(-90 24 24)"/>
              <path d="M24 14v10l7 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2>番茄钟</h2>
          <p class="auth-subtitle">专注当下，持之以恒</p>
        </div>
        <div class="auth-tabs" role="tablist">
          <button class="auth-tab ${isLogin ? 'active' : ''}" data-mode="login" role="tab">登录</button>
          <button class="auth-tab ${!isLogin ? 'active' : ''}" data-mode="register" role="tab">注册</button>
        </div>
        <form class="auth-form" id="authForm" novalidate>
          <div class="form-group">
            <label for="authUsername">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/></svg>
              用户名
            </label>
            <input type="text" id="authUsername" placeholder="3-20个字符" autocomplete="username" spellcheck="false" required>
          </div>
          <div class="form-group">
            <label for="authPassword">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              密码
            </label>
            <input type="password" id="authPassword" placeholder="至少4个字符" autocomplete="current-password" required>
          </div>
          <div class="auth-error" id="authError"></div>
          <button type="submit" class="btn btn-primary auth-submit">
            <span class="auth-submit-text">${isLogin ? '登 录' : '注 册'}</span>
            <span class="auth-submit-spinner"></span>
          </button>
        </form>
      </div>
    `;

    const tabs = container.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.classList.contains('active')) return;
        mode = tab.dataset.mode;
        renderForm();
      });
    });

    container.querySelector('#authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = container.querySelector('#authUsername').value.trim();
      const password = container.querySelector('#authPassword').value;
      const errorEl = container.querySelector('#authError');
      const submitBtn = container.querySelector('.auth-submit');
      const submitText = container.querySelector('.auth-submit-text');

      if (!username || !password) {
        errorEl.textContent = '请填写用户名和密码';
        errorEl.style.opacity = '1';
        return;
      }

      submitBtn.classList.add('loading');
      submitText.textContent = '处理中…';
      errorEl.textContent = '';
      errorEl.style.opacity = '0';

      try {
        if (mode === 'login') {
          await login(username, password);
        } else {
          await register(username, password);
        }
        onLogin();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.opacity = '1';
        submitBtn.classList.remove('loading');
        submitText.textContent = mode === 'login' ? '登 录' : '注 册';
      }
    });

    // 初始聚焦
    setTimeout(() => container.querySelector('#authUsername')?.focus(), 300);
  }

  renderForm();
}

export function renderUserHeader(container, onLogout) {
  const username = getUsername();
  container.innerHTML = `
    <div class="user-header">
      <div class="user-info">
        <span class="user-avatar">${username.charAt(0).toUpperCase()}</span>
        <span class="user-name">${username}</span>
      </div>
      <button class="logout-btn" id="logoutBtn" title="退出登录">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        退出
      </button>
    </div>
  `;
  container.querySelector('#logoutBtn').addEventListener('click', onLogout);
}
