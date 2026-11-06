const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

class AidlcController {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
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

  approveGate(intentPath, feedback = '') {
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

  requestChanges(intentPath, comments) {
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

  jumpStage(intentPath, targetStage, targetPhase) {
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
