import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked with GFM and syntax highlighting
marked.setOptions({
  gfm: true,
  breaks: true
});

// Custom renderer for code blocks
const renderer = new marked.Renderer();

// Store TOC items
let tocItems = [];

// Custom heading renderer for TOC generation
renderer.heading = function (text, level, raw) {
  const slug = raw.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '');
  tocItems.push({ level, text: raw, slug });
  return `<h${level} id="${slug}">${text}</h${level}>`;
};

// Custom code block renderer for syntax highlighting and Mermaid
renderer.code = function (code, language) {
  // Handle Mermaid diagrams
  if (language === 'mermaid') {
    return `<div class="mermaid">${code}</div>`;
  }

  // Handle math blocks (```math)
  if (language === 'math') {
    return `<div class="math-block">${escapeHtml(code)}</div>`;
  }

  // Syntax highlighting for other languages
  if (language && hljs.getLanguage(language)) {
    try {
      const highlighted = hljs.highlight(code, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    } catch (e) {
      // Fall through to default
    }
  }

  // Default code block
  const escaped = escapeHtml(code);
  return `<pre><code class="hljs">${escaped}</code></pre>`;
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

// Process inline math ($...$) and block math ($$...$$)
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

export function parseMarkdown(content) {
  // Reset TOC
  tocItems = [];

  // Process math before markdown parsing
  const processedContent = processMath(content);

  // Parse markdown
  const html = marked.parse(processedContent);

  // Generate TOC HTML
  const toc = generateToc(tocItems);

  return { html, toc };
}

function generateToc(items) {
  if (items.length === 0) return '';

  let html = '<nav class="toc"><h3>目錄</h3><ul>';

  for (const item of items) {
    const indent = (item.level - 1) * 16;
    html += `<li style="margin-left: ${indent}px"><a href="#${item.slug}">${item.text}</a></li>`;
  }

  html += '</ul></nav>';
  return html;
}

export function getTocItems() {
  return tocItems;
}
