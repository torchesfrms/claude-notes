require('dotenv').config();  // 加载 .env
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { detectPort } = require('detect-port');

const app = express();
const DEFAULT_PORT = 3001;
const PREFERRED_PORT = process.env.PORT || DEFAULT_PORT;
const NOTES_DIR = path.join(__dirname, 'notes');
const NOTES_FILE = path.join(NOTES_DIR, 'notes.md');
const BACKUPS_DIR = path.join(NOTES_DIR, 'backups');
const MAX_BACKUPS = 10; // 保留最近 10 个备份

// 内存缓存最近的时间戳，避免重复
let lastTimestamp = '';

// 中间件
app.use(cors());
app.use(express.json());

// 确保 notes 目录存在
if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
}

// 确保备份目录存在
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// 确保 notes.md 文件存在
if (!fs.existsSync(NOTES_FILE)) {
  fs.writeFileSync(NOTES_FILE, '# Claude 对话笔记\n\n---\n\n', 'utf-8');
}

// 备份函数
function backupNotesFile() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUPS_DIR, `notes_${timestamp}.md`);

    // 复制当前文件到备份目录
    fs.copyFileSync(NOTES_FILE, backupFile);

    // 清理旧备份，只保留最近 MAX_BACKUPS 个
    const backupFiles = fs.readdirSync(BACKUPS_DIR)
      .filter(file => file.startsWith('notes_') && file.endsWith('.md'))
      .map(file => ({
        name: file,
        path: path.join(BACKUPS_DIR, file),
        time: fs.statSync(path.join(BACKUPS_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // 按时间降序排列

    // 删除超出数量的备份
    if (backupFiles.length > MAX_BACKUPS) {
      backupFiles.slice(MAX_BACKUPS).forEach(file => {
        fs.unlinkSync(file.path);
      });
    }

    return backupFile;
  } catch (error) {
    console.error('备份失败:', error);
    return null;
  }
}

// 获取所有笔记
app.get('/api/notes', (req, res) => {
  try {
    const content = fs.readFileSync(NOTES_FILE, 'utf-8');
    const notes = parseNotes(content);
    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加新笔记
app.post('/api/notes', (req, res) => {
  try {
    const { question, answer, tags } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, error: '问题和答案不能为空' });
    }

    // 生成唯一时间戳（使用内存缓存优化性能）
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

    // 如果和上次时间戳相同，添加毫秒后缀
    let finalTimestamp = timestamp;
    if (timestamp === lastTimestamp) {
      finalTimestamp = `${timestamp}.${Date.now()}`;
    }
    lastTimestamp = timestamp;

    // 构建 Markdown 格式的笔记
    let noteContent = `\n## 📝 ${question}\n\n`;
    noteContent += `**时间**: ${finalTimestamp}\n\n`;

    if (tags && tags.length > 0) {
      noteContent += `**标签**: ${tags.map(tag => `\`${tag}\``).join(' ')}\n\n`;
    }

    noteContent += `### 💡 回答\n\n${answer}\n\n`;
    noteContent += `---\n\n`;

    // 追加到文件
    fs.appendFileSync(NOTES_FILE, noteContent, 'utf-8');

    res.json({
      success: true,
      message: '笔记已保存',
      note: { question, answer, tags, timestamp: finalTimestamp }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量导入笔记
app.post('/api/notes/import', (req, res) => {
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

    notes.forEach((note, index) => {
      // 验证必填字段
      if (!note.question || !note.answer) {
        errors.push(`第 ${index + 1} 条笔记缺少问题或答案`);
        return;
      }

      // 生成唯一时间戳
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

      // 检查时间戳冲突（与内存缓存比较）
      let finalTimestamp = timestamp;
      if (timestamp === lastTimestamp) {
        finalTimestamp = `${timestamp}.${Date.now()}`;
      }
      lastTimestamp = timestamp;

      // 构建笔记内容
      let noteContent = `\n## 📝 ${note.question.trim()}\n\n`;
      noteContent += `**时间**: ${finalTimestamp}\n\n`;

      if (note.tags && note.tags.length > 0) {
        noteContent += `**标签**: ${note.tags.map(tag => `\`${tag}\``).join(' ')}\n\n`;
      }

      noteContent += `### 💡 回答\n\n${note.answer.trim()}\n\n`;
      noteContent += `---\n\n`;

      // 追加到文件
      fs.appendFileSync(NOTES_FILE, noteContent, 'utf-8');

      importedNotes.push({
        question: note.question,
        answer: note.answer,
        tags: note.tags || [],
        timestamp: finalTimestamp
      });
    });

    res.json({
      success: true,
      message: `成功导入 ${importedNotes.length} 条笔记`,
      imported: importedNotes,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除笔记
app.delete('/api/notes/:timestamp', (req, res) => {
  try {
    // 先备份
    const backupFile = backupNotesFile();

    const { timestamp } = req.params;
    const decodedTimestamp = decodeURIComponent(timestamp);

    // 读取现有内容
    const content = fs.readFileSync(NOTES_FILE, 'utf-8');
    const notes = parseNotes(content);

    // 查找要删除的笔记
    const noteIndex = notes.findIndex(note => note.timestamp === decodedTimestamp);

    if (noteIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在'
      });
    }

    // 过滤掉要删除的笔记
    const remainingNotes = notes.filter(note => note.timestamp !== decodedTimestamp);

    // 重建 Markdown 文件
    let newContent = '# Claude 对话笔记\n\n---\n\n';

    // 倒序遍历（因为 parseNotes 返回的是 reverse 后的数组）
    remainingNotes.reverse().forEach(note => {
      newContent += `## 📝 ${note.question}\n\n`;
      newContent += `**时间**: ${note.timestamp}\n\n`;

      if (note.tags && note.tags.length > 0) {
        newContent += `**标签**: ${note.tags.map(tag => `\`${tag}\``).join(' ')}\n\n`;
      }

      newContent += `### 💡 回答\n\n${note.answer}\n\n`;
      newContent += `---\n\n`;
    });

    // 写回文件
    fs.writeFileSync(NOTES_FILE, newContent, 'utf-8');

    res.json({
      success: true,
      message: '笔记已删除',
      deletedTimestamp: decodedTimestamp
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取笔记关联建议
app.get('/api/notes/:timestamp/related', (req, res) => {
  try {
    const { timestamp } = req.params;
    const decodedTimestamp = decodeURIComponent(timestamp);

    const content = fs.readFileSync(NOTES_FILE, 'utf-8');
    const notes = parseNotes(content);

    // 找到当前笔记
    const currentNote = notes.find(note => note.timestamp === decodedTimestamp);
    if (!currentNote) {
      return res.status(404).json({ success: false, error: '笔记不存在' });
    }

    // 计算相关笔记（基于标签相似度）
    const relatedNotes = notes
      .filter(note => note.timestamp !== decodedTimestamp)
      .map(note => {
        // 计算标签重叠度
        const commonTags = note.tags.filter(tag => currentNote.tags.includes(tag));
        const tagSimilarity = currentNote.tags.length > 0
          ? commonTags.length / currentNote.tags.length
          : 0;

        // 计算时间接近度（同一天的笔记）
        const currentDate = currentNote.timestamp.split(' ')[0];
        const noteDate = note.timestamp.split(' ')[0];
        const timeSimilarity = currentDate === noteDate ? 0.3 : 0;

        // 综合相似度
        const similarity = tagSimilarity * 0.7 + timeSimilarity;

        return {
          ...note,
          similarity,
          commonTags
        };
      })
      .filter(note => note.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // 只返回前5个最相关的

    res.json({
      success: true,
      related: relatedNotes
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取 Markdown 文件内容
app.get('/api/notes/raw', (req, res) => {
  try {
    const content = fs.readFileSync(NOTES_FILE, 'utf-8');
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 编辑笔记
app.put('/api/notes/:timestamp', (req, res) => {
  try {
    // 先备份
    const backupFile = backupNotesFile();

    const { timestamp } = req.params;
    const decodedTimestamp = decodeURIComponent(timestamp);
    const { question, answer, tags } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, error: '问题和答案不能为空' });
    }

    // 读取现有内容
    const content = fs.readFileSync(NOTES_FILE, 'utf-8');
    const notes = parseNotes(content);

    // 查找要编辑的笔记
    const noteIndex = notes.findIndex(note => note.timestamp === decodedTimestamp);

    if (noteIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在'
      });
    }

    // 更新笔记内容
    notes[noteIndex] = {
      ...notes[noteIndex],
      question: question.trim(),
      answer: answer.trim(),
      tags: tags || []
    };

    // 重建 Markdown 文件
    let newContent = '# Claude 对话笔记\n\n---\n\n';

    // 倒序遍历（因为 parseNotes 返回的是 reverse 后的数组）
    notes.reverse().forEach(note => {
      newContent += `## 📝 ${note.question}\n\n`;
      newContent += `**时间**: ${note.timestamp}\n\n`;

      if (note.tags && note.tags.length > 0) {
        newContent += `**标签**: ${note.tags.map(tag => `\`${tag}\``).join(' ')}\n\n`;
      }

      newContent += `### 💡 回答\n\n${note.answer}\n\n`;
      newContent += `---\n\n`;
    });

    // 写回文件
    fs.writeFileSync(NOTES_FILE, newContent, 'utf-8');

    res.json({
      success: true,
      message: '笔记已更新',
      note: notes.reverse()[noteIndex]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 解析 Markdown 笔记
function parseNotes(content) {
  const notes = [];
  const sections = content.split('---').filter(s => s.trim());

  sections.forEach(section => {
    const lines = section.trim().split('\n');
    let question = '';
    let answer = '';
    let tags = [];
    let timestamp = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 提取问题
      if (line.startsWith('## 📝')) {
        question = line.replace('## 📝', '').trim();
      }

      // 提取时间
      if (line.startsWith('**时间**:')) {
        timestamp = line.replace('**时间**:', '').trim();
      }

      // 提取标签
      if (line.startsWith('**标签**:')) {
        const tagStr = line.replace('**标签**:', '').trim();
        tags = tagStr.match(/`([^`]+)`/g)?.map(t => t.replace(/`/g, '')) || [];
      }

      // 提取答案
      if (line.startsWith('### 💡 回答')) {
        // 收集后续所有行作为答案
        answer = lines.slice(i + 1).join('\n').trim();
        break;
      }
    }

    if (question && answer) {
      notes.push({ question, answer, tags, timestamp });
    }
  });

  return notes.reverse(); // 最新的在前面
}

// 启动服务器 - 支持自动端口检测
detectPort(PREFERRED_PORT).then(availablePort => {
  if (availablePort !== PREFERRED_PORT) {
    console.log(`⚠️  端口 ${PREFERRED_PORT} 被占用，自动切换到 ${availablePort}`);
  }

  app.listen(availablePort, () => {
    console.log(`✅ 服务器已启动: http://localhost:${availablePort}`);
    console.log(`📁 笔记保存位置: ${NOTES_FILE}`);

    // 输出环境变量给前端使用
    if (process.env.WRITE_PORT_TO_FILE) {
      fs.writeFileSync('.backend-port', availablePort.toString());
    }
  });
}).catch(err => {
  console.error('❌ 端口检测失败:', err);
  process.exit(1);
});
