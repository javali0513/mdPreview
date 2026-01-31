import chokidar from 'chokidar';

export function watchFile(filePath, onChange) {
  const watcher = chokidar.watch(filePath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100
    }
  });

  watcher.on('change', (path) => {
    onChange(path);
  });

  watcher.on('error', (error) => {
    console.error('Watcher error:', error);
  });

  return watcher;
}
