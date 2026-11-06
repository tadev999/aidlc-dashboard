const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

class AidlcWatcher {
  constructor(workspaceRoot, onChangeCallback) {
    this.workspaceRoot = workspaceRoot;
    this.onChangeCallback = onChangeCallback;
    this.watcher = null;
    this.debounceTimer = null;
  }

  start() {
    const aidlcDir = path.join(this.workspaceRoot, 'aidlc');
    
    // Watch aidlc directory if it exists, or watch workspace root for aidlc creation
    const targetToWatch = fs.existsSync(aidlcDir) ? aidlcDir : this.workspaceRoot;

    this.watcher = chokidar.watch(targetToWatch, {
      ignored: /(^|[\/\\])\..|node_modules|dist/,
      persistent: true,
      ignoreInitial: true,
      depth: 6
    });

    const trigger = (event, filePath) => {
      // Check if file is related to aidlc
      if (filePath.includes('aidlc') || path.basename(filePath) === 'aidlc') {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          if (this.onChangeCallback) {
            this.onChangeCallback({ event, filePath });
          }
        }, 150);
      }
    };

    this.watcher
      .on('add', (filePath) => trigger('add', filePath))
      .on('change', (filePath) => trigger('change', filePath))
      .on('unlink', (filePath) => trigger('unlink', filePath))
      .on('error', (error) => console.error('Watcher error:', error));

    console.log(`[AidlcWatcher] Watching ${targetToWatch}`);
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

module.exports = {
  AidlcWatcher
};
