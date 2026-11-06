const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { exec, spawnSync } = require('child_process');

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
const { AgentRelay } = require('./agentRelay');

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

function isLocalHost(value) {
  if (!value) return false;
  try {
    return LOCAL_HOSTNAMES.has(new URL(value.includes('://') ? value : `http://${value}`).hostname);
  } catch {
    return false;
  }
}

function createServer(options = {}) {
  let workspaceRoot = path.resolve(options.workspaceRoot || process.cwd());
  const app = express();
  const server = http.createServer(app);
  // Signing power lives behind this API, so only this machine's own pages may reach it.
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const wss = new WebSocket.Server({
    server,
    path: '/ws',
    verifyClient: ({ req }) => isLocalHost(req.headers.host) && (!req.headers.origin || isLocalHost(req.headers.origin))
  });

  app.use((req, res, next) => {
    if (!isLocalHost(req.headers.host)) return res.status(403).json({ error: 'Host not allowed' });
    if (req.headers.origin && !isLocalHost(req.headers.origin)) return res.status(403).json({ error: 'Origin not allowed' });
    if (req.method !== 'GET' && req.path.startsWith('/api')) {
      const sent = Buffer.from(String(req.headers['x-aidlc-dashboard-token'] || ''));
      const expected = Buffer.from(sessionToken);
      if (sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
        return res.status(403).json({ error: 'Missing or invalid dashboard session token' });
      }
    }
    next();
  });
  app.use(express.json());

  app.get('/api/session', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ token: sessionToken });
  });

  let parser = new AidlcParser(workspaceRoot);
  let controller = new AidlcController(workspaceRoot);
  let selectedIntentId = null;

  const recentWorkspaces = new Set([workspaceRoot]);

  // Broadcast to all WebSocket clients
  function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  const relay = new AgentRelay({ broadcast });
  relay.onDone = () => broadcast({ type: 'STATE_UPDATE', payload: getSnapshot() });

  // The chat the person last spoke in for this intent, as AI-DLC's prompt hook recorded it.
  function agentSessionId(intent) {
    if (!intent) return null;
    const turns = parser.parseEngineAudit(intent.path).filter(row => row.event === 'HUMAN_TURN' && row.fields.Session);
    const session = turns.length > 0 ? turns[turns.length - 1].fields.Session : null;
    return session && /^[0-9a-f-]{36}$/i.test(session) ? session : null;
  }

  function relayToAgent(text) {
    const intent = getSnapshot().currentIntent;
    return relay.send(workspaceRoot, text, agentSessionId(intent));
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
    let pendingQuestion = null;
    let questionsFile = null;
    let questionFiles = {};

    if (currentIntent) {
      const statePath = path.join(currentIntent.path, 'aidlc-state.md');
      state = parser.parseStateFile(statePath);
      auditLogs = parser.parseAuditLogs(currentIntent.path);
      artifacts = parser.getArtifacts(currentIntent.path);
      try {
        pendingQuestion = parser.pendingQuestion(parser.parseEngineAudit(currentIntent.path));
        questionFiles = parser.allQuestionsFiles(currentIntent.path);
        questionsFile = questionFiles[pendingQuestion?.stage || state?.stage] || null;
      } catch (err) {
        console.error('Error reading questions:', err);
      }
    }

    let approver = null;
    if (!controller.fileMode && currentIntent) {
      try {
        approver = controller.approverStatus();
      } catch (err) {
        approver = { error: err.message };
      }
    }
    const activeIntent = Boolean(approver?.intentDir && currentIntent &&
      fs.realpathSync(approver.intentDir) === fs.realpathSync(currentIntent.path));
    const canDecide = controller.fileMode
      ? Boolean(currentIntent)
      : Boolean(approver?.gate && activeIntent && (agentSessionId(currentIntent) || approver?.enrolled));

    return {
      workspaceRoot,
      hasAidlc,
      intents,
      currentIntent,
      state,
      auditLogs,
      artifacts,
      pendingQuestion,
      questionsFile,
      questionFiles,
      agent: controller.fileMode ? null : relay.status(),
      // Prefer the compiled graph recorded by AI-DLC. The stock list is only
      // a fallback for legacy/demo state files.
      phases: state?.stageGraph || AIDLC_PHASES,
      approver: approver && {
        enrolled: Boolean(approver.enrolled),
        name: approver.name || null,
        gate: approver.gate || null,
        activeIntent,
        error: approver.error || approver.keyError || null
      },
      capabilities: {
        controlMode: controller.fileMode ? 'demo-file' : 'aidlc-engine',
        canApprove: canDecide,
        canRequestChanges: canDecide,
        canJumpStage: Boolean(currentIntent),
        canEditTasks: controller.fileMode,
        canSimulate: controller.fileMode
      },
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
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        return res.status(404).json({ error: `Thư mục không tồn tại trên máy: ${resolved}` });
      }

      workspaceRoot = resolved;
      parser = new AidlcParser(workspaceRoot);
      controller = new AidlcController(workspaceRoot);
      relay.sessionId = null;
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

      if (!/^[a-z0-9-]+$/i.test(scope)) {
        return res.status(400).json({ error: 'Scope không hợp lệ' });
      }
      const result = spawnSync('aidlc', [
        'engine', 'intent', 'create', '--scope', scope,
        '--arguments', description.trim(), '--label', cleanLabel
      ], { cwd: workspaceRoot, encoding: 'utf8', timeout: 120000, windowsHide: true });
      if (result.error || result.status !== 0) {
        const detail = result.error?.message || result.stderr || result.stdout || 'unknown error';
        return res.status(500).json({ error: `Không tạo được intent qua AI-DLC engine: ${detail}` });
      }
      const output = (result.stdout || '').trim();

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

    const safePath = path.resolve(current.path, relPath || '');
    const intentRoot = path.resolve(current.path) + path.sep;
    if (!safePath.startsWith(intentRoot) || !fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    try {
      const content = fs.readFileSync(safePath, 'utf-8');
      res.json({ name: path.basename(safePath), relPath, content });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fill `[Answer]:` lines of the stage's questions file: the person's own file edit, as in "I'll edit the file".
  app.post('/api/questions/answer', (req, res) => {
    try {
      const { relPath, answers, expectedMtimeMs } = req.body || {};
      const current = getSnapshot().currentIntent;
      if (!current) return res.status(400).json({ error: 'No active intent found' });
      if (typeof relPath !== 'string' || !relPath.endsWith('-questions.md')) {
        return res.status(400).json({ error: 'Chỉ được ghi vào file *-questions.md' });
      }
      const intentRoot = path.resolve(current.path) + path.sep;
      const target = path.resolve(current.path, relPath);
      if (!target.startsWith(intentRoot) || !fs.existsSync(target) || fs.lstatSync(target).isSymbolicLink()) {
        return res.status(404).json({ error: 'Questions file not found' });
      }
      if (expectedMtimeMs != null && Math.abs(fs.statSync(target).mtimeMs - Number(expectedMtimeMs)) > 0.5) {
        return res.status(409).json({ error: 'File câu hỏi vừa được agent thay đổi. Tải lại rồi điền lại.' });
      }
      if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'answers required' });

      const lines = fs.readFileSync(target, 'utf-8').split('\n');
      let section = null;
      const written = [];
      for (let i = 0; i < lines.length; i++) {
        const heading = lines[i].match(/^##\s+(Q\d+)\b/);
        if (heading) { section = heading[1]; continue; }
        if (/^##\s/.test(lines[i])) { section = null; continue; }
        if (!section || !Object.hasOwn(answers, section) || !/^\s*\[Answer\]:/.test(lines[i])) continue;
        const text = String(answers[section]).replace(/\s+/g, ' ').trim().slice(0, 4000);
        lines[i] = text ? `[Answer]: ${text}` : '[Answer]:';
        written.push(section);
        section = null;
      }
      fs.writeFileSync(target, lines.join('\n'), 'utf-8');

      const snapshot = getSnapshot();
      broadcast({ type: 'STATE_UPDATE', payload: snapshot });
      res.json({ success: true, written, relPath });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/agent/send', (req, res) => {
    try {
      if (controller.fileMode) return res.status(400).json({ error: 'Demo mode không có agent thật' });
      res.json({ success: true, ...relayToAgent(req.body?.text) });
    } catch (err) {
      res.status(409).json({ error: err.message });
    }
  });

  app.post('/api/agent/stop', (req, res) => {
    relay.stop();
    res.json({ success: true });
  });

  // Action: Approve Gate
  app.post('/api/action/approve', (req, res) => {
    try {
      const { feedback, expectedMtimeMs } = req.body;
      const snapshot = getSnapshot();
      if (!snapshot.currentIntent) {
        return res.status(400).json({ error: 'No active intent found' });
      }

      const result = controller.fileMode || !agentSessionId(snapshot.currentIntent)
        ? controller.approveGate(snapshot.currentIntent.path, feedback, expectedMtimeMs)
        : { success: true, relayed: true, ...relayToAgent(feedback ? `Approve\n\nGhi chú: ${feedback}` : 'Approve') };
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
      const { comments, expectedMtimeMs } = req.body;
      if (!comments) {
        return res.status(400).json({ error: 'Comments required' });
      }

      const snapshot = getSnapshot();
      if (!snapshot.currentIntent) {
        return res.status(400).json({ error: 'No active intent found' });
      }

      const result = controller.fileMode || !agentSessionId(snapshot.currentIntent)
        ? controller.requestChanges(snapshot.currentIntent.path, comments, expectedMtimeMs)
        : { success: true, relayed: true, ...relayToAgent(`Request Changes: ${comments}`) };
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

      const result = controller.jumpStage(snapshot.currentIntent.path, stage, phase, req.body.expectedMtimeMs);
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

  server.listen(port, '127.0.0.1', () => {
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
