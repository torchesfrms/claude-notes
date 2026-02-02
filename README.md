# 📝 Claude 笔记系统

<div align="center">

一个智能的笔记管理系统，用于记录与 Claude 对话中的重点内容

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/claude-notes)

[在线演示](https://claude-notes-production-c9cb.up.railway.app) | [功能特性](#-功能特性) | [快速部署](#-一键部署) | [本地开发](#-本地开发)

</div>

---

## ✨ 功能特性

### 🔐 权限控制
- **访客模式**：任何人可以查看、搜索、导出笔记（只读）
- **管理员模式**：密码登录后可以添加、编辑、删除笔记

### 📝 核心功能
- ✅ 快速记录问题和答案
- 🏷️ 标签分类管理
- 🔍 强大的搜索和过滤
- 🔗 知识图谱（相关笔记推荐）
- 📦 批量操作（批量删除、导出）
- 📥 导入导出（支持 Markdown 和 JSON）

### 💾 数据管理
- ☁️ PostgreSQL 云端数据库
- 📄 本地 Markdown 文件自动同步
- 💾 双重备份保障

### 🎨 界面体验
- 🌓 深色/浅色模式切换
- 📱 响应式设计，支持移动端
- ⚡ Material-UI 精美界面
- 🚀 快速加载

---

## 🚀 一键部署

### 方式 1：使用 Railway（推荐）⭐

**免费部署，5 分钟完成！**

#### 步骤 1：Fork 仓库
1. 点击右上角 **Fork** 按钮
2. Fork 到您的 GitHub 账号

#### 步骤 2：部署到 Railway
1. 访问 [Railway](https://railway.app)
2. 点击 **New Project** → **Deploy from GitHub**
3. 选择 fork 的 `claude-notes` 仓库
4. Railway 会自动检测并开始部署

#### 步骤 3：添加数据库
1. 在 Railway 项目中点击 **New** → **Database** → **PostgreSQL**
2. 数据库会自动关联，无需手动配置

#### 步骤 4：设置环境变量
在 Railway 项目的 **Variables** 标签中添加：

```env
NODE_ENV=production
ADMIN_PASSWORD=your_password_here
```

> ⚠️ **重要**：请将 `your_password_here` 替换为您自己的密码

#### 步骤 5：完成！
等待 2-3 分钟部署完成，访问 Railway 提供的域名即可使用！

---

### 方式 2：使用 Vercel + Supabase

<details>
<summary>点击展开详细步骤</summary>

#### 1. 部署到 Vercel
```bash
npm install -g vercel
vercel deploy
```

#### 2. 设置 Supabase 数据库
1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 复制数据库连接 URL

#### 3. 配置环境变量
```env
NODE_ENV=production
ADMIN_PASSWORD=your_password
DATABASE_URL=your_supabase_url
```

</details>

---

## 🖥️ 本地开发

### 前置要求
- Node.js 16+
- PostgreSQL（或使用云端数据库）

### 快速开始

#### 1. 克隆仓库
```bash
git clone https://github.com/torchesfrms/claude-notes.git
cd claude-notes
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 配置环境变量
复制 `.env.example` 为 `.env`：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
NODE_ENV=development
PORT=3001
ADMIN_PASSWORD=your_password
DATABASE_URL=postgresql://user:password@host:port/database
```

#### 4. 一键启动
```bash
./start.sh
```

或者手动启动：
```bash
# 启动后端
npm start

# 启动前端（新终端）
npm run dev
```

#### 5. 访问应用
打开浏览器访问 `http://localhost:3000`

---

## 📖 使用指南

### 访客模式（默认）
1. 访问应用后，默认进入**访客模式**
2. 可以查看、搜索、导出所有笔记
3. 无法添加、编辑、删除笔记

### 管理员模式
1. 点击右上角 **管理员模式** 按钮
2. 输入设置的密码
3. 登录成功后即可：
   - ✅ 添加新笔记
   - ✅ 编辑现有笔记
   - ✅ 删除笔记
   - ✅ 批量操作
   - ✅ 导入笔记

### 常用操作

#### 添加笔记
1. 在左侧表单填写**问题**、**答案**
2. 按 `Enter` 添加标签
3. 点击**保存笔记**按钮

#### 搜索笔记
- 在搜索框输入关键词
- 支持搜索问题和答案内容
- 点击标签可筛选相关笔记

#### 批量操作
1. 点击**批量模式**按钮
2. 勾选需要操作的笔记
3. 选择批量删除或导出

#### 导入导出
- **导出**：点击下载图标，导出为 Markdown 或 JSON
- **导入**：点击上传图标，选择文件导入

---

## 📁 项目结构

```
claude-notes/
├── NotesApp.jsx           # 前端主应用（React + Material-UI）
├── server-db.js           # 本地开发服务器（带数据库）
├── server-production.js   # 生产环境服务器
├── db.js                  # PostgreSQL 连接配置
├── migrate.js             # 数据库迁移脚本
├── start.sh               # 一键启动脚本
├── notes/
│   ├── notes.md           # 本地 Markdown 备份
│   └── backups/           # 自动备份目录
├── .env                   # 环境变量配置（需创建）
├── .env.example           # 环境变量示例
└── package.json           # 项目配置
```

---

## 🔧 环境变量说明

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `NODE_ENV` | ✅ | `development` | 环境标识：`development` 或 `production` |
| `ADMIN_PASSWORD` | ✅ | - | 管理员密码 |
| `DATABASE_URL` | ✅ | - | PostgreSQL 连接字符串 |
| `PORT` | ❌ | `3001` | 服务器端口（Railway 会自动设置） |

---

## 🛠 技术栈

### 前端
- **React 18** - UI 框架
- **Material-UI** - 组件库
- **Vite** - 构建工具

### 后端
- **Node.js** - 运行环境
- **Express** - Web 框架
- **PostgreSQL** - 数据库

### 部署
- **Railway** - 云平台
- **GitHub** - 代码托管

---

## 🐛 常见问题

<details>
<summary><strong>Q: 忘记管理员密码怎么办？</strong></summary>

**方案 1：Railway 用户**
1. 进入 Railway 项目
2. Variables 标签
3. 修改 `ADMIN_PASSWORD`
4. 重新部署

**方案 2：本地开发**
1. 修改 `.env` 文件中的 `ADMIN_PASSWORD`
2. 重启服务器
</details>

<details>
<summary><strong>Q: 如何备份数据？</strong></summary>

**自动备份**：
- 所有笔记自动同步到 `notes/notes.md`
- PostgreSQL 数据库自动备份（Railway 提供）

**手动备份**：
- 在应用中点击导出按钮，下载 JSON 文件
- 复制 `notes/notes.md` 文件
</details>

<details>
<summary><strong>Q: 本地环境为什么没有登录选项？</strong></summary>

本地开发环境（`NODE_ENV=development`）默认跳过权限验证，方便开发调试。

如需测试权限功能，设置：
```env
NODE_ENV=production
```
</details>

<details>
<summary><strong>Q: 如何分享笔记给朋友？</strong></summary>

**只读分享**：
- 直接分享部署后的 URL
- 朋友访问后进入访客模式（只读）

**协作编辑**：
- 告诉朋友管理员密码
- 或帮朋友部署独立实例
</details>

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [Material-UI](https://mui.com/) - 精美的 React 组件库
- [Railway](https://railway.app/) - 优秀的云部署平台
- [PostgreSQL](https://www.postgresql.org/) - 强大的开源数据库

---

## 💬 联系方式

- **GitHub Issues**: [提交问题](https://github.com/torchesfrms/claude-notes/issues)
- **演示地址**: https://claude-notes-production-c9cb.up.railway.app

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给个 Star！**

Made with ❤️ by Moer

</div>
