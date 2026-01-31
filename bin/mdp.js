#!/usr/bin/env node

import { program } from 'commander';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { createServer } from '../src/server.js';

program
  .name('mdp')
  .description('Markdown Previewer - Preview MD files or use online editor')
  .version('1.0.0')
  .argument('[file]', 'Markdown file to preview (optional, opens editor if not provided)')
  .option('-p, --port <number>', 'Port number', '3000')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (file, options) => {
    const port = parseInt(options.port, 10);

    // Editor mode: no file provided
    if (!file) {
      console.log('✏️  Starting Markdown Editor...');
      console.log(`🌐 Starting server on port ${port}...`);

      await createServer({
        filePath: null,  // null indicates editor mode
        port,
        open: options.open
      });
      return;
    }

    // File preview mode
    const filePath = resolve(process.cwd(), file);

    if (!existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }

    if (!file.endsWith('.md') && !file.endsWith('.markdown')) {
      console.error('Error: File must be a Markdown file (.md or .markdown)');
      process.exit(1);
    }

    console.log(`📄 Previewing: ${filePath}`);
    console.log(`🌐 Starting server on port ${port}...`);

    await createServer({
      filePath,
      port,
      open: options.open
    });
  });

program.parse();
