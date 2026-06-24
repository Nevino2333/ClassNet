# ClassNet

ClassNet 是一个面向校园场景的内网 WebOS 平台，采用类 iOS 设计风格，为横屏平板设备优化。提供即时通讯、天气查询、AI 对话、社区论坛、资源仓库、音乐播放等功能，支持多班级跨网络消息联动。

## 功能特性

### 核心功能

- **桌面系统** — 类 iOS 桌面，支持应用图标排列、壁纸切换、锁屏、超能岛通知
- **即时通讯** — 公共聊天室、班级群聊、私聊，支持表情、消息回复、消息撤回、群公告
- **天气系统** — 实时天气查询、7日预报、空气质量、生活指数、天气动画
- **AI 对话** — 支持 OpenAI 兼容 API 和 DeepSeek，可联网搜索（Tavily）
- **社区论坛** — 发帖、评论、点赞、个人主页
- **资源仓库** — 文件浏览、搜索、PDF/视频预览、下载
- **音乐播放** — 在线播放、歌词同步、播放列表
- **笔记系统** — Markdown 笔记，支持代码高亮、数学公式、流程图
- **管理后台** — 用户管理、广播管理、班干管理、天气预警调度、操作日志

### 系统特性

- **跨班级联动** — 通过 WebSocket 中继实现不同班级公共聊天室消息实时同步
- **等级经验系统** — 登录签到、发帖、互动获取经验，连续登录奖励加成
- **免打扰模式** — 支持按群聊/用户设置免打扰
- **深色/浅色主题** — 跟随系统或手动切换
- **响应式布局** — 适配横屏平板（960x600）及桌面浏览器

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 2.7 + Vue Router 3 + Vuex 3 |
| 构建 | Vite 5 |
| 后端 | Express 4 + better-sqlite3 |
| 实时通信 | ws (WebSocket) |
| 认证 | JWT (jsonwebtoken) |
| 包管理 | pnpm (monorepo) |

## 快速开始

### 前置要求

- Node.js 18+
- pnpm 8+
- ffmpeg（视频转码功能需要，可选）

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd ClassNet

# 安装依赖
pnpm install

# 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env，必须设置 JWT_SECRET（否则服务无法启动）

# 准备资源目录（可选，用于壁纸/音乐/视频等静态资源）
mkdir -p Resources/public/wallpapers Resources/public/music Resources/videos

# 初次使用可通过初始化向导配置班级和预注册名单
# 启动后访问 /setup 进入配置页面

# 启动开发服务器（前端 :5001 + 后端 :9001）
pnpm dev
```

访问 http://localhost:5001（开发模式，Vite 自动代理 API 到 :9001）

### 生产构建

```bash
pnpm build       # 构建前端到 client/dist/
# 构建脚本会自动将 dist/ 复制到 server/public/
# 启动生产服务器
cd server && NODE_ENV=production node src/app.js
```

访问 http://localhost:9001

### 首次配置

项目提供可视化初始化向导：启动服务器后访问 `/setup`，按提示设置：
1. 届数（毕业年份后两位）
2. 班级（编号和名称）
3. 预注册名单（导入或手动添加学生姓名）
4. 班管（每班指定一名班级管理员）
5. 确认保存，自动写入配置文件并初始化数据库

> 详细部署说明请参阅 [DEPLOY.md](./DEPLOY.md)

## 项目结构

```
ClassNet/
├── server/                     # 后端服务
│   ├── src/
│   │   ├── app.js              # Express 入口
│   │   ├── ws/chat-server.js   # WebSocket 聊天服务
│   │   ├── routes/             # REST API 路由
│   │   │   ├── auth.js         # 认证（注册/登录）
│   │   │   ├── chat.js         # 聊天相关 API
│   │   │   ├── community.js    # 社区 API
│   │   │   ├── admin.js        # 管理后台 API
│   │   │   ├── weather.js      # 天气 API
│   │   │   └── ai.js           # AI 对话 API
│   │   ├── services/           # 业务服务
│   │   │   ├── weather.js      # 和风天气服务
│   │   │   └── ai.js           # AI 对话服务
│   │   ├── utils/              # 工具函数
│   │   │   ├── init-db.js      # 数据库初始化
│   │   │   ├── exp.js          # 经验系统
│   │   │   └── constants.js    # 常量定义
│   │   ├── config/index.js     # 配置模块
│   │   └── middleware/auth.js  # JWT 认证中间件
│   ├── config/
│   │   └── pre-records.example.json  # 预注册名单模板
│   ├── .env.example            # 环境变量模板
│   └── package.json
├── client/                     # 前端项目
│   ├── src/
│   │   ├── views/              # 页面组件
│   │   │   ├── Desktop.vue     # 桌面主页
│   │   │   ├── Chat.vue        # 聊天
│   │   │   ├── Weather.vue     # 天气
│   │   │   ├── AIChat.vue      # AI 对话
│   │   │   ├── Community.vue   # 社区
│   │   │   ├── Music.vue       # 音乐
│   │   │   ├── Notes.vue       # 笔记
│   │   │   ├── Resource.vue    # 资源仓库
│   │   │   ├── Settings.vue    # 设置
│   │   │   ├── Admin.vue       # 管理后台
│   │   │   ├── Browser.vue     # 资源浏览器
│   │   │   ├── Login.vue       # 登录
│   │   │   └── Register.vue    # 注册
│   │   ├── components/         # 通用组件
│   │   │   ├── SuperIsland.vue # 超能岛通知
│   │   │   ├── AppNavBar.vue   # 导航栏
│   │   │   ├── LockScreen.vue  # 锁屏
│   │   │   ├── ChatBubble.vue  # 聊天气泡
│   │   │   ├── UserAvatar.vue  # 用户头像
│   │   │   └── EmojiPicker.vue # 表情选择器
│   │   ├── store/              # Vuex 状态管理
│   │   ├── router/             # 路由配置
│   │   ├── utils/              # 工具函数
│   │   └── styles/             # 全局样式
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── Resources/                  # 资源文件（需自行准备）
│   └── public/
│       ├── level/              # 等级图标
│       ├── wallpaper/          # 壁纸
│       ├── weather-icons/      # 天气图标
│       ├── pdfjs/              # PDF 预览器
│       └── music/              # 音乐文件
├── pnpm-workspace.yaml
├── package.json
├── DEPLOY.md                   # 详细部署文档
└── .gitignore
```

## 环境变量

核心环境变量（完整列表见 [DEPLOY.md](./DEPLOY.md)）：

| 变量 | 说明 | 必填 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥（32位以上随机字符串） | **是** |
| `ADMIN_USER_IDS` | 管理员用户ID，逗号分隔 | 否 |
| `ADMIN_PASSWORD` | 管理员初始密码 | 否 |
| `QWEATHER_KEY` | 和风天气 API Key | 否 |
| `AI_API_KEY` | AI 服务 API Key | 否 |

## 可选服务集成

| 服务 | 用途 | 环境变量 |
|------|------|---------|
| [和风天气](https://dev.qweather.com/) | 天气数据 | `QWEATHER_KEY`, `QWEATHER_LOCATION` |
| OpenAI 兼容 API | AI 对话 | `AI_API_KEY`, `AI_API_URL` |
| [DeepSeek](https://platform.deepseek.com/) | AI 对话 | `DEEPSEEK_API_KEY` |
| [Tavily](https://tavily.com/) | AI 联网搜索 | `TAVILY_API_KEY` |
| [Tailscale](https://tailscale.com/) | 跨网络中继组网 | `TAILSCALE_ENABLED`, `TAILSCALE_RELAY_IP` |
| [Syncthing](https://syncthing.net/) | 资源文件同步 | `SYNCTHING_API_KEY` |

## 开发

```bash
# 启动开发服务器（前后端同时启动）
pnpm dev

# 仅启动后端
pnpm dev:server

# 仅启动前端
pnpm dev:client

# 构建前端
pnpm build
```

### 代码规范

- JavaScript（非 TypeScript），兼容 ES2017
- Vue 2 Options API
- 禁止使用外部 CDN，所有资源需本地化或通过服务器中转
- 目标设备为横屏平板，需考虑触控交互和屏幕空间利用

## License

MIT
