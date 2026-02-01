# Claude 笔记系统 📝

一个智能的笔记管理系统，用于记录与 Claude 对话中的重点内容。

## ✨ 功能特性

- 📌 快速记录问题和答案
- 🏷️ 标签分类管理
- 🔍 搜索和过滤笔记
- 💾 自动保存到 Markdown 文件
- 🌐 可在多设备间同步（通过云盘）

## 🚀 快速开始

### 1. 安装依赖

```bash
cd claude-notes
npm install
```

### 2. 启动应用

**需要开启两个终端窗口：**

#### 终端 1 - 启动后端服务器：
```bash
npm start
```

#### 终端 2 - 启动前端界面：
```bash
npm run dev
```

然后在浏览器中打开 `http://localhost:3000`

### 3. 使用方法

1. 在对话结束后，输入"记"命令
2. 在网页中填写问题、答案和标签
3. 点击保存
4. 笔记会自动追加到 `notes/notes.md` 文件

## 📁 文件结构

```
claude-notes/
├── server.js          # Node.js 后端服务器
├── App.jsx            # React 应用入口
├── NotesApp.jsx       # 笔记管理界面
├── notes/             # 笔记存储目录
│   └── notes.md       # Markdown 笔记文件
└── package.json       # 项目配置
```

## 💡 提示

- 笔记文件保存在 `notes/notes.md`
- 可以将 `notes` 文件夹放到云盘同步
- 可以用任何 Markdown 编辑器打开查看

## 🛠 技术栈

- **后端**: Node.js + Express
- **前端**: React 18 + Material-UI
- **构建工具**: Vite
