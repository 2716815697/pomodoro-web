# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

番茄钟（Pomodoro Timer）全栈网页应用。前端零框架纯 ESM，后端 Express + SQLite + JWT 登录。

## 启动方式

```bash
cd pomodoro-web
npm install       # 首次需要
npm start         # http://localhost:3000
npm run dev       # 开发模式，node --watch 自动重启
```

也支持 Cursor/VSCode F5 启动（`.vscode/launch.json` + `.vscode/tasks.json`）或双击 `start.bat`。

## 目录结构

```
pomodoro-web/
├── server.js             # Express 入口，静态文件 + API 路由
├── package.json
├── .gitignore
├── index.html            # auth + timer 切换，左右侧边面板
├── db/
│   ├── schema.sql        # SQLite 建表（users + records）
│   └── database.js       # sql.js 封装（get/all/run 辅助函数，自动 save）
├── middleware/auth.js     # JWT 验证中间件
├── routes/auth.js        # POST register/login + GET me
├── routes/records.js     # GET/POST/DELETE /api/records
├── css/style.css         # 深色主题 + 毛玻璃 + 响应式（三个断点）
└── js/
    ├── app.js            # 启动流程 + UI 绑定 + 键盘快捷键
    ├── timer.js          # 状态机（createTimer 工厂）
    ├── audio.js          # Web Audio API 合成音效
    ├── history.js        # fetch API + localStorage 离线兜底
    └── auth.js           # 登录/注册 UI + Token 管理
```

## API 一览

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | /api/auth/register | 否 | 注册，返回 JWT（7天） |
| POST | /api/auth/login | 否 | 登录，返回 JWT |
| GET | /api/auth/me | Bearer | 验证 token |
| GET | /api/records | Bearer | 获取当前用户记录 |
| POST | /api/records | Bearer | 添加记录 {duration, round, totalRounds} |
| DELETE | /api/records | Bearer | 清空当前用户记录 |

## 核心逻辑

### timer.js 状态机
- `createTimer(options)` 工厂，内部闭包维护状态，`get state()` 返回浅拷贝
- 阶段流转：`focus` → `break` → 下一轮 `focus` → ... → `completed`
- 关键方法：start/pause/toggle/skip/continueToNext/reset/updateSettings/destroy
- 每个阶段结束自动 pause，触发 `onPhaseEnd(info)` 回调 + 提示音，**不自动进入下一阶段**
- 弹窗点"继续" → `continueToNext()` → `doTransition()` 切换阶段 → 自动 start
- `subscribe(fn)` 发布订阅模式，返回 unsubscribe 函数

### app.js UI 层
- DOM 引用集中在 `dom` 对象，`$(id)` 简写
- `render(s)` 幂等渲染，通过 `timer.subscribe(render)` 驱动
- 侧边面板 `dom.sideLeft`（记录按钮）、`dom.sideRight`（键盘指引）在登录后显示，登录页隐藏
- `renderHistory()` 是 async 函数，通过 `normalize()` 统一 API 和 localStorage 的数据格式
- `formatLocalTime(isoStr)` 将 SQLite UTC 时间转成本地时间（zh-CN 格式）
- 键盘快捷键：Space（切换开始/暂停）、S（跳过当前阶段）、R（重置），INPUT 聚焦时忽略
- `boot()` → `verifyToken()` → 有效则 `showApp()`（显示侧边栏），无效则 `showAuth()`（隐藏侧边栏）

### auth.js 认证流程
- JWT 存 localStorage（key: `pomodoro_token`），7 天过期
- `verifyToken()` 调 GET /api/auth/me 验证，失效自动清 token 回到登录页
- `renderAuth(container, onLogin)` 渲染登录/注册表单（tab 切换，带渐变条 + 动效 + 加载 spinner）
- `renderUserHeader(container, onLogout)` 渲染用户头像首字母 + 退出按钮

### history.js 历史记录
- 优先 fetch API → SQLite，服务器不可用时自动回退到 localStorage
- `addRecord()` fire-and-forget（`.then(renderHistory)`），不阻塞计时器 onPhaseEnd 回调
- 回退时数据存本地 key `pomodoro_history`
- `normalize()` 统一字段名（`created_at`→`date`，`total_rounds`→`totalRounds`）

## 数据库（sql.js）

- 纯 JS SQLite 实现，WASM 运行，无原生编译依赖
- 文件存储在 `db/pomodoro.db`（已 gitignore）
- `run()` 辅助函数每次写入后自动调 `save()` 持久化到文件
- SQLite 的 `datetime('now')` 返回 UTC 时间，前端用 `formatLocalTime()` 转成本地显示

## 布局与响应式

- 桌面端（≥768px）：三栏 flex 布局（侧边栏 + 卡片 + 侧边栏），毛玻璃卡片居中
- 移动端（≤767px）：单栏，侧边栏隐藏
- 大屏（≥1200px）：卡片和内元素进一步放大
- 侧边栏用 `order` 属性控制顺序（left=0, card=1, right=2）
- 卡片 `overflow: hidden`，body `overflow: hidden` + `height: 100vh` 防止页面滚动

## Git 注意事项

- 远程仓库：`origin → https://github.com/2716815697/pomodoro-web.git`
- Git 代理已配置：`http://127.0.0.1:7890`（走 VPN）
- `.gitignore` 已忽略 `node_modules/` 和 `db/pomodoro.db`
