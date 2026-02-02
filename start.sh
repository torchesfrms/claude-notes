#!/bin/bash

echo "🚀 启动 Claude 笔记系统..."
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在 claude-notes 目录中运行此脚本"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    echo ""
fi

# 加载 .env 文件（如果存在）
if [ -f .env ]; then
    echo "📄 检测到 .env 文件，使用自定义配置"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "📋 使用默认端口配置 (前端: 3000, 后端: 3001)"
fi

# 启动后端服务器
BACKEND_PORT=${PORT:-3001}
echo "✅ 启动后端服务器 (端口 ${BACKEND_PORT})..."
WRITE_PORT_TO_FILE=true node server-db.js &
SERVER_PID=$!

# 等待服务器启动并获取实际端口
sleep 2
if [ -f .backend-port ]; then
    ACTUAL_BACKEND_PORT=$(cat .backend-port)
    rm .backend-port
else
    ACTUAL_BACKEND_PORT=$BACKEND_PORT
fi

# 启动前端
FRONTEND_PORT=${VITE_PORT:-3000}
echo "✅ 启动前端界面 (端口 ${FRONTEND_PORT})..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Claude 笔记系统已启动！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 请在浏览器中查看实际运行的端口地址"
echo "🔧 后端实际端口: ${ACTUAL_BACKEND_PORT}"
echo "📊 数据库: PostgreSQL (云端)"
echo ""
echo "💡 提示: 如果端口被占用，会自动使用下一个可用端口"
echo "⏹  按 Ctrl+C 停止服务器"
echo ""

# 等待任意进程结束
wait
