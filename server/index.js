const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { exec } = require('child_process');

function openBrowser(url) {
  const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${start} ${url}`, (err) => {
    if (err) console.log(`Please open your browser at: ${url}`);
  });
}

const { AidlcParser, AIDLC_PHASES } = require('./aidlcParser');
const { AidlcController } = require('./controller');
const { AidlcWatcher } = require('./watcher');
const { createSampleAidlcStructure } = require('./mockDataGenerator');

function createServer(options = {}) {
  let workspaceRoot = path.resolve(options.workspaceRoot || process.cwd());
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server, path: '/ws' });

  app.use(cors());
  app.use(express.json());

  let parser = new AidlcParser(workspaceRoot);
  let controller = new AidlcController(workspaceRoot);
  let selectedIntentId = null;

  const recentWorkspaces = new Set([
    workspaceRoot,
    '/Users/taduongngoc/Projects/an_match',
    '/Users/taduongngoc/Projects/aidlc-dashboard'
  ]);

  // Broadcast to all WebSocket clients
  function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // Get current snapshot data
  function getSnapshot() {
    const hasAidlc = parser.hasAidlcDirectory();
    const intents = parser.findIntents();

    let currentIntent = null;
    if (intents.length > 0) {
      if (selectedIntentId) {
        currentIntent = intents.find(i => i.id === selectedIntentId) || intents[0];
      } else {
        currentIntent = intents[0];
      }
    }

    let state = null;
    let auditLogs = [];
    let artifacts = [];

    if (currentIntent) {
      const statePath = path.join(currentIntent.path, 'aidlc-state.md');
      state = parser.parseStateFile(statePath);
      auditLogs = parser.parseAuditLogs(currentIntent.path);
      artifacts = parser.getArtifacts(currentIntent.path);
    }

    return {
      workspaceRoot,
      hasAidlc,
      intents,
      currentIntent,
      state,
      auditLogs,
      artifacts,
      phases: AIDLC_PHASES,
      recentWorkspaces: Array.from(recentWorkspaces),
      timestamp: new Date().toISOString()
    };
  }

  // Initialize file watcher with restart capability
  let watcher = null;
  function startWatcher(targetDir) {
    if (watcher) {
      try { watcher.stop(); } catch (e) {}
    }
    watcher = new AidlcWatcher(targetDir, ({ event, filePath }) => {
      console.log(`[FileChange] ${event}: ${path.basename(filePath)}`);
      const snapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: snapshot });
    });
    watcher.start();
  }
  startWatcher(workspaceRoot);

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    // Send immediate initial snapshot
    ws.send(JSON.stringify({ type: 'INIT', payload: getSnapshot() }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (e) {}
    });
  });

  // REST API Endpoints
  app.get('/api/status', (req, res) => {
    res.json(getSnapshot());
  });

  app.get('/api/workspaces', (req, res) => {
    res.json({
      current: workspaceRoot,
      recent: Array.from(recentWorkspaces)
    });
  });

  app.post('/api/workspace/switch', (req, res) => {
    try {
      const { path: newPath } = req.body;
      if (!newPath || !newPath.trim()) {
        return res.status(400).json({ error: 'Đường dẫn thư mục không được để trống' });
      }

      const resolved = path.resolve(newPath.trim());
      if (!fs.existsSync(resolved)) {
        return res.status(404).json({ error: `Thư mục không tồn tại trên máy: ${resolved}` });
      }

      workspaceRoot = resolved;
      parser = new AidlcParser(workspaceRoot);
      controller = new AidlcController(workspaceRoot);
      selectedIntentId = null;
      recentWorkspaces.add(workspaceRoot);

      startWatcher(workspaceRoot);

      console.log(`[WorkspaceSwitched] Now active: ${workspaceRoot}`);
      const updatedSnapshot = getSnapshot();
      broadcast({ type: 'INIT', payload: updatedSnapshot });

      res.json({ success: true, workspaceRoot, snapshot: updatedSnapshot });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/intents/select', (req, res) => {
    const { intentId } = req.body;
    selectedIntentId = intentId;
    const snapshot = getSnapshot();
    broadcast({ type: 'STATE_UPDATE', payload: snapshot });
    res.json({ success: true, selectedIntentId });
  });

  // Create New AI-DLC Intent / Task
  app.post('/api/intents/create', (req, res) => {
    try {
      const { description, scope = 'feature', label } = req.body;
      if (!description || !description.trim()) {
        return res.status(400).json({ error: 'Mô tả tác vụ không được để trống' });
      }

      // Generate a clean kebab-case label
      const cleanLabel = (label && label.trim()) 
        ? label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : description.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20).replace(/^-|-$/g, '') || 'new-task';

      const { execSync } = require('child_process');
      const cmd = `export PATH="$HOME/.local/bin:$PATH" && cd "${workspaceRoot}" && aidlc engine intent create --scope "${scope}" --arguments "${description.replace(/"/g, '\\"')}" --label "${cleanLabel}"`;

      let output = '';
      try {
        output = execSync(cmd, { encoding: 'utf-8', shell: '/bin/zsh' });
      } catch (err) {
        console.warn('CLI intent create note:', err.message);
        output = err.stdout || err.message;
      }

      const updatedSnapshot = getSnapshot();
      if (updatedSnapshot.intents.length > 0) {
        const matched = updatedSnapshot.intents.find(i => i.id.includes(cleanLabel)) || updatedSnapshot.intents[0];
        selectedIntentId = matched.id;
      }

      const finalSnapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: finalSnapshot });
      res.json({ success: true, selectedIntentId, output });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/artifact', (req, res) => {
    const { relPath, intentId } = req.query;
    const snapshot = getSnapshot();
    const current = snapshot.currentIntent;
    if (!current) {
      return res.status(404).json({ error: 'No active intent' });
    }

    const safePath = path.join(current.path, path.normalize(relPath));
    if (!safePath.startsWith(current.path) || !fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    try {
      const content = fs.readFileSync(safePath, 'utf-8');
      res.json({ name: path.basename(safePath), relPath, content });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Action: Approve Gate
  app.post('/api/action/approve', (req, res) => {
    try {
      const { feedback } = req.body;
      const snapshot = getSnapshot();
      if (!snapshot.currentIntent) {
        return res.status(400).json({ error: 'No active intent found' });
      }

      const result = controller.approveGate(snapshot.currentIntent.path, feedback);
      const updatedSnapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: updatedSnapshot });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Action: Request Changes (Feedback)
  app.post('/api/action/request-changes', (req, res) => {
    try {
      const { comments } = req.body;
      if (!comments) {
        return res.status(400).json({ error: 'Comments required' });
      }

      const snapshot = getSnapshot();
      if (!snapshot.currentIntent) {
        return res.status(400).json({ error: 'No active intent found' });
      }

      const result = controller.requestChanges(snapshot.currentIntent.path, comments);
      const updatedSnapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: updatedSnapshot });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Action: Advance Stage
  app.post('/api/action/advance', (req, res) => {
    try {
      const snapshot = getSnapshot();
      if (!snapshot.currentIntent) {
        return res.status(400).json({ error: 'No active intent found' });
      }

      const result = controller.advanceStage(snapshot.currentIntent.path);
      const updatedSnapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: updatedSnapshot });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Action: Jump Stage
  app.post('/api/action/jump-stage', (req, res) => {
    try {
      const { stage, phase } = req.body;
      const snapshot = getSnapshot();
      if (!snapshot.currentIntent) {
        return res.status(400).json({ error: 'No active intent found' });
      }

      const result = controller.jumpStage(snapshot.currentIntent.path, stage, phase);
      const updatedSnapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: updatedSnapshot });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Action: Toggle Task
  app.post('/api/action/toggle-task', (req, res) => {
    try {
      const { taskId } = req.body;
      const snapshot = getSnapshot();
      if (!snapshot.currentIntent) {
        return res.status(400).json({ error: 'No active intent found' });
      }

      const result = controller.toggleTask(snapshot.currentIntent.path, taskId);
      const updatedSnapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: updatedSnapshot });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Demo: Create Sample Structure
  app.post('/api/demo/create', (req, res) => {
    try {
      const result = createSampleAidlcStructure(workspaceRoot);
      const updatedSnapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: updatedSnapshot });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Demo: Simulate Agent Work Step
  app.post('/api/demo/simulate-step', (req, res) => {
    try {
      const snapshot = getSnapshot();
      if (!snapshot.currentIntent) {
        return res.status(400).json({ error: 'No active intent found' });
      }

      const steps = [
        { level: 'INFO', actor: 'Antigravity Coder', msg: 'Bắt đầu viết mã nguồn cho Payment Service: src/services/payment.service.ts' },
        { level: 'TOOL_CALL', actor: 'Antigravity Coder', msg: 'Thực thi lệnh: npm run test:unit -- payment.service.spec.ts' },
        { level: 'INFO', actor: 'Test Runner', msg: 'Kết quả test: 14 passed, 0 failed (Coverage: 92.4%)' },
        { level: 'DECISION', actor: 'Antigravity Reviewer', msg: 'Xác thực code đạt chuẩn Linting, không có security vulnerability nào' },
        { level: 'GATE', actor: 'AIDLC Engine', msg: 'Chuẩn bị hoàn thành Unit of Work: Chuyển sang review tiếp theo' },
      ];

      const randomStep = steps[Math.floor(Math.random() * steps.length)];
      controller.appendAuditLog(snapshot.currentIntent.path, randomStep.level, randomStep.actor, randomStep.msg);

      const updatedSnapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: updatedSnapshot });
      res.json({ success: true, step: randomStep });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve static files from React build if exists
  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  return { server, app, wss, watcher };
}

function startServer(port = 3300, workspaceRoot = process.cwd(), autoOpen = false) {
  const { server } = createServer({ workspaceRoot });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n======================================================`);
    console.log(`🚀 AI-DLC Interactive Dashboard is running!`);
    console.log(`📍 URL: ${url}`);
    console.log(`📂 Workspace: ${workspaceRoot}`);
    console.log(`======================================================\n`);

    if (autoOpen) {
      openBrowser(url);
    }
  });

  return server;
}

module.exports = {
  createServer,
  startServer
};

if (require.main === module) {
  const port = process.env.PORT || 3300;
  startServer(port, process.cwd(), false);
}
