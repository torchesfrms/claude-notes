require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

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

      if (line.startsWith('## 📝')) {
        question = line.replace('## 📝', '').trim();
      }

      if (line.startsWith('**时间**:')) {
        timestamp = line.replace('**时间**:', '').trim();
      }

      if (line.startsWith('**标签**:')) {
        const tagStr = line.replace('**标签**:', '').trim();
        tags = tagStr.match(/`([^`]+)`/g)?.map(t => t.replace(/`/g, '')) || [];
      }

      if (line.startsWith('### 💡 回答')) {
        answer = lines.slice(i + 1).join('\n').trim();
        break;
      }
    }

    if (question && answer) {
      notes.push({ question, answer, tags, timestamp });
    }
  });

  return notes.reverse();
}

async function migrateNotes() {
  try {
    console.log('🚀 开始迁移笔记到数据库...\n');

    // 初始化数据库表
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
    console.log('✅ 数据库表已创建');

    // 读取 notes.md 文件
    const NOTES_FILE = path.join(__dirname, 'notes', 'notes.md');

    if (!fs.existsSync(NOTES_FILE)) {
      console.log('⚠️  notes.md 文件不存在，跳过迁移');
      process.exit(0);
    }

    const content = fs.readFileSync(NOTES_FILE, 'utf-8');
    const notes = parseNotes(content);

    console.log(`📝 从 notes.md 读取到 ${notes.length} 条笔记\n`);

    // 逐条插入数据库
    let successCount = 0;
    let errorCount = 0;

    for (const note of notes) {
      try {
        await pool.query(
          'INSERT INTO notes (question, answer, tags, timestamp) VALUES ($1, $2, $3, $4)',
          [note.question, note.answer, note.tags, note.timestamp]
        );
        successCount++;
        console.log(`✅ [${successCount}/${notes.length}] ${note.question.substring(0, 30)}...`);
      } catch (error) {
        errorCount++;
        console.log(`❌ 导入失败: ${note.question.substring(0, 30)}... - ${error.message}`);
      }
    }

    console.log(`\n📊 迁移完成！`);
    console.log(`   成功: ${successCount} 条`);
    console.log(`   失败: ${errorCount} 条`);
    console.log(`\n🎉 所有笔记已迁移到云数据库！`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrateNotes();
