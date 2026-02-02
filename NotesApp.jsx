import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Chip,
  Card,
  CardContent,
  Grid,
  IconButton,
  Snackbar,
  Alert,
  Divider,
  InputAdornment,
  Fade,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Collapse,
  CircularProgress,
  Menu,
  MenuItem,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add,
  Search,
  LocalOffer,
  AccessTime,
  QuestionAnswer,
  Lightbulb,
  BookmarkBorder,
  Delete,
  Edit,
  FileDownload,
  DarkMode,
  LightMode,
  CheckBox,
  CheckBoxOutlineBlank,
  SelectAll,
  Close,
  Link as LinkIcon,
  CloudUpload,
  AdminPanelSettings,
  VisibilityOutlined,
} from '@mui/icons-material';

const NotesApp = () => {
  // 认证状态
  const [authMode, setAuthMode] = useState('guest'); // 'guest' 或 'admin'
  const [isProduction, setIsProduction] = useState(false);
  const [loginDialog, setLoginDialog] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken'));

  // 深色模式状态（从 localStorage 读取）
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // 保存深色模式偏好
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // 创建主题
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#667eea',
          },
          secondary: {
            main: '#f50057',
          },
          background: {
            default: darkMode ? '#0a0a0a' : '#f5f7fa',
            paper: darkMode ? '#1a1a1a' : '#ffffff',
          },
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    [darkMode]
  );

  const [notes, setNotes] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    noteToDelete: null
  });
  const [editDialog, setEditDialog] = useState({
    open: false,
    noteToEdit: null
  });
  const [deletedNote, setDeletedNote] = useState(null); // 用于撤销删除
  const [deletingTimestamp, setDeletingTimestamp] = useState(null); // 删除中的笔记
  const [isSaving, setIsSaving] = useState(false); // 保存中状态
  const [selectedTag, setSelectedTag] = useState(null); // 选中的标签过滤

  // 批量操作相关状态
  const [batchMode, setBatchMode] = useState(false); // 批量模式开关
  const [selectedNotes, setSelectedNotes] = useState(new Set()); // 选中的笔记（使用时间戳）
  const [batchDialog, setBatchDialog] = useState({ open: false, action: null }); // 批量操作确认对话框

  // 知识图谱相关状态
  const [relatedDialog, setRelatedDialog] = useState({ open: false, note: null, related: [] });

  // 导入功能相关状态
  const [importDialog, setImportDialog] = useState({
    open: false,
    parsedNotes: [],
    loading: false
  });

  // 加载笔记
  useEffect(() => {
    fetchNotes();
  }, []);

  // 检查环境和认证状态
  useEffect(() => {
    fetch('/api/env')
      .then(res => res.json())
      .then(data => {
        setIsProduction(data.isProduction);
        if (data.requireAuth && authToken) {
          setAuthMode('admin');
        }
      })
      .catch(err => console.error('获取环境信息失败:', err));
  }, []);

  // ========== 认证处理函数 ==========
  const handleLogin = async () => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('authToken', data.token);
        setAuthToken(data.token);
        setAuthMode('admin');
        setLoginDialog(false);
        setLoginPassword('');
        setSnackbar({ open: true, message: '登录成功！欢迎管理员', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.error || '密码错误', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: '登录失败', severity: 'error' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setAuthMode('guest');
    setSnackbar({ open: true, message: '已退出管理员模式', severity: 'info' });
  };

  const handleSwitchToAdmin = () => {
    if (!isProduction) {
      setAuthMode('admin');
      setSnackbar({ open: true, message: '已切换到管理员模式', severity: 'success' });
    } else {
      if (authToken) {
        setAuthMode('admin');
      } else {
        setLoginDialog(true);
      }
    }
  };

  // 格式化相对时间
  const formatRelativeTime = (timestamp) => {
    // 如果时间戳包含毫秒，提取基础时间
    const baseTimestamp = timestamp.split('.')[0];

    try {
      // 解析中文时间格式 "2026/02/01 21:59:40"
      const parts = baseTimestamp.split(/[/ :]/);
      const noteDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        parseInt(parts[3] || 0),
        parseInt(parts[4] || 0),
        parseInt(parts[5] || 0)
      );

      const now = new Date();
      const diffMs = now - noteDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return `${diffDays}天前`;

      return baseTimestamp; // 超过7天显示原始时间
    } catch (e) {
      return timestamp; // 解析失败返回原始值
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      const data = await response.json();
      if (data.success) {
        setNotes(data.notes);
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
    }
  };

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // 删除标签
  const handleDeleteTag = (tagToDelete) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };

  // 保存笔记
  const handleSaveNote = async () => {
    if (!question.trim() || !answer.trim()) {
      setSnackbar({
        open: true,
        message: '问题和答案不能为空！',
        severity: 'error'
      });
      return;
    }

    setIsSaving(true); // 开始保存

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({
          question: question.trim(),
          answer: answer.trim(),
          tags: tags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSnackbar({
          open: true,
          message: '✅ 笔记已保存！',
          severity: 'success'
        });

        // 清空表单
        setQuestion('');
        setAnswer('');
        setTags([]);
        setTagInput('');

        // 刷新笔记列表
        fetchNotes();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: '❌ 保存失败: ' + error.message,
        severity: 'error'
      });
    } finally {
      setIsSaving(false); // 保存结束
    }
  };

  // 打开删除确认对话框
  const handleDeleteClick = (note) => {
    setDeleteDialog({
      open: true,
      noteToDelete: note
    });
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    const note = deleteDialog.noteToDelete;
    setDeletingTimestamp(note.timestamp); // 标记正在删除

    try {
      const encodedTimestamp = encodeURIComponent(note.timestamp);
      const response = await fetch(`/api/notes/${encodedTimestamp}`, {
        method: 'DELETE',
        headers: {
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      });

      const data = await response.json();

      if (data.success) {
        // 保存删除的笔记用于撤销
        setDeletedNote(note);

        // 显示成功消息（带撤销按钮）
        setSnackbar({
          open: true,
          message: '✅ 笔记已删除',
          severity: 'success',
          action: 'undo' // 特殊标记，显示撤销按钮
        });

        // 关闭对话框
        setDeleteDialog({ open: false, noteToDelete: null });

        // 刷新笔记列表
        fetchNotes();

        // 5 秒后清除删除记录
        setTimeout(() => {
          setDeletedNote(null);
        }, 5000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: '❌ 删除失败: ' + error.message,
        severity: 'error'
      });
    } finally {
      setDeletingTimestamp(null); // 清除删除状态
    }
  };

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, noteToDelete: null });
  };

  // 撤销删除
  const handleUndoDelete = async () => {
    if (!deletedNote) return;

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: deletedNote.question,
          answer: deletedNote.answer,
          tags: deletedNote.tags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSnackbar({
          open: true,
          message: '✅ 已恢复笔记！',
          severity: 'success'
        });

        // 清除删除记录
        setDeletedNote(null);

        // 刷新笔记列表
        fetchNotes();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: '❌ 恢复失败: ' + error.message,
        severity: 'error'
      });
    }
  };

  // 打开编辑对话框
  const handleEditClick = (note) => {
    setEditDialog({
      open: true,
      noteToEdit: { ...note }
    });
  };

  // 确认编辑
  const handleConfirmEdit = async () => {
    const note = editDialog.noteToEdit;

    if (!note.question.trim() || !note.answer.trim()) {
      setSnackbar({
        open: true,
        message: '问题和答案不能为空！',
        severity: 'error'
      });
      return;
    }

    try {
      const encodedTimestamp = encodeURIComponent(note.timestamp);
      const response = await fetch(`/api/notes/${encodedTimestamp}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({
          question: note.question.trim(),
          answer: note.answer.trim(),
          tags: note.tags || []
        })
      });

      const data = await response.json();

      if (data.success) {
        setSnackbar({
          open: true,
          message: '✅ 笔记已更新！',
          severity: 'success'
        });

        // 关闭对话框
        setEditDialog({ open: false, noteToEdit: null });

        // 刷新笔记列表
        fetchNotes();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: '❌ 更新失败: ' + error.message,
        severity: 'error'
      });
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditDialog({ open: false, noteToEdit: null });
  };

  // 编辑对话框中的标签操作
  const handleEditAddTag = () => {
    if (tagInput.trim() && !editDialog.noteToEdit.tags.includes(tagInput.trim())) {
      setEditDialog({
        ...editDialog,
        noteToEdit: {
          ...editDialog.noteToEdit,
          tags: [...editDialog.noteToEdit.tags, tagInput.trim()]
        }
      });
      setTagInput('');
    }
  };

  const handleEditDeleteTag = (tagToDelete) => {
    setEditDialog({
      ...editDialog,
      noteToEdit: {
        ...editDialog.noteToEdit,
        tags: editDialog.noteToEdit.tags.filter(tag => tag !== tagToDelete)
      }
    });
  };

  // 过滤笔记
  const filteredNotes = notes.filter(note => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      note.question.toLowerCase().includes(searchLower) ||
      note.answer.toLowerCase().includes(searchLower) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchLower));

    // 如果选中了标签，只显示包含该标签的笔记
    const matchesTag = !selectedTag || note.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  // 获取所有标签及其使用次数
  const allTags = notes.reduce((acc, note) => {
    note.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  // 按使用次数排序标签
  const sortedTags = Object.entries(allTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // 只显示前10个热门标签

  // 批量操作功能
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedNotes(new Set()); // 清空选择
  };

  const toggleNoteSelection = (timestamp) => {
    const newSelection = new Set(selectedNotes);
    if (newSelection.has(timestamp)) {
      newSelection.delete(timestamp);
    } else {
      newSelection.add(timestamp);
    }
    setSelectedNotes(newSelection);
  };

  const selectAll = () => {
    const allTimestamps = new Set(filteredNotes.map(note => note.timestamp));
    setSelectedNotes(allTimestamps);
  };

  const deselectAll = () => {
    setSelectedNotes(new Set());
  };

  const handleBatchDelete = () => {
    setBatchDialog({ open: true, action: 'delete' });
  };

  const handleBatchExport = () => {
    const selectedNotesData = notes.filter(note => selectedNotes.has(note.timestamp));
    const content = selectedNotesData.map(note => {
      let md = `## 📝 ${note.question}\n\n`;
      md += `**时间**: ${note.timestamp}\n\n`;
      if (note.tags.length > 0) {
        md += `**标签**: ${note.tags.map(t => `\`${t}\``).join(' ')}\n\n`;
      }
      md += `### 💡 回答\n\n${note.answer}\n\n---\n\n`;
      return md;
    }).join('');

    const blob = new Blob([`# Claude 对话笔记\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_batch_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: `✅ 已导出 ${selectedNotes.size} 条笔记！`,
      severity: 'success'
    });
  };

  const confirmBatchDelete = async () => {
    try {
      // 逐个删除选中的笔记
      for (const timestamp of selectedNotes) {
        const encodedTimestamp = encodeURIComponent(timestamp);
        await fetch(`/api/notes/${encodedTimestamp}`, {
          method: 'DELETE',
          headers: {
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
          }
        });
      }

      setSnackbar({
        open: true,
        message: `✅ 已删除 ${selectedNotes.size} 条笔记！`,
        severity: 'success'
      });

      setBatchDialog({ open: false, action: null });
      setSelectedNotes(new Set());
      setBatchMode(false);
      fetchNotes();
    } catch (error) {
      setSnackbar({
        open: true,
        message: '❌ 批量删除失败: ' + error.message,
        severity: 'error'
      });
    }
  };

  // 知识图谱功能
  const handleShowRelated = async (note) => {
    try {
      const encodedTimestamp = encodeURIComponent(note.timestamp);
      const response = await fetch(`/api/notes/${encodedTimestamp}/related`);
      const data = await response.json();

      if (data.success) {
        setRelatedDialog({
          open: true,
          note: note,
          related: data.related
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: '❌ 获取相关笔记失败: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleCloseRelated = () => {
    setRelatedDialog({ open: false, note: null, related: [] });
  };

  // 导入功能 - 解析 Markdown 文件
  const parseMDFile = (content) => {
    const notes = [];

    // 分割笔记（按 --- 分隔符）
    const sections = content.split('---').filter(s => s.trim());

    sections.forEach(section => {
      const lines = section.trim().split('\n');
      let question = '';
      let answer = '';
      let tags = [];
      let timestamp = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 提取问题（兼容多种格式）
        if (line.match(/^##?\s*📝?\s*/)) {
          question = line.replace(/^##?\s*📝?\s*/, '').trim();
        } else if (line.match(/^#\s+/)) {
          question = line.replace(/^#\s+/, '').trim();
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
        if (line.match(/^###?\s*💡?\s*回答/)) {
          answer = lines.slice(i + 1).join('\n').trim();
          break;
        }
      }

      // 如果没有明确的答案分隔符，取问题后的所有内容
      if (!answer && question) {
        const questionIndex = lines.findIndex(l => l.includes(question));
        const answerLines = lines.slice(questionIndex + 1);

        // 查找最后一行是否包含 #tag 格式的标签
        let lastLineIdx = answerLines.length;
        for (let i = answerLines.length - 1; i >= 0; i--) {
          const trimmed = answerLines[i].trim();
          // 如果这行以 # 开头并且包含多个标签，提取标签并移除这行
          if (trimmed && trimmed.startsWith('#') && trimmed.includes(' ')) {
            const hashTags = trimmed.match(/#[^\s#]+/g);
            if (hashTags) {
              tags = [...tags, ...hashTags.map(t => t.replace('#', ''))];
            }
            lastLineIdx = i;
          } else if (trimmed && !trimmed.startsWith('#')) {
            // 遇到非空且不是标签行，停止
            break;
          }
        }

        answer = answerLines.slice(0, lastLineIdx).join('\n').trim();
      }

      if (question && answer) {
        notes.push({ question, answer, tags: [...new Set(tags)], timestamp });
      }
    });

    return notes;
  };

  // 导入功能 - 解析 JSON 文件
  const parseJSONFile = (content) => {
    try {
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        throw new Error('JSON 格式错误：必须是数组');
      }

      return data.map(note => ({
        question: note.question || '',
        answer: note.answer || '',
        tags: Array.isArray(note.tags) ? note.tags : [],
        timestamp: note.timestamp || ''
      }));
    } catch (error) {
      throw new Error(`JSON 解析失败: ${error.message}`);
    }
  };

  // 导入功能 - 处理文件上传
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportDialog({ ...importDialog, loading: true });

    try {
      const content = await file.text();
      let parsedNotes = [];

      if (file.name.endsWith('.json')) {
        parsedNotes = parseJSONFile(content);
      } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        parsedNotes = parseMDFile(content);
      } else {
        throw new Error('不支持的文件格式，请上传 .md 或 .json 文件');
      }

      if (parsedNotes.length === 0) {
        throw new Error('文件中没有找到有效的笔记');
      }

      setImportDialog({
        open: true,
        parsedNotes: parsedNotes,
        loading: false
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `❌ 文件解析失败: ${error.message}`,
        severity: 'error'
      });
      setImportDialog({ open: false, parsedNotes: [], loading: false });
    }

    // 重置 input
    event.target.value = '';
  };

  // 导入功能 - 执行批量导入
  const handleConfirmImport = async () => {
    setImportDialog({ ...importDialog, loading: true });

    try {
      const response = await fetch('/api/notes/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({ notes: importDialog.parsedNotes })
      });

      const data = await response.json();

      if (data.success) {
        setSnackbar({
          open: true,
          message: `✅ ${data.message}`,
          severity: 'success'
        });

        setImportDialog({ open: false, parsedNotes: [], loading: false });
        fetchNotes(); // 刷新笔记列表
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `❌ 导入失败: ${error.message}`,
        severity: 'error'
      });
      setImportDialog({ ...importDialog, loading: false });
    }
  };

  // 导入功能 - 编辑导入预览中的笔记
  const handleEditImportNote = (index, field, value) => {
    const updatedNotes = [...importDialog.parsedNotes];
    updatedNotes[index][field] = value;
    setImportDialog({ ...importDialog, parsedNotes: updatedNotes });
  };

  // 导入功能 - 删除导入预览中的笔记
  const handleRemoveImportNote = (index) => {
    const updatedNotes = importDialog.parsedNotes.filter((_, i) => i !== index);
    setImportDialog({ ...importDialog, parsedNotes: updatedNotes });
  };

  // 导出功能
  const [exportMenu, setExportMenu] = useState(null);

  const handleExportClick = (event) => {
    setExportMenu(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenu(null);
  };

  const exportAsMarkdown = () => {
    const content = notes.map(note => {
      let md = `## 📝 ${note.question}\n\n`;
      md += `**时间**: ${note.timestamp}\n\n`;
      if (note.tags.length > 0) {
        md += `**标签**: ${note.tags.map(t => `\`${t}\``).join(' ')}\n\n`;
      }
      md += `### 💡 回答\n\n${note.answer}\n\n---\n\n`;
      return md;
    }).join('');

    const blob = new Blob([`# Claude 对话笔记\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    handleExportClose();

    setSnackbar({
      open: true,
      message: '✅ Markdown 已导出！',
      severity: 'success'
    });
  };

  const exportAsJSON = () => {
    const json = JSON.stringify(notes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    handleExportClose();

    setSnackbar({
      open: true,
      message: '✅ JSON 已导出！',
      severity: 'success'
    });
  };

  const exportAsHTML = () => {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude 对话笔记</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f7fa; }
    h1 { color: #1f2937; text-align: center; }
    .note { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .question { font-size: 20px; font-weight: 600; color: #1f2937; margin-bottom: 10px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
    .tag { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 12px; margin-right: 8px; font-size: 12px; }
    .answer { line-height: 1.7; color: #374151; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>📝 Claude 对话笔记</h1>
  ${notes.map(note => `
    <div class="note">
      <div class="question">❓ ${note.question}</div>
      <div class="meta">⏰ ${note.timestamp} ${note.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <div class="answer">💡 ${note.answer}</div>
    </div>
  `).join('')}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    handleExportClose();

    setSnackbar({
      open: true,
      message: '✅ HTML 已导出！',
      severity: 'success'
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4, pb: 10 }}>
        <Container maxWidth="lg">
          {/* 标题 */}
          <Fade in={true} timeout={1000}>
            <Box sx={{ mb: 4, textAlign: 'center', position: 'relative' }}>
              {/* 顶部操作栏 */}
              <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* 模式切换（仅生产环境显示） */}
                {isProduction && (
                  <>
                    <Chip
                      icon={<VisibilityOutlined />}
                      label="访客模式"
                      color={authMode === 'guest' ? 'primary' : 'default'}
                      onClick={() => setAuthMode('guest')}
                      variant={authMode === 'guest' ? 'filled' : 'outlined'}
                      size="small"
                    />
                    <Chip
                      icon={<AdminPanelSettings />}
                      label="管理员"
                      color={authMode === 'admin' ? 'error' : 'default'}
                      onClick={handleSwitchToAdmin}
                      variant={authMode === 'admin' ? 'filled' : 'outlined'}
                      size="small"
                    />
                    {authMode === 'admin' && authToken && (
                      <Button size="small" onClick={handleLogout} variant="outlined">
                        退出
                      </Button>
                    )}
                  </>
                )}
                {/* 深色模式切换 */}
                <IconButton
                  onClick={() => setDarkMode(!darkMode)}
                  color="primary"
                  title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
                >
                  {darkMode ? <LightMode /> : <DarkMode />}
                </IconButton>
              </Box>

              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                📝 Claude 笔记本
              </Typography>
              <Typography variant="body1" color="text.secondary">
                记录与 Claude 对话中的重点内容
              </Typography>

              {/* 访客模式提示 */}
              {authMode === 'guest' && isProduction && (
                <Alert severity="info" sx={{ mt: 2, maxWidth: '600px', mx: 'auto' }}>
                  当前为<strong>访客模式</strong>，只能查看笔记。切换到管理员模式以编辑内容。
                </Alert>
              )}
            </Box>
          </Fade>

        <Grid container spacing={3}>
          {/* 左侧：添加笔记（仅管理员可见） */}
          {authMode === 'admin' && (
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}>
                  <Add />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  添加新笔记
                </Typography>
              </Box>

              {/* 问题输入 */}
              <TextField
                fullWidth
                label="问题"
                variant="outlined"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                multiline
                rows={2}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QuestionAnswer color="primary" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* 答案输入 */}
              <TextField
                fullWidth
                label="答案"
                variant="outlined"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                multiline
                rows={6}
                sx={{ mb: 2 }}
                helperText={`${answer.length} 字`}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lightbulb color="secondary" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* 标签输入 */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="添加标签"
                  variant="outlined"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocalOffer />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <Button size="small" onClick={handleAddTag}>
                        添加
                      </Button>
                    ),
                  }}
                />

                {/* 标签列表 */}
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleDeleteTag(tag)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>

              {/* 保存按钮 */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSaveNote}
                disabled={isSaving}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: 2,
                }}
              >
                {isSaving ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    保存中...
                  </>
                ) : (
                  '💾 保存笔记'
                )}
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                笔记将保存到 notes/notes.md 文件
              </Typography>
            </Paper>
          </Grid>
          )}

          {/* 右侧：笔记列表 */}
          <Grid item xs={12} md={authMode === 'admin' ? 7 : 12}>
            <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb', minHeight: 600 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#f50057', mr: 2 }}>
                  <BookmarkBorder />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                  笔记列表 ({filteredNotes.length})
                </Typography>

                {/* 批量模式开关（仅管理员可见） */}
                {authMode === 'admin' && (
                <Button
                  variant={batchMode ? "contained" : "outlined"}
                  size="small"
                  onClick={toggleBatchMode}
                  sx={{ mr: 1 }}
                  startIcon={batchMode ? <Close /> : <CheckBox />}
                >
                  {batchMode ? '退出批量' : '批量模式'}
                </Button>
                )}

                {/* 导入按钮（仅管理员可见） */}
                {authMode === 'admin' && (
                <>
                <input
                  accept=".md,.markdown,.json"
                  style={{ display: 'none' }}
                  id="import-file"
                  type="file"
                  onChange={handleFileUpload}
                />
                <label htmlFor="import-file">
                  <IconButton
                    component="span"
                    color="primary"
                    title="导入笔记"
                    disabled={importDialog.loading}
                  >
                    <CloudUpload />
                  </IconButton>
                </label>
                </>
                )}

                <IconButton
                  onClick={handleExportClick}
                  color="primary"
                  title="导出笔记"
                >
                  <FileDownload />
                </IconButton>
              </Box>

              {/* 批量操作工具栏 */}
              {batchMode && (
                <Box sx={{
                  mb: 2,
                  p: 2,
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    已选中 {selectedNotes.size} 条笔记
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={selectAll}
                    sx={{ color: 'white', borderColor: 'white' }}
                    startIcon={<SelectAll />}
                  >
                    全选
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={deselectAll}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    取消全选
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleBatchExport}
                    disabled={selectedNotes.size === 0}
                    sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f0f0f0' } }}
                  >
                    导出选中
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleBatchDelete}
                    disabled={selectedNotes.size === 0}
                    sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
                    startIcon={<Delete />}
                  >
                    删除选中
                  </Button>
                </Box>
              )}

              {/* 导出菜单 */}
              <Menu
                anchorEl={exportMenu}
                open={Boolean(exportMenu)}
                onClose={handleExportClose}
              >
                <MenuItem onClick={exportAsMarkdown}>
                  📄 导出为 Markdown
                </MenuItem>
                <MenuItem onClick={exportAsJSON}>
                  📊 导出为 JSON
                </MenuItem>
                <MenuItem onClick={exportAsHTML}>
                  🌐 导出为 HTML
                </MenuItem>
              </Menu>

              {/* 搜索框 */}
              <TextField
                fullWidth
                variant="outlined"
                placeholder="搜索问题、答案或标签..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />

              {/* 标签过滤 */}
              {sortedTags.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    热门标签：
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      label="全部"
                      size="small"
                      onClick={() => setSelectedTag(null)}
                      color={!selectedTag ? 'primary' : 'default'}
                      variant={!selectedTag ? 'filled' : 'outlined'}
                    />
                    {sortedTags.map(([tag, count]) => (
                      <Chip
                        key={tag}
                        label={`${tag} (${count})`}
                        size="small"
                        onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                        color={selectedTag === tag ? 'primary' : 'default'}
                        variant={selectedTag === tag ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* 笔记卡片列表 */}
              <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                {filteredNotes.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? '🔍 没有找到相关笔记' : '📭 还没有笔记，快来添加第一条吧！'}
                    </Typography>
                  </Box>
                ) : (
                  filteredNotes.map((note, index) => {
                    const isDeleting = deletingTimestamp === note.timestamp;
                    const isSelected = selectedNotes.has(note.timestamp);
                    return (
                      <Collapse key={note.timestamp} in={!isDeleting} timeout={300}>
                        <Card
                          sx={{
                            mb: 2,
                            borderRadius: 2,
                            border: isSelected ? '2px solid' : '1px solid',
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            position: 'relative',
                            transition: 'all 0.2s',
                            bgcolor: isSelected ? 'action.selected' : 'background.paper',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              transform: 'translateY(-2px)',
                            },
                          }}
                        >
                          <CardContent>
                            {/* 批量模式复选框 */}
                            {batchMode && (
                              <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                                <IconButton
                                  onClick={() => toggleNoteSelection(note.timestamp)}
                                  size="small"
                                  color="primary"
                                >
                                  {isSelected ? <CheckBox /> : <CheckBoxOutlineBlank />}
                                </IconButton>
                              </Box>
                            )}

                            {/* 操作按钮组 */}
                            {!batchMode && (
                              <Box sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                display: 'flex',
                                gap: 0.5,
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                '.MuiCard-root:hover &': { opacity: 1 }
                              }}>
                                {authMode === 'admin' && (
                                <>
                                <IconButton
                                  onClick={() => handleEditClick(note)}
                                  size="small"
                                  color="primary"
                                  disabled={isDeleting}
                                  sx={{
                                    '&:hover': {
                                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                    },
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  onClick={() => handleDeleteClick(note)}
                                  size="small"
                                  color="error"
                                  disabled={isDeleting}
                                  sx={{
                                    '&:hover': {
                                      backgroundColor: 'rgba(211, 47, 47, 0.08)',
                                    },
                                  }}
                                >
                                  {isDeleting ? (
                                    <CircularProgress size={16} color="error" />
                                  ) : (
                                    <Delete fontSize="small" />
                                  )}
                                </IconButton>
                                </>
                                )}
                              </Box>
                            )}

                            {/* 问题 */}
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                              ❓ {note.question}
                            </Typography>

                        {/* 时间和标签 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          <Chip
                            icon={<AccessTime />}
                            label={formatRelativeTime(note.timestamp)}
                            size="small"
                            variant="outlined"
                            title={note.timestamp}
                          />
                          {note.tags.map((tag, idx) => (
                            <Chip
                              key={idx}
                              label={tag}
                              size="small"
                              color="primary"
                              onClick={() => setSelectedTag(tag)}
                              sx={{ cursor: 'pointer' }}
                            />
                          ))}
                          {/* 相关笔记按钮 */}
                          {note.tags.length > 0 && (
                            <Chip
                              icon={<LinkIcon />}
                              label="相关笔记"
                              size="small"
                              variant="outlined"
                              onClick={() => handleShowRelated(note)}
                              sx={{ cursor: 'pointer' }}
                            />
                          )}
                        </Box>

                        <Divider sx={{ my: 1.5 }} />

                        {/* 答案 */}
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
                          }}
                        >
                          💡 {note.answer}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Collapse>
                );
              })
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* 提示消息 */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={snackbar.action === 'undo' ? 5000 : 3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
            action={
              snackbar.action === 'undo' && deletedNote ? (
                <Button color="inherit" size="small" onClick={handleUndoDelete}>
                  撤销
                </Button>
              ) : null
            }
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* 删除确认对话框 */}
        <Dialog
          open={deleteDialog.open}
          onClose={handleCancelDelete}
        >
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <DialogContentText>
              确定要删除这条笔记吗？
            </DialogContentText>
            {deleteDialog.noteToDelete && (
              <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
                📝 {deleteDialog.noteToDelete.question}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDelete} color="inherit">
              取消
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              autoFocus
            >
              删除
            </Button>
          </DialogActions>
        </Dialog>

        {/* 批量删除确认对话框 */}
        <Dialog
          open={batchDialog.open && batchDialog.action === 'delete'}
          onClose={() => setBatchDialog({ open: false, action: null })}
        >
          <DialogTitle>确认批量删除</DialogTitle>
          <DialogContent>
            <DialogContentText>
              确定要删除选中的 {selectedNotes.size} 条笔记吗？此操作不可撤销。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBatchDialog({ open: false, action: null })} color="inherit">
              取消
            </Button>
            <Button
              onClick={confirmBatchDelete}
              color="error"
              variant="contained"
              autoFocus
            >
              删除
            </Button>
          </DialogActions>
        </Dialog>

        {/* 编辑对话框 */}
        <Dialog
          open={editDialog.open}
          onClose={handleCancelEdit}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>✏️ 编辑笔记</DialogTitle>
          <DialogContent>
            {editDialog.noteToEdit && (
              <Box sx={{ mt: 2 }}>
                {/* 问题输入 */}
                <TextField
                  fullWidth
                  label="问题"
                  variant="outlined"
                  value={editDialog.noteToEdit.question}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    noteToEdit: {
                      ...editDialog.noteToEdit,
                      question: e.target.value
                    }
                  })}
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <QuestionAnswer color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* 答案输入 */}
                <TextField
                  fullWidth
                  label="答案"
                  variant="outlined"
                  value={editDialog.noteToEdit.answer}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    noteToEdit: {
                      ...editDialog.noteToEdit,
                      answer: e.target.value
                    }
                  })}
                  multiline
                  rows={6}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lightbulb color="secondary" />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* 标签输入 */}
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label="添加标签"
                    variant="outlined"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEditAddTag();
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocalOffer />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <Button size="small" onClick={handleEditAddTag}>
                          添加
                        </Button>
                      ),
                    }}
                  />

                  {/* 标签列表 */}
                  <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {editDialog.noteToEdit.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        onDelete={() => handleEditDeleteTag(tag)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                {/* 时间戳显示 */}
                <Typography variant="caption" color="text.secondary">
                  创建时间: {editDialog.noteToEdit.timestamp}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelEdit} color="inherit">
              取消
            </Button>
            <Button
              onClick={handleConfirmEdit}
              color="primary"
              variant="contained"
              autoFocus
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* 相关笔记对话框 */}
        <Dialog
          open={relatedDialog.open}
          onClose={() => setRelatedDialog({ open: false, note: null, related: [] })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            🔗 相关笔记
            {relatedDialog.note && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                当前笔记: {relatedDialog.note.question}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            {relatedDialog.related.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                暂无相关笔记
              </Typography>
            ) : (
              <Box sx={{ mt: 2 }}>
                {relatedDialog.related.map((relatedNote, idx) => (
                  <Card
                    key={idx}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        boxShadow: 2,
                      },
                    }}
                  >
                    <CardContent>
                      {/* 标题和相似度 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                          ❓ {relatedNote.question}
                        </Typography>
                        <Chip
                          label={`${Math.round(relatedNote.similarity * 100)}% 相似`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </Box>

                      {/* 共同标签 */}
                      {relatedNote.commonTags && relatedNote.commonTags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary">
                            共同标签:
                          </Typography>
                          {relatedNote.commonTags.map((tag, tagIdx) => (
                            <Chip
                              key={tagIdx}
                              label={tag}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      )}

                      <Divider sx={{ my: 1 }} />

                      {/* 答案预览 */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        💡 {relatedNote.answer}
                      </Typography>

                      {/* 时间 */}
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          icon={<AccessTime />}
                          label={formatRelativeTime(relatedNote.timestamp)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRelatedDialog({ open: false, note: null, related: [] })}>
              关闭
            </Button>
          </DialogActions>
        </Dialog>

        {/* 导入预览对话框 */}
        <Dialog
          open={importDialog.open}
          onClose={() => setImportDialog({ open: false, parsedNotes: [], loading: false })}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            📥 导入预览
            <Typography variant="body2" color="text.secondary">
              共解析出 {importDialog.parsedNotes.length} 条笔记，请检查后确认导入
            </Typography>
          </DialogTitle>
          <DialogContent>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell width="5%">#</TableCell>
                    <TableCell width="30%">问题</TableCell>
                    <TableCell width="40%">答案</TableCell>
                    <TableCell width="15%">标签</TableCell>
                    <TableCell width="10%">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importDialog.parsedNotes.map((note, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          multiline
                          value={note.question}
                          onChange={(e) => handleEditImportNote(index, 'question', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          value={note.answer}
                          onChange={(e) => handleEditImportNote(index, 'answer', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {note.tags.map((tag, idx) => (
                            <Chip key={idx} label={tag} size="small" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveImportNote(index)}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialog({ open: false, parsedNotes: [], loading: false })}>
              取消
            </Button>
            <Button
              onClick={handleConfirmImport}
              variant="contained"
              color="primary"
              disabled={importDialog.loading || importDialog.parsedNotes.length === 0}
              startIcon={importDialog.loading ? <CircularProgress size={16} /> : <CloudUpload />}
            >
              确认导入 ({importDialog.parsedNotes.length})
            </Button>
          </DialogActions>
        </Dialog>

        {/* 作者信息 - 左下角 */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: darkMode ? 'rgba(26, 26, 26, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid',
            borderColor: 'divider',
            py: 1.5,
            px: 3,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            💫 Made with ❤️ by <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>Moer</Box>
          </Typography>
          <Divider orientation="vertical" flexItem />
          <Typography
            variant="body2"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
              fontSize: '0.875rem',
              fontStyle: 'italic',
            }}
          >
            💬 慎终如始，行稳致远
          </Typography>
        </Box>

        {/* 登录对话框 */}
        <Dialog open={loginDialog} onClose={() => setLoginDialog(false)}>
          <DialogTitle>🔐 管理员登录</DialogTitle>
          <DialogContent>
            <DialogContentText>
              请输入管理员密码以获取编辑权限
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="密码"
              type="password"
              fullWidth
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLoginDialog(false)}>取消</Button>
            <Button onClick={handleLogin} variant="contained">登录</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
    </ThemeProvider>
  );
};

export default NotesApp;
