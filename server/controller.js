const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const matter = require('gray-matter');
const { spawnSync } = require('child_process');

const SIGNATURE_SCHEME = 'aidlc-external-decision/v1';
const AIDLC_BIN = process.env.AIDLC_BIN || 'aidlc';

class AidlcController {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    // Direct state-file mutation is intentionally opt-in and only exists for
    // the bundled demo. Real AI-DLC projects must be changed by the engine.
    this.fileMode = process.env.AIDLC_DASHBOARD_FILE_MODE === '1';
  }

  runEngine(args) {
    if (this.fileMode) return null;

    const result = spawnSync(AIDLC_BIN, args, {
      cwd: this.workspaceRoot,
      encoding: 'utf8',
      timeout: 120000,
      windowsHide: true
    });

    if (result.error) {
      throw new Error(`Không gọi được AI-DLC engine: ${result.error.message}. Hãy cài aidlc và chạy aidlc config trong project.`);
    }
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || '').trim();
      throw new Error(`AI-DLC engine từ chối thao tác${detail ? `: ${detail}` : ''}`);
    }

    return {
      success: true,
      mode: 'engine',
      output: (result.stdout || '').trim()
    };
  }

  engineJson(args) {
    const { output } = this.runEngine(args);
    const line = output.split('\n').reverse().find(l => l.trim().startsWith('{'));
    if (!line) throw new Error(`AI-DLC engine trả về kết quả không đọc được: ${output}`);
    return JSON.parse(line);
  }

  approverStatus() {
    return this.engineJson(['engine', 'approver', 'status']);
  }

  // Signs the decision with the enrolled approver key, records it, then lets the engine apply it.
  decideGate(intentPath, decision, feedback, expectedMtimeMs) {
    const current = this.readState(intentPath);
    this.assertUnchanged(current.stateFile, expectedMtimeMs);

    const status = this.approverStatus();
    if (!status.enrolled) {
      throw new Error('Chưa đăng ký approver cho project này. Người dùng chạy `aidlc engine approver enroll` trong terminal riêng (không phải terminal của IDE/agent).');
    }
    if (fs.realpathSync(status.intentDir) !== fs.realpathSync(intentPath)) {
      throw new Error(`Intent đang hiển thị không phải intent active của engine (${path.basename(status.intentDir)}). Hãy chuyển intent bằng \`aidlc intent switch <name>\` hoặc chọn đúng intent.`);
    }
    if (!status.gate) {
      throw new Error(`Không có gate nào đang chờ phê duyệt (stage hiện tại: ${status.currentStage || 'không rõ'}).`);
    }

    const key = JSON.parse(fs.readFileSync(status.keyFile, 'utf8'));
    const { stage, questionId } = status.gate;
    const nonce = crypto.randomBytes(18).toString('base64url');
    const issuedAt = new Date().toISOString();
    const approver = key.name;
    const text = (feedback || '').trim();
    const payload = [
      SIGNATURE_SCHEME, key.keyId, stage, questionId, decision, nonce, issuedAt, approver,
      crypto.createHash('sha256').update(text, 'utf8').digest('hex')
    ].join('\n');
    const signature = crypto.createHmac('sha256', key.secret).update(payload, 'utf8').digest('hex');

    const args = [
      'engine', 'approver', 'submit', '--stage', stage, '--question-id', questionId, '--decision', decision,
      '--nonce', nonce, '--issued-at', issuedAt, '--approver', approver, '--signature', signature
    ];
    let feedbackDir = null;
    try {
      if (text) {
        feedbackDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aidlc-dashboard-'));
        const feedbackFile = path.join(feedbackDir, 'feedback.txt');
        fs.writeFileSync(feedbackFile, text, { encoding: 'utf8', mode: 0o600 });
        args.push('--feedback-file', feedbackFile);
      }
      this.engineJson(args);
    } finally {
      if (feedbackDir) fs.rmSync(feedbackDir, { recursive: true, force: true });
    }

    const report = decision === 'approve'
      ? ['engine', 'orchestrate', 'report', '--stage', stage, '--result', 'approved', '--user-input', 'Approve']
      : ['engine', 'orchestrate', 'report', '--stage', stage, '--result', 'rejected', '--user-input', 'Request Changes', '--reason', text];
    const { output } = this.runEngine(report);

    const after = this.approverStatus();
    if (after.gate && after.gate.questionId === questionId) {
      throw new Error(`Engine đã ghi nhận quyết định đã ký nhưng chưa áp dụng cho gate "${stage}". Agent sẽ áp dụng ở lượt tiếp theo, hoặc xem chi tiết: ${output}`);
    }
    return { success: true, mode: 'engine', stage, decision, approver, currentStage: after.currentStage };
  }

  readState(intentPath) {
    const stateFile = path.join(intentPath, 'aidlc-state.md');
    if (!fs.existsSync(stateFile)) throw new Error('State file not found');
    return { stateFile, raw: fs.readFileSync(stateFile, 'utf8'), mtimeMs: fs.statSync(stateFile).mtimeMs };
  }

  assertUnchanged(stateFile, expectedMtimeMs) {
    if (expectedMtimeMs == null) return;
    const actual = fs.statSync(stateFile).mtimeMs;
    if (Math.abs(actual - Number(expectedMtimeMs)) > 0.5) {
      throw new Error('Workflow vừa thay đổi bởi agent hoặc người dùng khác. Vui lòng tải lại rồi thử lại.');
    }
  }

  appendAuditLog(intentPath, level, actor, message) {
    const auditDir = path.join(intentPath, 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    let targetFile = path.join(auditDir, 'audit-trail.md');
    const existing = fs.readdirSync(auditDir).filter(f => f.endsWith('.md'));
    if (existing.length > 0) {
      targetFile = path.join(auditDir, existing[0]);
    }

    const timestamp = new Date().toISOString();
    const entry = `\n- [${timestamp}] [${level}] [${actor}] ${message}`;

    fs.appendFileSync(targetFile, entry, 'utf-8');
    return { timestamp, level, actor, message };
  }

  approveGate(intentPath, feedback = '', expectedMtimeMs) {
    if (!this.fileMode) {
      return this.decideGate(intentPath, 'approve', feedback, expectedMtimeMs);
    }
    const current = this.readState(intentPath);
    this.assertUnchanged(current.stateFile, expectedMtimeMs);
    const stateFile = path.join(intentPath, 'aidlc-state.md');
    if (!fs.existsSync(stateFile)) {
      throw new Error('State file not found');
    }

    const raw = fs.readFileSync(stateFile, 'utf-8');
    const parsed = matter(raw);
    const data = parsed.data || {};
    let content = parsed.content || '';

    // Record audit event
    const commentNote = feedback ? ` (Nhận xét: "${feedback}")` : '';
    this.appendAuditLog(
      intentPath, 
      'APPROVAL', 
      'Human Reviewer (PO/Dev)', 
      `Đã phê duyệt Cổng giai đoạn '${data.stage || 'Inception Gate'}'. Cho phép chuyển tiếp sang giai đoạn Construction.${commentNote}`
    );

    // Transition to construction phase & next stage
    const nextPhase = 'construction';
    const nextStage = 'unit-execution';
    const nextStatus = 'RUNNING';

    data.phase = nextPhase;
    data.stage = nextStage;
    data.status = nextStatus;
    data.last_updated = new Date().toISOString();
    data.last_approval = {
      timestamp: new Date().toISOString(),
      by: 'Dashboard User',
      feedback: feedback || 'Approved without extra notes'
    };

    // Update markdown text
    content = content
      .replace(/(\*\*Phase\*\*:\s*)([^\n\r]+)/i, `$1${nextPhase}`)
      .replace(/(\*\*Stage\*\*:\s*)([^\n\r]+)/i, `$1${nextStage}`)
      .replace(/(\*\*Status\*\*:\s*)([^\n\r]+)/i, `$1${nextStatus}`)
      .replace(/\[-\]\s*UoW-4/g, '[x] UoW-4')
      .replace(/\[ \]\s*UoW-5/g, '[-] UoW-5');

    const updated = matter.stringify(content, data);
    fs.writeFileSync(stateFile, updated, 'utf-8');

    return { success: true, phase: nextPhase, stage: nextStage, status: nextStatus };
  }

  requestChanges(intentPath, comments, expectedMtimeMs) {
    if (!this.fileMode) {
      return this.decideGate(intentPath, 'reject', comments, expectedMtimeMs);
    }
    const current = this.readState(intentPath);
    this.assertUnchanged(current.stateFile, expectedMtimeMs);
    const stateFile = path.join(intentPath, 'aidlc-state.md');
    if (!fs.existsSync(stateFile)) {
      throw new Error('State file not found');
    }

    const raw = fs.readFileSync(stateFile, 'utf-8');
    const parsed = matter(raw);
    const data = parsed.data || {};
    let content = parsed.content || '';

    // Record audit
    this.appendAuditLog(
      intentPath,
      'CHANGE_REQUEST',
      'Human Reviewer (PO/Dev)',
      `Yêu cầu chỉnh sửa tại stage '${data.stage}': ${comments}`
    );

    // Keep state in Revision mode
    data.status = 'WAITING_APPROVAL';
    data.last_feedback = comments;
    data.last_updated = new Date().toISOString();

    content = content
      .replace(/(\*\*Status\*\*:\s*)([^\n\r]+)/i, `$1WAITING_APPROVAL (Revision Requested)`);

    const updated = matter.stringify(content, data);
    fs.writeFileSync(stateFile, updated, 'utf-8');

    return { success: true, status: 'WAITING_APPROVAL', feedback: comments };
  }

  jumpStage(intentPath, targetStage, targetPhase, expectedMtimeMs) {
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(targetStage || '')) throw new Error('Stage không hợp lệ');
    const current = this.readState(intentPath);
    this.assertUnchanged(current.stateFile, expectedMtimeMs);
    if (!this.fileMode) {
      return this.runEngine(['engine', 'orchestrate', 'next', '--stage', targetStage]);
    }
    const stateFile = path.join(intentPath, 'aidlc-state.md');
    if (!fs.existsSync(stateFile)) {
      throw new Error('State file not found');
    }

    const raw = fs.readFileSync(stateFile, 'utf-8');
    const parsed = matter(raw);
    const data = parsed.data || {};
    let content = parsed.content || '';

    this.appendAuditLog(
      intentPath,
      'MANUAL_OVERRIDE',
      'Dashboard User',
      `Điều hướng thủ công: Chuyển sang Phase '${targetPhase}', Stage '${targetStage}'`
    );

    data.stage = targetStage;
    data.phase = targetPhase;
    data.status = 'RUNNING';
    data.last_updated = new Date().toISOString();

    content = content
      .replace(/(\*\*Phase\*\*:\s*)([^\n\r]+)/i, `$1${targetPhase}`)
      .replace(/(\*\*Stage\*\*:\s*)([^\n\r]+)/i, `$1${targetStage}`)
      .replace(/(\*\*Status\*\*:\s*)([^\n\r]+)/i, `$1RUNNING`);

    const updated = matter.stringify(content, data);
    fs.writeFileSync(stateFile, updated, 'utf-8');

    return { success: true, stage: targetStage, phase: targetPhase };
  }

  toggleTask(intentPath, taskId) {
    if (!this.fileMode) {
      throw new Error('Task do AI-DLC engine quản lý; dashboard production chỉ hiển thị task và không tự sửa state.');
    }
    const stateFile = path.join(intentPath, 'aidlc-state.md');
    if (!fs.existsSync(stateFile)) {
      throw new Error('State file not found');
    }

    let content = fs.readFileSync(stateFile, 'utf-8');
    const regex = new RegExp(`- \\[([ xX~-])\\]\\s*(?:UoW-)?${taskId}\\b(.*)`, 'i');
    const match = content.match(regex);

    if (match) {
      const currentMark = match[1];
      const rest = match[2];
      const nextMark = (currentMark === 'x' || currentMark === 'X') ? ' ' : 'x';
      content = content.replace(regex, `- [${nextMark}] UoW-${taskId}${rest}`);
      fs.writeFileSync(stateFile, content, 'utf-8');

      this.appendAuditLog(
        intentPath,
        'TASK_UPDATE',
        'Dashboard User',
        `Cập nhật trạng thái task UoW-${taskId}: ${nextMark === 'x' ? 'Hoàn thành (Done)' : 'Chưa xong (Pending)'}`
      );
      return { success: true, taskId, completed: nextMark === 'x' };
    }

    return { success: false, message: 'Task not found in markdown' };
  }

  advanceStage(intentPath) {
    if (!this.fileMode) {
      return this.runEngine(['engine', 'orchestrate', 'next']);
    }
    const stateFile = path.join(intentPath, 'aidlc-state.md');
    if (!fs.existsSync(stateFile)) {
      throw new Error('State file not found');
    }

    let content = fs.readFileSync(stateFile, 'utf-8');

    // Find current active stage with [-]
    const activeMatch = content.match(/-\s*\[-\]\s*([a-zA-Z0-9_-]+)/);
    const currentActiveStage = activeMatch ? activeMatch[1] : null;

    // Find the next stage with [ ]
    const nextMatch = content.match(/-\s*\[\s*\]\s*([a-zA-Z0-9_-]+)/);
    const nextStage = nextMatch ? nextMatch[1] : null;

    if (!nextStage && !currentActiveStage) {
      return { success: false, message: 'Tất cả các stages đã hoàn thành' };
    }

    let updatedContent = content;
    let newStatus = 'RUNNING';
    let targetStage = nextStage;

    if (currentActiveStage) {
      // Mark current as completed
      updatedContent = updatedContent.replace(
        new RegExp(`-\\s*\\[-\\]\\s*${currentActiveStage}`),
        `- [x] ${currentActiveStage}`
      );
    }

    if (nextStage) {
      // Check if next stage is an approval gate
      const isGate = nextStage.includes('approval') || 
                     nextStage.includes('gate') || 
                     nextStage.includes('review') ||
                     nextStage === 'scope-definition' ||
                     nextStage === 'technical-design';

      const mark = isGate ? '[?]' : '[-]';
      newStatus = isGate ? 'WAITING_APPROVAL' : 'RUNNING';

      updatedContent = updatedContent.replace(
        new RegExp(`-\\s*\\[\\s*\\]\\s*${nextStage}`),
        `- ${mark} ${nextStage}`
      );

      // Update Current Stage & Status in markdown text
      updatedContent = updatedContent
        .replace(/(-\s*\*\*Current Stage\*\*:\s*)([^\n\r]+)/i, `$1${nextStage}`)
        .replace(/(-\s*\*\*Status\*\*:\s*)([^\n\r]+)/i, `$1${newStatus}`);
    } else {
      newStatus = 'COMPLETED';
      targetStage = 'All Completed';
    }

    fs.writeFileSync(stateFile, updatedContent, 'utf-8');

    this.appendAuditLog(
      intentPath,
      'STAGE_TRANSITION',
      'AIDLC Orchestrator',
      `Hoàn thành stage '${currentActiveStage || 'init'}'. Chuyển tiếp sang stage '${targetStage}' (Status: ${newStatus})`
    );

    return {
      success: true,
      completedStage: currentActiveStage,
      currentStage: targetStage,
      status: newStatus
    };
  }
}

module.exports = {
  AidlcController
};
