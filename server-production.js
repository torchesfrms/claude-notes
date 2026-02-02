require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// 环境配置
const isProduction = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wlcxx';

// 简单的 token 存储（生产环境建议使用 JWT）
const validTokens = new Set();

// 中间件
app.use(cors());
app.use(express.json());

// 权限验证中间件（仅生产环境启用）
function requireAuth(req, res, next) {
  if (!isProduction) {
    // 本地开发环境跳过验证
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || !validTokens.has(token)) {
    return res.status(401).json({
      success: false,
      error: '需要管理员权限'
    });
  }

  next();
}

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')));

// 内存缓存最近的时间戳
let lastTimestamp = '';

// 登录接口
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    // 生成简单的 token（生产环境建议使用 JWT）
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    validTokens.add(token);

    res.json({
      success: true,
      token,
      message: '登录成功'
    });
  } else {
    res.status(401).json({
      success: false,
      error: '密码错误'
    });
  }
});

// 获取环境信息（前端判断是否需要登录）
app.get('/api/env', (req, res) => {
  res.json({
    isProduction,
    requireAuth: isProduction
  });
});

// 初始化数据库表
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        tags TEXT[] DEFAULT '{}',
        timestamp VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notes_timestamp ON notes(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
    `);
    console.log('✅ 数据库表已就绪');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
}

// 获取所有笔记
app.get('/api/notes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notes ORDER BY created_at DESC'
    );

    const notes = result.rows.map(row => ({
      question: row.question,
      answer: row.answer,
      tags: row.tags || [],
      timestamp: row.timestamp
    }));

    res.json({ success: true, notes });
  } catch (error) {
    console.error('获取笔记失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加新笔记（需要权限）
app.post('/api/notes', requireAuth, async (req, res) => {
  try {
    const { question, answer, tags } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, error: '问题和答案不能为空' });
    }

    const now = new Date();
    let timestamp = now.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let finalTimestamp = timestamp;
    if (timestamp === lastTimestamp) {
      finalTimestamp = `${timestamp}.${Date.now()}`;
    }
    lastTimestamp = timestamp;

    const result = await pool.query(
      'INSERT INTO notes (question, answer, tags, timestamp) VALUES ($1, $2, $3, $4) RETURNING *',
      [question.trim(), answer.trim(), tags || [], finalTimestamp]
    );

    res.json({
      success: true,
      message: '笔记已保存',
      note: {
        question: result.rows[0].question,
        answer: result.rows[0].answer,
        tags: result.rows[0].tags,
        timestamp: result.rows[0].timestamp
      }
    });
  } catch (error) {
    console.error('添加笔记失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量导入笔记
// 批量导入笔记（需要权限）
app.post('/api/notes/import', requireAuth, async (req, res) => {
  try {
    const { notes } = req.body;

    if (!Array.isArray(notes) || notes.length === 0) {
      return res.status(400).json({
        success: false,
        error: '笔记数据格式错误或为空'
      });
    }

    const importedNotes = [];
    const errors = [];

    for (let index = 0; index < notes.length; index++) {
      const note = notes[index];

      if (!note.question || !note.answer) {
        errors.push(`第 ${index + 1} 条笔记缺少问题或答案`);
        continue;
      }

      const now = new Date();
      let timestamp = note.timestamp || now.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      let finalTimestamp = timestamp;
      if (timestamp === lastTimestamp) {
        finalTimestamp = `${timestamp}.${Date.now()}`;
      }
      lastTimestamp = timestamp;

      try {
        const result = await pool.query(
          'INSERT INTO notes (question, answer, tags, timestamp) VALUES ($1, $2, $3, $4) RETURNING *',
          [note.question.trim(), note.answer.trim(), note.tags || [], finalTimestamp]
        );

        importedNotes.push({
          question: result.rows[0].question,
          answer: result.rows[0].answer,
          tags: result.rows[0].tags,
          timestamp: result.rows[0].timestamp
        });
      } catch (err) {
        errors.push(`第 ${index + 1} 条笔记导入失败: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `成功导入 ${importedNotes.length} 条笔记`,
      imported: importedNotes,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('批量导入失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除笔记
// 删除笔记（需要权限）
app.delete('/api/notes/:timestamp', requireAuth, async (req, res) => {
  try {
    const { timestamp } = req.params;
    const decodedTimestamp = decodeURIComponent(timestamp);

    const result = await pool.query(
      'DELETE FROM notes WHERE timestamp = $1 RETURNING *',
      [decodedTimestamp]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在'
      });
    }

    res.json({
      success: true,
      message: '笔记已删除',
      deletedTimestamp: decodedTimestamp
    });
  } catch (error) {
    console.error('删除笔记失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 编辑笔记
// 编辑笔记（需要权限）
app.put('/api/notes/:timestamp', requireAuth, async (req, res) => {
  try {
    const { timestamp } = req.params;
    const decodedTimestamp = decodeURIComponent(timestamp);
    const { question, answer, tags } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, error: '问题和答案不能为空' });
    }

    const result = await pool.query(
      'UPDATE notes SET question = $1, answer = $2, tags = $3, updated_at = CURRENT_TIMESTAMP WHERE timestamp = $4 RETURNING *',
      [question.trim(), answer.trim(), tags || [], decodedTimestamp]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在'
      });
    }

    res.json({
      success: true,
      message: '笔记已更新',
      note: {
        question: result.rows[0].question,
        answer: result.rows[0].answer,
        tags: result.rows[0].tags,
        timestamp: result.rows[0].timestamp
      }
    });
  } catch (error) {
    console.error('更新笔记失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取相关笔记
app.get('/api/notes/:timestamp/related', async (req, res) => {
  try {
    const { timestamp } = req.params;
    const decodedTimestamp = decodeURIComponent(timestamp);

    const currentResult = await pool.query(
      'SELECT * FROM notes WHERE timestamp = $1',
      [decodedTimestamp]
    );

    if (currentResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: '笔记不存在' });
    }

    const currentNote = currentResult.rows[0];
    const currentTags = currentNote.tags || [];

    if (currentTags.length === 0) {
      return res.json({ success: true, related: [] });
    }

    const relatedResult = await pool.query(
      `SELECT *,
        (SELECT COUNT(*) FROM unnest(tags) tag WHERE tag = ANY($1)) as common_tag_count
      FROM notes
      WHERE timestamp != $2 AND tags && $1
      ORDER BY common_tag_count DESC, created_at DESC
      LIMIT 5`,
      [currentTags, decodedTimestamp]
    );

    const related = relatedResult.rows.map(row => ({
      question: row.question,
      answer: row.answer,
      tags: row.tags,
      timestamp: row.timestamp,
      similarity: row.common_tag_count / currentTags.length,
      commonTags: row.tags.filter(tag => currentTags.includes(tag))
    }));

    res.json({ success: true, related });
  } catch (error) {
    console.error('获取相关笔记失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 所有其他路由返回前端应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
async function startServer() {
  await initDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 服务器已启动: http://0.0.0.0:${PORT}`);
    console.log(`📊 数据库: PostgreSQL (云端)`);
  });
}

startServer().catch(err => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
