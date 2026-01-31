import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer as createHttpServer } from 'http';
import { readFileSync } from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import { parseMarkdown } from './parser.js';
import { watchFile } from './watcher.js';
import { generatePdf } from './pdf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createServer({ filePath, port, open: shouldOpen }) {
  const app = express();
  const server = createHttpServer(app);

  // Determine mode: editor (filePath is null) or file preview
  const isEditorMode = filePath === null;

  // Root route: redirect based on mode (must be before static middleware)
  app.get('/', (req, res) => {
    if (isEditorMode) {
      res.redirect('/editor.html');
    } else {
      res.sendFile(join(__dirname, '../public/index.html'));
    }
  });

  // Serve static files
  app.use(express.static(join(__dirname, '../public')));

  // File preview mode only
  if (!isEditorMode) {
    const wss = new WebSocketServer({ server });
    const clients = new Set();

    // API: Get rendered content
    app.get('/api/content', (req, res) => {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const { html, toc } = parseMarkdown(content);
        const fileName = basename(filePath);
        res.json({ html, toc, fileName });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // API: Get file info
    app.get('/api/info', (req, res) => {
      res.json({
        filePath,
        fileName: basename(filePath)
      });
    });

    // API: Export to PDF
    app.get('/api/pdf', async (req, res) => {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const { html } = parseMarkdown(content);
        const fileName = basename(filePath, '.md') + '.pdf';

        const pdfBuffer = await generatePdf(html, basename(filePath));

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // WebSocket connection handling
    wss.on('connection', (ws) => {
      clients.add(ws);
      console.log('🔌 Client connected');

      ws.on('close', () => {
        clients.delete(ws);
        console.log('🔌 Client disconnected');
      });
    });

    // Watch file for changes
    watchFile(filePath, () => {
      console.log('📝 File changed, notifying clients...');
      const content = readFileSync(filePath, 'utf-8');
      const { html, toc } = parseMarkdown(content);

      const message = JSON.stringify({ type: 'update', html, toc });

      for (const client of clients) {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      }
    });
  }

  // Start server
  return new Promise((resolve) => {
    server.listen(port, () => {
      const url = isEditorMode
        ? `http://localhost:${port}/editor.html`
        : `http://localhost:${port}`;

      console.log(`✅ Server running at ${url}`);

      if (isEditorMode) {
        console.log('✏️  Editor mode - paste or type Markdown content');
      } else {
        console.log('👀 Watching for file changes...');
      }

      console.log('📋 Press Ctrl+C to stop');

      if (shouldOpen) {
        open(url);
      }

      resolve(server);
    });
  });
}
