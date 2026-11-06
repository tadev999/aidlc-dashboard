const { spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');
const path = require('path');

const COPILOT_BIN = process.env.AIDLC_DASHBOARD_COPILOT_BIN || 'copilot';
// Non-interactive Copilot CLI denies any tool no rule allows; widen with AIDLC_DASHBOARD_COPILOT_ALLOW.
const DEFAULT_ALLOW = ['shell(aidlc:*)', 'write', 'read'];
const MAX_TRANSCRIPT = 300;

// Relays the person's message from the dashboard into the project's Copilot CLI
// session as a real prompt, so AI-DLC's prompt hook records it as their turn.
class AgentRelay {
  constructor({ broadcast }) {
    this.broadcast = broadcast;
    this.child = null;
    this.sessionId = null;
    this.transcript = [];
  }

  status() {
    return {
      running: this.child !== null,
      sessionId: this.sessionId,
      transcript: this.transcript
    };
  }

  push(entry) {
    this.transcript.push({ at: new Date().toISOString(), ...entry });
    if (this.transcript.length > MAX_TRANSCRIPT) this.transcript.splice(0, this.transcript.length - MAX_TRANSCRIPT);
  }

  send(workspaceRoot, text, knownSessionId) {
    const message = String(text || '').trim();
    if (!message) throw new Error('Tin nhắn trống');
    if (message.length > 8000) throw new Error('Tin nhắn quá dài (tối đa 8000 ký tự)');
    if (this.child) throw new Error('Agent đang chạy lượt trước. Đợi agent xong rồi gửi tiếp.');

    const resume = knownSessionId || this.sessionId;
    this.sessionId = resume || crypto.randomUUID();
    const allow = (process.env.AIDLC_DASHBOARD_COPILOT_ALLOW || DEFAULT_ALLOW.join(','))
      .split(',').map(s => s.trim()).filter(Boolean);
    const args = [
      '-C', workspaceRoot,
      '-p', message,
      ...(resume ? ['--resume', resume] : ['--session-id', this.sessionId]),
      '-s', '--stream', 'on',
      ...allow.flatMap(rule => ['--allow-tool', rule])
    ];
    const env = {
      ...process.env,
      PATH: [path.join(os.homedir(), '.local', 'bin'), process.env.PATH].filter(Boolean).join(path.delimiter)
    };

    const runId = crypto.randomUUID();
    this.push({ role: 'you', text: message, runId });
    this.push({ role: 'agent', text: '', runId });
    const reply = this.transcript[this.transcript.length - 1];
    this.broadcast({ type: 'AGENT_UPDATE', payload: this.status() });

    const child = spawn(COPILOT_BIN, args, { cwd: workspaceRoot, env, windowsHide: true });
    this.child = child;
    const onChunk = (chunk) => {
      reply.text += chunk.toString('utf8');
      this.broadcast({ type: 'AGENT_UPDATE', payload: this.status() });
    };
    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('error', (err) => {
      reply.text += `\n[Không chạy được Copilot CLI: ${err.message}]`;
    });
    child.on('close', (code) => {
      this.child = null;
      if (code !== 0) reply.text += `\n[Copilot CLI kết thúc với mã ${code}]`;
      this.broadcast({ type: 'AGENT_UPDATE', payload: this.status() });
      this.onDone?.();
    });
    return { started: true, runId, sessionId: this.sessionId };
  }

  stop() {
    if (this.child) this.child.kill('SIGINT');
  }
}

module.exports = { AgentRelay };
