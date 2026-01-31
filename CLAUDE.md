# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

mdPreview 是一個 Markdown 預覽工具，提供兩種模式：
1. **編輯器模式**：網頁上直接輸入/貼上 Markdown，即時預覽
2. **檔案預覽模式**：預覽本機 MD 檔案，修改後自動更新

支援 GFM、Mermaid 圖表、KaTeX 數學公式。

## 常用指令

```bash
# 安裝依賴
npm install

# 編輯器模式（不指定檔案）
node bin/mdp.js

# 檔案預覽模式
node bin/mdp.js <file.md>

# 指定 port
node bin/mdp.js --port 8080

# 不自動開啟瀏覽器
node bin/mdp.js --no-open
```

## 架構說明

```
CLI (bin/mdp.js)
    │
    ├── 無參數 → 編輯器模式 → /editor.html
    │                         (純前端 Markdown 解析)
    │
    └── 有檔案 → 檔案預覽模式 → /index.html
                               │
Server (src/server.js)         ↓
    ├── /api/content → 回傳渲染後的 HTML (僅檔案模式)
    ├── /api/pdf → 產生 PDF 下載 (僅檔案模式)
    └── WebSocket → 推送即時更新 (僅檔案模式)

Parser (src/parser.js) ─── marked + highlight.js (後端)
Watcher (src/watcher.js) ─── chokidar (檔案監聽)
PDF (src/pdf.js) ─── puppeteer (PDF 匯出)
```

**前端 (public/)**：
- `editor.html/css/js` - 編輯器模式，使用 CDN 載入 marked 在前端解析
- `index.html/style.css/client.js` - 檔案預覽模式，透過 API 取得後端解析結果

## 技術重點

- **ESM 模組**：使用 `type: "module"`，所有 import 需加 `.js` 副檔名
- **雙模式路由**：`/` 根據 `filePath` 是否為 `null` 決定跳轉 editor 或 index
- **編輯器模式**：純前端解析，內容存於 `localStorage`
- **檔案模式**：後端解析 + WebSocket 即時推送

## 編輯器功能

- **檢視模式切換**：三種模式（僅編輯器 ✏️ / 分割檢視 ▐▌ / 僅預覽 👁），狀態存於 `localStorage`
- **編輯行高亮**：點擊編輯器或方向鍵移動時，當前行會高亮顯示
- **滾動同步**：編輯器與預覽區滾動同步
- **主題切換**：亮色/暗色主題，自動切換 highlight.js 樣式
- **拖曳調整**：可拖曳中間分隔線調整左右面板比例
- **匯出功能**：下載 HTML、下載 MD、匯出 PDF（透過瀏覽器列印）

## CSS 技巧

- 檢視模式使用 `.container.editor-only` 和 `.container.preview-only` 類別控制顯示
- 編輯行高亮使用 `position: absolute` 的 overlay div 實現
