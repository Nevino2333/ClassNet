# ClassNet 项目 AI 协作规则

> **语言要求**: 始终使用 zh-CN 回复。代码注释使用中文。

---

## ⚠️ 黄金法则：先备份，再动手

```
每次开始修改代码前，必须执行：
  git save

这条命令会创建一个带时间戳的备份点，出问题可以回滚。
这是不可协商的——任何代码修改前都必须执行。
```

---

## 目录结构

```
ClassNet/
├── client/src/           # Vue 2 前端源码
│   ├── views/            # 页面组件（AIChat, Notes, Chat, Community...）
│   ├── components/       # 可复用组件（ios/, island/, Weather*...）
│   ├── utils/            # 工具函数（latex-renderer, api, helpers...）
│   ├── store/            # Vuex 状态管理
│   ├── router/           # Vue Router
│   ├── styles/           # 全局样式（global.scss）
│   ├── mixins/           # Vue mixins
│   └── main.js           # 入口
├── server/src/           # Node.js 后端源码
│   ├── routes/           # API 路由（auth, chat, community, admin, setup… 共 15 个）
│   ├── middleware/        # 中间件（限流、认证）
│   ├── ws/               # WebSocket 聊天 + 中继
│   ├── services/         # 业务服务（视频转码、中继总线）
│   ├── utils/            # 工具（db, init-db, jwt, cache, crash-logger…）
│   └── config/           # 配置模块
├── server/public/        # 构建产物（前端 dist + setup.html）
├── server/database/      # SQLite 数据库文件目录
├── Resources/            # 🔒 用户自行管理，AI 不得触碰
└── .git/                 # Git 仓库（含 hooks 和修复脚本）
```

---

## 🚫 禁区（AI 绝对不能做的事）

### 1. Resources/ 目录
```
Resources/ 目录由用户手动管理，内容经常变动。
AI 不得读取、修改、删除 Resources/ 下的任何文件。
AI 不得将 Resources/ 下的文件加入 Git 暂存区。
```

### 2. 破坏性操作
```
以下操作必须获得用户明确确认后才能执行：
  - rm -rf（任何递归删除）
  - git reset --hard / git clean -fd（丢弃工作区修改）
  - 修改 .git/hooks/ 下的 hook 脚本
  - 修改 package.json 中的依赖版本
  - 修改 server/config/ 下的配置文件
  - 任何涉及数据库结构变更的操作
```

### 3. 全局依赖
```
不要运行以下命令：
  - npm install -g（全局安装）
  - pnpm add -g
  - 修改 pnpm-workspace.yaml
```

---

## 📋 每次修改代码的标准流程

### 开始工作
```bash
# 1. 创建备份点（必须！）
git save

# 2. 检查当前状态
git status
git log | head -5
```

### 修改代码时
```bash
# 频繁提交，每次小改动就提交
git add -A
git commit -m "描述做了什么"
```

### 完成工作后
```bash
# 1. 运行构建验证
cd client && npx vite build

# 2. 检查是否有 b→o 损坏（pre-commit hook 也会自动检查）
git health

# 3. 最终提交
git save
```

---

## 🔧 b→o 字符损坏

### 原因
用户偶尔运行脚本，将项目中所有 `b` 字符替换为 `o`。
常见损坏模式：
```
behavior → oehavior    scrollbar → scrolloar
clipboard → clipooard  fallback → falloack
Object → Ooject        body → oody (CSS: markdown-oody)
bind → oind            abort → aoort
Abort → Aoort          before → oefore
Mobile → Mooile        Sidebar → Sideoar
bg → og (CSS 变量: --bg-color → --og-color)
base → oase (CSS: --font-size-base → --font-size-oase)
```

### 修复方法
```bash
# 自动修复全部 b→o 损坏
git fix-b2o

# 手动检查
git health
```

### AI 应该做的
- 修改代码后，用 `git health` 检查
- 如果发现 b→o 损坏，用 `git fix-b2o` 修复
- 修复后单独提交：`git add -A && git commit -m "fix: 修复 b→o 字符损坏"`
- 不要手动逐个修复——用脚本一次性处理

---

## 🎨 代码风格约定

### JavaScript/Vue
```
- 使用 var（不是 let/const），与现有代码保持一致
- 字符串用单引号 '...'
- 缩进 2 空格
- Vue 组件使用 Options API（不是 Composition API）
- 模块级函数放在 export default 之前
- 导入使用 import X from 'path' 语法
```

### CSS/SCSS
```
- 全局样式放在 client/src/styles/global.scss
- 组件级样式使用 <style scoped>
- CSS 变量在 :root 中定义
- 使用 var(--xxx) 引用变量
```

### 命名规范
```
- 文件名: kebab-case（latex-renderer.js）
- Vue 组件: PascalCase（AIChat.vue）
- 函数: camelCase（extractLatex）
- CSS 类: kebab-case（.latex-document）
- JS 变量: camelCase
```

---

## 📦 关键工具文件

| 文件 | 用途 |
|------|------|
| `client/src/utils/latex-renderer.js` | LaTeX 渲染核心（完整文档 + 数学公式 + 声明式命令 + 分组作用域） |
| `client/src/views/AIChat.vue` | AI 聊天页面（LaTeX 渲染的主要使用方） |
| `client/src/views/Notes.vue` | 笔记（Markdown + LaTeX + Mermaid） |
| `client/src/views/Community.vue` | 社区论坛（Markdown + LaTeX 渲染） |
| `client/src/utils/api.js` | API 请求封装 |
| `server/src/utils/db.js` | SQLite 数据库连接（WAL 模式、连接池） |
| `server/src/utils/init-db.js` | 数据库初始化 + 迁移 + 预注册导入 |
| `server/src/services/stream-transcoder.js` | 视频流式转码（ffmpeg） |
| `server/src/routes/setup.js` | 初始化向导 API |
| `server/public/setup.html` | 可视化初始化配置页面 |
| `.git/fix-b2o-corruption.sh` | b→o 损坏自动修复脚本 |
| `.git/hooks/pre-commit` | 提交前代码检查 |

---

## 🧪 LaTeX 渲染

### 支持的内容形式
1. ` ```latex ... ``` ` — Markdown 代码块中的 LaTeX（AI 回复常见）
2. `\documentclass{...}...\begin{document}...` — 完整 LaTeX 文档
3. `{\color{red}\textbf{...}}` — LaTeX 正文片段（自动检测，支持 {…} 分组作用域）
4. `\begin{latex}...\end{latex}` — 显式标记

### 数学公式
使用 KaTeX 渲染，支持 `$...$`、`$$...$$`、`\(...\)`、`\[...\]`。
KaTeX 不支持的命令会回退为错误提示。

### 支持的命令类型
- **参数式**: `\textbf{text}`, `\textit{text}`, `\textcolor{color}{text}`, `\colorbox{bg}{text}`, `\fcolorbox{frame}{bg}{text}`, `\framebox{text}`, `\parbox{width}{text}`
- **声明式**: `\color{name}`, `\pagecolor{name}`, `\sffamily`, `\rmfamily`, `\ttfamily`, `\bfseries`, `\itshape`, `\slshape`, `\scshape`（作用域受 {…} 分组控制）
- **字体大小**: `\Huge`, `\huge`, `\LARGE`, `\Large`, `\large`, `\small`, `\footnotesize`, `\tiny`, `\normalsize`
- **环境**: `\begin{center}...\end{center}`, `\begin{itemize}...\end{itemize}` 等

### 添加新 LaTeX 命令时
在 `latex-renderer.js` 中修改：
- `ARG_COMMANDS` — 单参数命令（\textbf{text} 类）
- `SIZE_CLASS_MAP` — 字体大小命令
- `SYMBOL_MAP` — 符号命令
- `FONT_FAMILY_DECL` / `FONT_STYLE_DECL` — 声明式字体命令
- `LATEX_BODY_COMMANDS` — 用于自动检测的命令列表
- `beginEnvironment()` / `endEnvironment()` — 环境处理
- `convertLatexBodyToHtml()` — 正文到 HTML 的主转换器

---

## ⚡ 构建和运行

```bash
# 前端开发
cd client && npx vite build    # 构建
cd client && npx vite dev      # 开发服务器

# 后端
cd server && node src/app.js # 启动服务器
```

---

## 📝 提交信息格式

```
<类型>: <简短描述>

类型：
  feat     - 新功能
  fix      - 修复 bug
  refactor - 重构（不改变功能）
  style    - 样式修改
  docs     - 文档更新
  chore    - 杂项（依赖、配置等）
  savepoint - 备份点

示例：
  feat: 添加 \colorbox 和 \fcolorbox LaTeX 支持
  fix: 修复 b→o 字符损坏（scrollbar, behavior 等）
  refactor: 提取 LaTeX 渲染到共享模块
  savepoint: 2026-06-23 工作前备份
```

---

## 🔄 回滚操作

```bash
# 查看提交历史
git log

# 撤销最近一次 commit（保留文件修改）
git undo

# 硬回滚（完全丢弃最近一次 commit）
git hard-undo

# 回滚到指定 commit
git reset --hard <commit-hash>

# 查看某个 commit 的内容
git show <commit-hash>

# 恢复单个文件到某个 commit 的版本
git checkout <commit-hash> -- path/to/file
```
