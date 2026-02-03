// DOM Elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const charCount = document.getElementById('charCount');
const themeToggle = document.getElementById('themeToggle');
const downloadHtml = document.getElementById('downloadHtml');
const exportPdf = document.getElementById('exportPdf');
const downloadMd = document.getElementById('downloadMd');
const clearBtn = document.getElementById('clearBtn');
const divider = document.getElementById('divider');
const editorPane = document.getElementById('editorPane');
const previewPane = document.getElementById('previewPane');
const viewToggle = document.getElementById('viewToggle');
const container = document.querySelector('.container');

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose'
});

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (e) {}
    }
    return hljs.highlightAuto(code).value;
  }
});

// Custom renderer for Mermaid and Math
const renderer = {
  code(codeBlock) {
    // Handle both old format (code, lang) and new format ({ text, lang })
    const code = typeof codeBlock === 'string' ? codeBlock : codeBlock.text;
    const language = typeof codeBlock === 'string' ? arguments[1] : codeBlock.lang;

    if (language === 'mermaid') {
      return `<div class="mermaid">${escapeHtml(code)}</div>`;
    }
    if (language === 'math') {
      return `<div class="math-block">${escapeHtml(code)}</div>`;
    }

    const validLang = language && hljs.getLanguage(language);
    const highlighted = validLang
      ? hljs.highlight(code, { language }).value
      : escapeHtml(code);
    const langClass = language ? ` language-${language}` : '';
    return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>`;
  }
};

marked.use({ renderer });

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Process math expressions
function processMath(content) {
  // Block math: $$...$$
  content = content.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
    return `<div class="math-block">${escapeHtml(math.trim())}</div>`;
  });

  // Inline math: $...$
  content = content.replace(/\$([^$\n]+)\$/g, (match, math) => {
    return `<span class="math-inline">${escapeHtml(math)}</span>`;
  });

  return content;
}

// Render markdown
let renderTimeout;
function renderMarkdown() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    const content = editor.value;

    // Update character count
    charCount.textContent = `${content.length} 字`;

    // Save to localStorage
    localStorage.setItem('mdp-editor-content', content);

    if (!content.trim()) {
      preview.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>在左側輸入 Markdown 內容</p>
          <p>即時預覽會顯示在這裡</p>
        </div>
      `;
      return;
    }

    // Process math before markdown
    const processedContent = processMath(content);

    // Parse markdown
    const html = marked.parse(processedContent);
    preview.innerHTML = html;

    // Render KaTeX
    renderKaTeX();

    // Render Mermaid
    renderMermaid();
  }, 150);
}

// Render KaTeX math
function renderKaTeX() {
  document.querySelectorAll('.math-inline').forEach(el => {
    try {
      katex.render(el.textContent, el, { throwOnError: false });
    } catch (e) {
      console.warn('KaTeX error:', e);
    }
  });

  document.querySelectorAll('.math-block').forEach(el => {
    try {
      katex.render(el.textContent, el, { throwOnError: false, displayMode: true });
    } catch (e) {
      console.warn('KaTeX error:', e);
    }
  });
}

// Render Mermaid diagrams
async function renderMermaid() {
  const mermaidEls = document.querySelectorAll('.mermaid');
  if (mermaidEls.length === 0) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose'
  });

  for (const el of mermaidEls) {
    const code = el.textContent;
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { svg } = await mermaid.render(id, code);
      el.innerHTML = svg;
    } catch (e) {
      el.innerHTML = `<pre style="color: #dc3545;">Mermaid Error: ${e.message}</pre>`;
    }
  }
}

// Theme toggle
function initTheme() {
  const savedTheme = localStorage.getItem('mdp-theme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mdp-theme', theme);

  const lightCss = document.getElementById('hljs-light');
  const darkCss = document.getElementById('hljs-dark');

  if (theme === 'dark') {
    themeToggle.textContent = '☀️ 亮色';
    lightCss.disabled = true;
    darkCss.disabled = false;
  } else {
    themeToggle.textContent = '🌙 暗色';
    lightCss.disabled = false;
    darkCss.disabled = true;
  }

  // Re-render Mermaid with new theme
  renderMermaid();
}

themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// Download HTML
downloadHtml.addEventListener('click', () => {
  const htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Document</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.9em; }
    :not(pre) > code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; }
    blockquote { margin: 0 0 16px; padding: 0 1em; border-left: 4px solid #dfe2e5; color: #6a737d; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
    th { background: #f6f8fa; font-weight: 600; }
    img { max-width: 100%; }
    h1, h2 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  </style>
</head>
<body>
${preview.innerHTML}
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Download MD
downloadMd.addEventListener('click', () => {
  const content = editor.value;
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Export PDF
exportPdf.addEventListener('click', () => {
  const printWindow = window.open('', '_blank');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  printWindow.document.write(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>Markdown Document</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #24292e; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.9em; }
    :not(pre) > code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; }
    blockquote { margin: 0 0 16px; padding: 0 1em; border-left: 4px solid #dfe2e5; color: #6a737d; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
    th { background: #f6f8fa; font-weight: 600; }
    img { max-width: 100%; }
    h1, h2 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
${preview.innerHTML}
</body>
</html>`);

  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
});

// Clear
clearBtn.addEventListener('click', () => {
  if (editor.value && !confirm('確定要清除所有內容嗎？')) {
    return;
  }
  editor.value = '';
  renderMarkdown();
});

// Resizable divider
let isResizing = false;

divider.addEventListener('mousedown', (e) => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;

  const container = document.querySelector('.container');
  const containerRect = container.getBoundingClientRect();
  const dividerWidth = 4; // divider 寬度
  const availableWidth = containerRect.width - dividerWidth;
  const mouseX = e.clientX - containerRect.left;
  const percentage = (mouseX / containerRect.width) * 100;

  if (percentage > 20 && percentage < 80) {
    // 使用 calc 保留 divider 空間
    document.querySelector('.editor-pane').style.flex = `0 0 calc(${percentage}% - ${dividerWidth / 2}px)`;
    document.querySelector('.preview-pane').style.flex = `0 0 calc(${100 - percentage}% - ${dividerWidth / 2}px)`;
  }
});

document.addEventListener('mouseup', () => {
  isResizing = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// Tab key support in editor
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    renderMarkdown();
  }
});

// Editor line highlight
const lineHighlight = document.createElement('div');
lineHighlight.className = 'editor-line-highlight';
editorPane.appendChild(lineHighlight);

function updateLineHighlight() {
  const text = editor.value;
  const cursorPos = editor.selectionStart;

  // Get line number
  const textBefore = text.substring(0, cursorPos);
  const lineIndex = textBefore.split('\n').length - 1;

  // Calculate line height and position
  const style = getComputedStyle(editor);
  const lineHeight = parseFloat(style.lineHeight) || 22.4;
  const paddingTop = parseFloat(style.paddingTop) || 16;

  // Position highlight
  const top = paddingTop + (lineIndex * lineHeight) - editor.scrollTop;
  const headerHeight = 36; // pane-header height

  lineHighlight.style.top = `${headerHeight + top}px`;
  lineHighlight.style.height = `${lineHeight}px`;
  lineHighlight.style.display = top >= 0 && top < editor.clientHeight ? 'block' : 'none';
}

editor.addEventListener('click', updateLineHighlight);
editor.addEventListener('keyup', updateLineHighlight);
editor.addEventListener('scroll', updateLineHighlight);
editor.addEventListener('focus', () => {
  lineHighlight.style.display = 'block';
  updateLineHighlight();
});
editor.addEventListener('blur', () => {
  lineHighlight.style.display = 'none';
});

// Scroll sync - editor scrolls, preview follows
let isSyncing = false;

function syncScroll(source) {
  if (isSyncing) return;
  isSyncing = true;

  if (source === 'editor') {
    const editorScrollMax = editor.scrollHeight - editor.clientHeight;
    const previewScrollMax = preview.scrollHeight - preview.clientHeight;

    if (editorScrollMax > 0) {
      const percent = editor.scrollTop / editorScrollMax;
      preview.scrollTop = percent * previewScrollMax;
    }
  } else {
    const editorScrollMax = editor.scrollHeight - editor.clientHeight;
    const previewScrollMax = preview.scrollHeight - preview.clientHeight;

    if (previewScrollMax > 0) {
      const percent = preview.scrollTop / previewScrollMax;
      editor.scrollTop = percent * editorScrollMax;
    }
  }

  setTimeout(() => { isSyncing = false; }, 20);
}

editor.addEventListener('scroll', () => syncScroll('editor'));
preview.addEventListener('scroll', () => syncScroll('preview'));

// View mode toggle
function setViewMode(mode) {
  container.classList.remove('editor-only', 'preview-only');

  if (mode === 'editor') {
    container.classList.add('editor-only');
  } else if (mode === 'preview') {
    container.classList.add('preview-only');
  }

  // Update active button
  viewToggle.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  localStorage.setItem('mdp-view-mode', mode);
}

viewToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-btn');
  if (btn) {
    setViewMode(btn.dataset.mode);
  }
});

// Load view mode
function loadViewMode() {
  const savedMode = localStorage.getItem('mdp-view-mode') || 'split';
  setViewMode(savedMode);
}

// Load saved content
function loadSavedContent() {
  const saved = localStorage.getItem('mdp-editor-content');
  if (saved) {
    editor.value = saved;
  }
}

// Initialize
initTheme();
loadViewMode();
loadSavedContent();
editor.addEventListener('input', renderMarkdown);
renderMarkdown();

// Focus editor on load
editor.focus();
