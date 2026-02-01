# 部署到 Railway（免费方案）

## 🚀 一键部署教程

### 准备工作（5分钟）

1. **注册 GitHub 账号**（如果还没有）
   - 访问：https://github.com/
   - 点击 "Sign up" 注册

2. **创建 GitHub 仓库**
   - 登录 GitHub
   - 点击右上角 "+" → "New repository"
   - 仓库名：`claude-notes`
   - 选择 "Public"（公开）或 "Private"（私有）
   - 点击 "Create repository"

---

## 📦 步骤 1：上传代码到 GitHub

在终端执行以下命令：

```bash
# 进入项目目录
cd /Users/moer/claude-notes

# 初始化 Git
git init

# 添加所有文件
git add .

# 创建首次提交
git commit -m "Initial commit - Claude Notes App"

# 连接到您的 GitHub 仓库
# ⚠️ 替换下面的 "您的GitHub用户名" 为您的真实用户名
git remote add origin https://github.com/您的GitHub用户名/claude-notes.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

如果提示需要登录，按照 GitHub 的指引操作即可。

---

## 🌐 步骤 2：部署到 Railway

### 2.1 注册 Railway
1. 访问：https://railway.app/
2. 点击 "Start a New Project"
3. 选择 "Login with GitHub" 用 GitHub 账号登录

### 2.2 创建项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 授权 Railway 访问您的 GitHub
4. 选择 `claude-notes` 仓库
5. Railway 会自动检测并开始部署

### 2.3 等待部署完成
- Railway 会自动：
  - 安装依赖（`npm install`）
  - 构建前端（`npm run build`）
  - 启动服务器（`npm run start:production`）
- 大约需要 2-3 分钟

### 2.4 获取网站地址
1. 部署成功后，点击项目
2. 在 "Settings" 标签页
3. 找到 "Domains" 部分
4. 点击 "Generate Domain"
5. 您会得到一个网址，类似：
   ```
   https://claude-notes-production.up.railway.app
   ```

🎉 **完成！现在任何人都可以通过这个网址访问您的笔记系统！**

---

## 💡 免费额度说明

Railway 免费计划：
- ✅ 每月 $5 免费额度（约 500 小时运行时间）
- ✅ 自动 HTTPS
- ✅ 永久域名
- ✅ 自动部署（推送代码自动更新）

对于个人使用完全足够！

---

## ⚠️ 重要：数据持久化问题

**问题：** Railway 每次部署会重置文件系统，导致笔记丢失！

**解决方案（3选1）：**

### 方案 A：使用 Railway Volume（推荐）
```bash
# 在 Railway 项目设置中添加 Volume
# Path: /app/notes
# 这样笔记文件会永久保存
```

### 方案 B：使用 GitHub 自动备份
每次添加笔记时自动提交到 GitHub 仓库

### 方案 C：导出备份
定期使用导出功能下载 JSON/Markdown 备份

**我推荐方案 A**，需要我帮您配置吗？

---

## 🔧 后续更新代码

当您修改代码后，只需：

```bash
cd /Users/moer/claude-notes
git add .
git commit -m "更新说明"
git push
```

Railway 会自动检测并重新部署！

---

## 🎯 其他免费部署平台

### Vercel（适合静态网站）
- 网址：https://vercel.com/
- 优点：速度快，国内访问好
- 缺点：需要改造成 Serverless 架构

### Render（类似 Railway）
- 网址：https://render.com/
- 免费额度：750 小时/月
- 部署方式相同

---

## 需要帮助？

如果您遇到任何问题，告诉我具体的错误信息，我会帮您解决！

准备好开始了吗？先执行步骤 1 的 Git 命令吧！
