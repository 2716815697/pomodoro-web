# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

番茄钟（Pomodoro Timer）纯前端网页应用，零依赖，ES Module 原生加载，无构建步骤。

## 启动方式

需要启动 Express 服务器（同时托管前端静态文件 + API 后端）：

```bash
cd pomodoro-web
npm install     # 首次需要
npm start       # 启动后访问 http://localhost:3000
npm run dev     # 开发模式，文件修改自动重启
```

## 项目结构

```
pomodoro-web/
├── server.js          # Express 入口（API + 静态文件）
├── package.json       # 依赖
├── .gitignore
├── index.html         # 入口 HTML（含 auth + timer 切换结构）
├── db/
│   ├── schema.sql     # SQLite 建表
│   ├── database.js    # SQLite 连接 + 查询辅助
│   └── pomodoro.db    # 数据库文件（自动生成，已 gitignore）
├── middleware/
│   └── auth.js        # JWT 验证中间件
├── routes/
│   ├── auth.js        # POST /api/auth/register, login, me
│   └── records.js     # GET/POST/DELETE /api/records
├── css/
│   └── style.css      # 全部样式（含 auth 表单样式）
└── js/
    ├── app.js         # UI 绑定 + auth 启动流程
    ├── timer.js       # 计时器状态机
    ├── audio.js       # 通知音（Web Audio API）
    ├── history.js     # 专注记录（async API + localStorage 离线兜底）
    └── auth.js        # 登录/注册/Token 管理 + 渲染 auth UI
```

## 架构要点

### 模块依赖图

```
index.html (type="module" script)
  └── app.js
        ├── timer.js ──→ audio.js
        ├── audio.js
        ├── history.js（async API → Express 后端 → SQLite）
        └── auth.js  （async API → Express 后端 → SQLite + JWT）
```

### 后端架构

```
Express server (port 3000)
  ├── 静态文件服务（/index.html, /js/*, /css/*）
  ├── POST /api/auth/register  →  bcrypt 哈希 → SQLite users 表 → 返回 JWT
  ├── POST /api/auth/login     →  bcrypt 验证 → SQLite users 表 → 返回 JWT
  ├── GET  /api/auth/me        →  JWT 验证 → 返回用户信息
  ├── GET  /api/records        →  JWT 验证 → SQLite records 表 → 返回记录列表
  ├── POST /api/records        →  JWT 验证 → SQLite records 表 → 写入记录
  └── DELETE /api/records      →  JWT 验证 → SQLite records 表 → 清空记录
```

### 状态机（timer.js）
- `createTimer(options)` 工厂函数，内部闭包维护可变状态，对外暴露只读快照（`get state()` 返回浅拷贝）
- 阶段流转：`focus` → `break` → 下一轮 `focus` → ... → `completed`
- 关键方法：`start()` / `pause()` / `toggle()` / `skip()` / `continueToNext()` / `reset()` / `updateSettings()` / `destroy()`
- **重要生命周期**：每个阶段结束时（倒计时归零或手动 skip），自动暂停、触发 `onPhaseEnd(info)` 回调、播放提示音，**不会自动进入下一阶段**
- 弹窗点击"继续"后调用 `continueToNext()` → 内部 `doTransition()` 切换阶段 → 自动 `start()`
- `subscribe(fn)` 订阅者模式，返回 unsubscribe 函数。UI 通过此接口接收状态更新

### UI 层（app.js）
- DOM 引用集中管理在 `dom` 对象中，使用 `$(id)` 简写
- `render(s)` 函数从状态快照渲染全部 UI（幂等），通过 `timer.subscribe(render)` 驱动
- 弹窗通过 CSS class `show` 控制显示/隐藏，支持点击遮罩层关闭
- 键盘快捷键：Space（暂停/继续）、S（跳过）、R（重置），INPUT 聚焦时忽略
- 设置变更监听：`change` + `blur` + `Enter` 三种方式触发

### 音频（audio.js）
- Web Audio API 纯代码合成，无外部音频文件
- `AudioContext` 延迟初始化（首次调用 `getCtx()` 时创建）
- 三种音色：`bell`（双铃铛）、`digital`（电子）、`gentle`（琶音上升）

### 历史记录（history.js）
- 默认通过 fetch API 向 `/api/records` 读写，数据持久化到 SQLite
- **localStorage 离线兜底**：服务器不可用时，记录自动保存到本地，不丢失
- 每次专注阶段完成自动记录（含最后一轮 `all-done`），fire-and-forget 不阻塞计时器
- 记录字段：`{ id, date, duration, round, totalRounds }`

### 认证（auth.js）
- JWT 7 天有效期，存储在 localStorage（key: `pomodoro_token`）
- 启动时 `verifyToken()` 验证 token 有效性，无效则显示登录页
- 注册/登录成功后自动存储 token 并进入 app
- 退出登录清除 token 并回到登录页

### 样式（style.css）
- CSS 自定义属性（`:root`）定义深色主题色板，无框架依赖
- 响应式断点：<768px（移动端）、≥768px（平板桌面，启用毛玻璃和装饰元素）、≥1200px（大屏）

## 无构建步骤

```bash
# 直接浏览器打开即可，无需 npm install / build
# 使用 ES Module 原生 import/export

# 可用 Live Server 开发
code pomodoro-web/  # 然后用 Live Server 打开 index.html

# Git 操作
git status
git add <file>
git commit -m "message"
git push
```
