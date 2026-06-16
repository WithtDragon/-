# 🏔️ AI 数字导游 - 智慧景区导览系统

基于 AI 大模型的数字人景区导览网站。可爱的虚拟导游 + 实时 AI 对话 + **管理后台**。

## ✨ 功能特色

- 🤖 **AI 数字人**：可爱的虚拟导游"小游"，有面部表情和说话动画
- 🗣️ **语音播报**：浏览器 Web Speech API，数字人会"开口说话"
- 💬 **实时对话**：接入大模型 AI，游客可自由提问景区相关问题
- 🏔️ **多景区支持**：内置5个景区，后台可随时增删改
- 🛠️ **管理后台**：在线编辑景区数据、AI提示词、敏感词，无需改代码
- 🎨 **双主题**：暗色/亮色切换，本地记忆
- 📱 **响应式**：电脑、平板、手机全适配
- 💰 **极低成本**：DeepSeek API ≈ ¥1/百万token

## 🏗️ 架构

```
┌─────────────────────────────────────────────┐
│            Express 服务器 (单进程)             │
│                                              │
│  公开站 /         →  游客使用（只能看）         │
│  管理后台 /admin  →  管理员使用（能改数据）      │
│                                              │
│  SQLite 数据库    →  景区、配置、敏感词、用户    │
│  DeepSeek API    →  AI 对话                   │
└─────────────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 环境要求
- **Node.js** >= 18
- AI API Key：[DeepSeek](https://platform.deepseek.com) 注册即送额度

### 2. 安装 & 配置

```bash
cd server
npm install

# 配置 API Key
copy .env.example .env
# 编辑 .env，填入 AI_API_KEY=sk-xxx
```

### 3. 初始化数据库

```bash
node db/seed.js
# 创建默认管理员: admin / admin123
```

### 4. 启动

```bash
npm start
```

| 地址 | 说明 |
|------|------|
| `http://localhost:3000` | 公开站（游客使用） |
| `http://localhost:3000/admin` | 管理后台（管理员登录） |

### 5. 管理后台功能

| 模块 | 功能 |
|------|------|
| 🏔️ 景区管理 | 增删改查景区（名称/介绍/标签/排序） |
| 💬 快捷问题 | 管理公开站快捷提问按钮 |
| ⚙️ AI配置 | 编辑系统提示词、回复风格、敏感词过滤 |
| 🔒 修改密码 | 修改管理员登录密码 |

所有修改**实时生效**，无需重启服务。

## 📂 项目结构

```
├── index.html              # 公开站主页
├── css/style.css           # 公开站样式
├── js/                     # 公开站脚本
│   ├── main.js             #   主控制器（从API加载数据）
│   ├── chat.js             #   AI对话管理器
│   ├── avatar.js           #   数字人动画
│   └── speech.js           #   语音合成
├── admin/                  # 管理后台（独立站点）
│   ├── index.html          #   登录页
│   ├── dashboard.html      #   管理面板
│   ├── css/admin.css
│   └── js/
│       ├── api.js          #   统一API封装（JWT）
│       ├── auth.js         #   登录
│       ├── dashboard.js    #   面板路由
│       ├── scenes.js       #   景区CRUD
│       ├── questions.js    #   快捷问题CRUD
│       └── config.js       #   AI配置+敏感词+密码
├── server/
│   ├── index.js            #   服务入口（路由编排）
│   ├── db/
│   │   ├── database.js     #   SQLite连接
│   │   ├── schema.sql      #   建表语句
│   │   ├── seed.js         #   数据迁移脚本
│   │   └── guide.db        #   数据库文件
│   ├── middleware/
│   │   └── auth.js         #   JWT认证中间件
│   └── routes/
│       ├── public.js       #   公开API（景区/问题/配置）
│       ├── chat.js         #   AI对话API（+敏感词过滤）
│       └── admin.js        #   管理API（全部需JWT）
└── README.md
```

## 📡 API 接口

### 公开接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/scenes` | 景区列表 |
| GET | `/api/scenes/:id` | 景区详情 |
| GET | `/api/questions` | 快捷问题 |
| POST | `/api/chat` | AI对话 |

### 管理接口（需登录）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 登录获取Token |
| CRUD | `/api/admin/scenes` | 景区管理 |
| CRUD | `/api/admin/questions` | 问题管理 |
| GET/PUT | `/api/admin/config` | 配置读写 |
| CRUD | `/api/admin/sensitive-words` | 敏感词管理 |
| PUT | `/api/admin/password` | 修改密码 |

## 💰 成本

| 服务 | 说明 | 费用 |
|------|------|------|
| DeepSeek API | 输入¥1/百万token，输出¥2/百万token | < ¥5/月 |
| SQLite | 文件数据库 | 免费 |
| 部署 | 可部署到 Railway/Render 免费额度 | 免费 |

## 🔧 扩展方向

- ✨ 真人数字人视频替代CSS动画
- 🎤 Web Speech API 语音输入
- 🗺️ 景区地图集成（高德/百度）
- 📸 景区图片轮播
- 📊 访问统计面板
- 🌍 多语言支持

## ⚠️ 注意事项

- `.env` 和 `*.db` 已加入 `.gitignore`，不会被提交
- 首次使用请修改默认管理员密码
- AI API Key 只在服务端，不会暴露给前端
