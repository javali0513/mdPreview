// DOM Elements
const contentEl = document.getElementById('content');
const tocEl = document.getElementById('toc');
const fileNameEl = document.getElementById('fileName');
const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('statusText');
const themeToggle = document.getElementById('themeToggle');
const tocToggle = document.getElementById('tocToggle');
const pdfExport = document.getElementById('pdfExport');
const sidebar = document.getElementById('sidebar');

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose'
});

// Load initial content
async function loadContent() {
  try {
    const response = await fetch('/api/content');
    const data = await response.json();
    updateContent(data);
    fileNameEl.textContent = data.fileName;
    document.title = `${data.fileName} - Markdown Preview`;
  } catch (error) {
    console.error('Failed to load content:', error);
    contentEl.innerHTML = '<p style="color: red;">Failed to load content</p>';
  }
}

// Update content
function updateContent({ html, toc }) {
  contentEl.innerHTML = html;
  tocEl.innerHTML = toc;

  // Render KaTeX
  renderMath();

  // Render Mermaid diagrams
  renderMermaid();
}

// Render math expressions with KaTeX
function renderMath() {
  // Inline math
  document.querySelectorAll('.math-inline').forEach(el => {
    try {
      katex.render(el.textContent, el, { throwOnError: false });
    } catch (e) {
      console.warn('KaTeX render error:', e);
    }
  });

  // Block math
  document.querySelectorAll('.math-block').forEach(el => {
    try {
      katex.render(el.textContent, el, { throwOnError: false, displayMode: true });
    } catch (e) {
      console.warn('KaTeX render error:', e);
    }
  });
}

// Render Mermaid diagrams
async function renderMermaid() {
  const mermaidEls = document.querySelectorAll('.mermaid');
  if (mermaidEls.length === 0) return;

  // Update Mermaid theme based on current theme
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
      console.warn('Mermaid render error:', e);
      el.innerHTML = `<pre style="color: red;">Mermaid Error: ${e.message}</pre>`;
    }
  }
}

// WebSocket connection
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    statusDot.className = 'status-dot connected';
    statusText.textContent = '已連線 - 監聽變更中';
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'update') {
      updateContent(data);
      // Flash status to indicate update
      statusText.textContent = '已更新！';
      setTimeout(() => {
        statusText.textContent = '已連線 - 監聽變更中';
      }, 1500);
    }
  };

  ws.onclose = () => {
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = '已斷線 - 重新連線中...';

    // Reconnect after 2 seconds
    setTimeout(connectWebSocket, 2000);
  };

  ws.onerror = () => {
    statusDot.className = 'status-dot disconnected';
  };
}

// Theme Toggle
function initTheme() {
  const savedTheme = localStorage.getItem('mdp-theme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mdp-theme', theme);

  // Toggle highlight.js theme
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
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
});

// TOC Toggle
tocToggle.addEventListener('click', () => {
  sidebar.classList.toggle('hidden');
  const isHidden = sidebar.classList.contains('hidden');
  tocToggle.textContent = isHidden ? '📑 顯示目錄' : '📑 目錄';
});

// PDF Export
pdfExport.addEventListener('click', async () => {
  pdfExport.disabled = true;
  pdfExport.textContent = '⏳ 匯出中...';

  try {
    const response = await fetch('/api/pdf');
    if (!response.ok) throw new Error('PDF export failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileNameEl.textContent.replace('.md', '.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF export error:', error);
    alert('PDF 匯出失敗');
  } finally {
    pdfExport.disabled = false;
    pdfExport.textContent = '📄 PDF';
  }
});

// Initialize
initTheme();
loadContent();
connectWebSocket();
