const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

/**
 * Standard AI-DLC Lifecycle Phases and 33 Stages mapping
 */
const AIDLC_PHASES = [
  {
    id: 'inception',
    name: 'Inception (Khởi tạo & Đặc tả)',
    description: 'Xác định mục tiêu, phân tích yêu cầu kỹ thuật và thiết kế kiến trúc hệ thống',
    stages: [
      { id: 'intent-capture', name: 'Intent Capture', poName: 'Tiếp nhận Yêu cầu', isGate: false },
      { id: 'workspace-detection', name: 'Workspace Detection', poName: 'Khảo sát Mã nguồn Hiện tại', isGate: false },
      { id: 'requirements-analysis', name: 'Requirements Analysis', poName: 'Phân tích & Lên User Stories', isGate: true },
      { id: 'system-architecture', name: 'System Architecture', poName: 'Thiết kế Kiến trúc Hệ thống', isGate: true },
      { id: 'technical-design', name: 'Technical Design', poName: 'Thiết kế Chi tiết & API Specs', isGate: true },
      { id: 'inception-review-gate', name: 'Inception Review Gate', poName: 'Phê duyệt Tổng thể Inception', isGate: true },
    ]
  },
  {
    id: 'construction',
    name: 'Construction (Xây dựng & Kiểm thử)',
    description: 'Thực thi các Unit of Work, sinh mã nguồn, unit test và kiểm thử tích hợp',
    stages: [
      { id: 'unit-planning', name: 'Units of Work Planning', poName: 'Lập kế hoạch phân chia Tasks', isGate: false },
      { id: 'test-strategy', name: 'Test Strategy & Harness', poName: 'Chuẩn bị Kịch bản Kiểm thử', isGate: true },
      { id: 'unit-execution', name: 'Unit Execution & Coding', poName: 'Lập trình tính năng (Code)', isGate: false },
      { id: 'static-verification', name: 'Static Code Verification', poName: 'Kiểm tra Chất lượng & Lint', isGate: false },
      { id: 'integration-testing', name: 'Integration Testing', poName: 'Chạy Kiểm thử Tự động', isGate: false },
      { id: 'construction-review-gate', name: 'Construction Gate', poName: 'Nghiệm thu Mã nguồn & Tests', isGate: true },
    ]
  },
  {
    id: 'operations',
    name: 'Operations (Vận hành & Bàn giao)',
    description: 'Tạo tài liệu bàn giao, deploy script và hoàn thiện audit trail',
    stages: [
      { id: 'doc-generation', name: 'Documentation Generation', poName: 'Biên soạn Tài liệu Vận hành', isGate: false },
      { id: 'deployment-packaging', name: 'Deployment Packaging', poName: 'Đóng gói Triển khai (Build/CI)', isGate: false },
      { id: 'final-traceability-gate', name: 'Final Traceability Gate', poName: 'Phê duyệt Bàn giao Cuối cùng', isGate: true },
    ]
  }
];

class AidlcParser {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }

  getAidlcRoot() {
    return path.join(this.workspaceRoot, 'aidlc');
  }

  hasAidlcDirectory() {
    return fs.existsSync(this.getAidlcRoot());
  }

  /**
   * Find all spaces and intents
   */
  findIntents() {
    const aidlcRoot = this.getAidlcRoot();
    if (!fs.existsSync(aidlcRoot)) return [];

    const spacesDir = path.join(aidlcRoot, 'spaces');
    if (!fs.existsSync(spacesDir)) return [];

    const results = [];
    try {
      const spaces = fs.readdirSync(spacesDir, { withFileTypes: true });
      for (const space of spaces) {
        if (!space.isDirectory()) continue;
        const intentsDir = path.join(spacesDir, space.name, 'intents');
        if (!fs.existsSync(intentsDir)) continue;

        const intents = fs.readdirSync(intentsDir, { withFileTypes: true });
        for (const intent of intents) {
          if (!intent.isDirectory() || intent.name.startsWith('.')) continue;
          const intentPath = path.join(intentsDir, intent.name);
          const statePath = path.join(intentPath, 'aidlc-state.md');
          results.push({
            space: space.name,
            id: intent.name,
            path: intentPath,
            hasState: fs.existsSync(statePath),
            updatedAt: fs.existsSync(statePath) ? fs.statSync(statePath).mtime : fs.statSync(intentPath).mtime
          });
        }
      }
    } catch (err) {
      console.error('Error finding intents:', err);
    }

    return results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /**
   * Parse aidlc-state.md
   */
  parseStateFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(rawContent);
      const data = parsed.data || {};
      const content = parsed.content || '';

      // Extract details from markdown if not present in frontmatter
      const phaseMatch = content.match(/-\s*\*\*Lifecycle Phase\*\*:\s*([^\n\r]+)/i) ||
                         content.match(/\*\*Phase\*\*:\s*([^\n\r]+)/i) || 
                         content.match(/Phase:\s*([^\n\r]+)/i);
      const stageMatch = content.match(/-\s*\*\*Current Stage\*\*:\s*([^\n\r]+)/i) ||
                         content.match(/\*\*Stage\*\*:\s*([^\n\r]+)/i) || 
                         content.match(/Stage:\s*([^\n\r]+)/i);
      const statusMatch = content.match(/-\s*\*\*Status\*\*:\s*([^\n\r]+)/i) ||
                          content.match(/\*\*Status\*\*:\s*([^\n\r]+)/i) || 
                          content.match(/Status:\s*([^\n\r]+)/i);
      const agentMatch = content.match(/-\s*\*\*Active Agent\*\*:\s*([^\n\r]+)/i) ||
                         content.match(/\*\*Active Agent\*\*:\s*([^\n\r]+)/i) || 
                         content.match(/Active Agent:\s*([^\n\r]+)/i);

      const phase = (phaseMatch ? phaseMatch[1].trim() : (data.phase || 'inception')).toLowerCase();
      const stage = (stageMatch ? stageMatch[1].trim() : (data.stage || 'intent-capture')).toLowerCase();
      const rawStatus = (statusMatch ? statusMatch[1].trim() : (data.status || 'RUNNING')).toUpperCase();
      const activeAgent = agentMatch ? agentMatch[1].trim() : (data.active_agent || 'aidlc-product-agent');

      // Check if any stage checkbox is awaiting approval [?]
      const isAwaitingApprovalInChecklist = /-\s*\[\?\]/.test(content);

      // Normalize status: RUNNING, WAITING_APPROVAL, COMPLETED, FAILED
      let status = 'RUNNING';
      if (isAwaitingApprovalInChecklist || rawStatus.includes('WAIT') || rawStatus.includes('APPROVAL') || rawStatus.includes('GATE') || rawStatus.includes('PAUSE')) {
        status = 'WAITING_APPROVAL';
      } else if (rawStatus.includes('DONE') || rawStatus.includes('COMPLET')) {
        status = 'COMPLETED';
      } else if (rawStatus.includes('FAIL') || rawStatus.includes('ERROR')) {
        status = 'FAILED';
      }

      // Parse Units of Work (tasks)
      const uows = this.parseUnitsOfWork(content, data.units_of_work);

      // Parse Gate Details
      const gateDetails = this.parseGateDetails(content, data.gate);
      const stageGraph = this.parseStageGraph(content);

      return {
        raw: rawContent,
        frontmatter: data,
        phase,
        stage,
        status,
        activeAgent,
        activeIntent: data.intent || path.basename(path.dirname(filePath)),
        unitsOfWork: uows,
        gate: gateDetails,
        stageGraph,
        updatedAt: fs.statSync(filePath).mtime
      };
    } catch (err) {
      console.error('Error parsing state file:', err);
      return null;
    }
  }

  /**
   * Read the effective stage plan emitted by AI-DLC instead of assuming that
   * every intent uses the same stock list. The workflow can omit stages,
   * compile custom scopes, or add plugin stages.
   */
  parseStageGraph(content) {
    const phases = [];
    let current = null;
    const phasePattern = /^###\s+(?:\[[^\]]+\]\s+)?(.+?)\s+PHASE\s*$/i;
    const stagePattern = /^-\s*\[([ xX~?RrSs-])\]\s+([a-z0-9][a-z0-9-]*)\s*(?:[—-]\s*(.*?))?(?:\s+—\s+.*)?$/i;

    for (const line of content.split(/\r?\n/)) {
      const phaseMatch = line.match(phasePattern);
      if (phaseMatch) {
        current = {
          id: phaseMatch[1].trim().toLowerCase().replace(/\s+/g, '-'),
          name: phaseMatch[1].trim(),
          description: '',
          stages: []
        };
        phases.push(current);
        continue;
      }

      const stageMatch = line.match(stagePattern);
      if (!stageMatch || !current) continue;
      const slug = stageMatch[2].toLowerCase();
      const mark = stageMatch[1].toLowerCase();
      const label = stageMatch[3]?.trim();
      current.stages.push({
        id: slug,
        name: label && !/^(EXECUTE|SKIP)$/i.test(label) ? label : slug.replace(/-/g, ' '),
        poName: slug.replace(/-/g, ' '),
        isGate: mark === '?' || /approval|gate|handoff|review/.test(slug),
        progress: mark === 'x' ? 'COMPLETED' : mark === '-' || mark === '~' ? 'ACTIVE' : mark === '?' ? 'WAITING_APPROVAL' : mark === 'r' ? 'REVISING' : mark === 's' ? 'SKIPPED' : 'PENDING'
      });
    }

    return phases.length > 0 ? phases : null;
  }

  parseUnitsOfWork(content, frontmatterUows) {
    if (Array.isArray(frontmatterUows) && frontmatterUows.length > 0) {
      return frontmatterUows;
    }

    const uows = [];
    const taskRegex = /- \[([ xX~-])\]\s*(?:(?:UoW-)?(\d+):?)?\s*([^\n\r]+)/g;
    let match;
    let index = 1;

    while ((match = taskRegex.exec(content)) !== null) {
      const mark = match[1];
      const explicitId = match[2];
      const title = match[3].trim();

      let status = 'TODO';
      if (mark === 'x' || mark === 'X') status = 'DONE';
      else if (mark === '~' || mark === '-') status = 'IN_PROGRESS';

      uows.push({
        id: explicitId || `UoW-${index}`,
        title,
        status,
        completed: status === 'DONE'
      });
      index++;
    }

    return uows;
  }

  parseGateDetails(content, frontmatterGate) {
    if (frontmatterGate && typeof frontmatterGate === 'object') {
      return frontmatterGate;
    }

    const gatePromptMatch = content.match(/### Approval Gate Prompt\s*([\s\S]*?)(?=###|$)/i) ||
                            content.match(/\*\*Gate Prompt\*\*:\s*([^\n\r]+)/i);

    const gateSummaryMatch = content.match(/### Summary for Human Review\s*([\s\S]*?)(?=###|$)/i) ||
                             content.match(/### Gate Summary\s*([\s\S]*?)(?=###|$)/i);

    return {
      name: 'Human Approval Gate',
      prompt: gatePromptMatch ? gatePromptMatch[1].trim() : 'AI Agent đã hoàn thành bước hiện tại và đang chờ phê duyệt từ bạn để tiếp tục.',
      summary: gateSummaryMatch ? gateSummaryMatch[1].trim() : 'Tất cả các tiêu chí của giai đoạn hiện tại đã được kiểm tra và sẵn sàng nghiệm thu.',
      options: ['Approve & Proceed', 'Request Changes', 'Skip Stage']
    };
  }

  /**
   * Parse audit trail files
   */
  parseAuditLogs(intentPath) {
    const auditDir = path.join(intentPath, 'audit');
    if (!fs.existsSync(auditDir)) {
      return [];
    }

    const events = [];
    try {
      const files = fs.readdirSync(auditDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(auditDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('**') || /^-{3,}$/.test(trimmed)) continue;

          // Try parsing markdown list items with timestamps
          // e.g. - [2026-11-05T21:55:00Z] [INFO] [Agent] Decision description
          const match = trimmed.match(/^[-*]\s*\[(.*?)\]\s*(?:\[(.*?)\])?\s*(?:\[(.*?)\])?\s*(.*)$/);
          if (match) {
            const timestamp = match[1] || new Date().toISOString();
            const level = (match[2] || 'INFO').toUpperCase();
            const actor = match[3] || 'AI-Agent';
            const message = match[4] || '';

            events.push({
              timestamp,
              level,
              actor,
              message,
              raw: trimmed,
              file
            });
          } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            events.push({
              timestamp: new Date().toISOString(),
              level: 'INFO',
              actor: 'AI-DLC',
              message: trimmed.replace(/^[-*]\s*/, ''),
              raw: trimmed,
              file
            });
          }
        }
      }
    } catch (err) {
      console.error('Error reading audit logs:', err);
    }

    try {
      for (const row of this.parseEngineAudit(intentPath)) {
        const f = row.fields;
        events.push({
          timestamp: row.timestamp,
          level: row.event,
          actor: f.Approver || f.Agent || (row.event === 'HUMAN_TURN' ? 'Person' : 'AI-DLC'),
          message: [f.Stage, f.Decision || f.Details || f['User Input'] || f.Feedback || f.Reason]
            .filter(Boolean).join(' — '),
          stage: f.Stage || null,
          detail: f.Decision || f.Details || f['User Input'] || f.Feedback || f.Reason || f.File || null,
          raw: '',
          file: row.file
        });
      }
    } catch (err) {
      console.error('Error reading engine audit:', err);
    }

    // Sort newest first
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Engine audit rows: `## Heading` / `**Field**: value` blocks separated by `---`.
   */
  parseEngineAudit(intentPath) {
    const auditDir = path.join(intentPath, 'audit');
    if (!fs.existsSync(auditDir)) return [];
    const rows = [];
    for (const file of fs.readdirSync(auditDir)) {
      if (!file.endsWith('.md')) continue;
      const content = fs.readFileSync(path.join(auditDir, file), 'utf-8');
      content.split(/\n---\n/).forEach((block, pos) => {
        const fields = {};
        for (const line of block.split('\n')) {
          const m = line.match(/^\*\*([^*]+)\*\*:\s?(.*)$/);
          if (m && !(m[1] in fields)) fields[m[1]] = m[2].replace(/\\n/g, '\n');
        }
        if (fields.Event && fields.Timestamp) {
          rows.push({ event: fields.Event, timestamp: fields.Timestamp, fields, file, pos });
        }
      });
    }
    return rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.pos - b.pos);
  }

  /**
   * The newest question AI-DLC asked that no later row answered (approximate: the
   * engine's own ledger is authoritative, this is for display).
   */
  pendingQuestion(rows) {
    const asking = new Set(['DECISION_RECORDED', 'QUESTION_ASKED', 'STAGE_AWAITING_APPROVAL']);
    const closing = new Set([
      'QUESTION_ANSWERED', 'GATE_APPROVED', 'GATE_REJECTED', 'STAGE_COMPLETED', 'STAGE_REVISING',
      'SUMMARY_CONFIRMATION_RECORDED', 'PLAN_APPROVAL_RECORDED', 'VERIFICATION_COMMAND_RECORDED',
      'CONSTRUCTION_POLICY_RECORDED', 'STAGE_JUMPED', 'STAGE_SKIPPED'
    ]);
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (!asking.has(row.event) || !row.fields['Question Id']) continue;
      const answered = rows.slice(i + 1).some(later =>
        closing.has(later.event) && (!later.fields.Stage || later.fields.Stage === row.fields.Stage));
      if (answered) return null;
      const isGate = row.event === 'STAGE_AWAITING_APPROVAL';
      return {
        id: row.fields['Question Id'],
        type: row.fields['Question Type'] || (isGate ? 'gate' : 'question'),
        stage: row.fields.Stage || null,
        text: isGate ? `Phê duyệt stage "${row.fields.Stage}"` : (row.fields.Decision || row.fields.Question || ''),
        options: isGate
          ? ['Approve', 'Request Changes']
          : (row.fields.Options || '').split(/,(?=\s*\S)/).map(s => s.trim()).filter(Boolean),
        askedAt: row.timestamp
      };
    }
    return null;
  }

  /**
   * Every `<stage>-questions.md` in the intent, keyed by stage slug.
   */
  allQuestionsFiles(intentPath) {
    const result = {};
    const stack = [intentPath];
    while (stack.length > 0) {
      const dir = stack.pop();
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.name.startsWith('.') || item.name === 'audit') continue;
        const full = path.join(dir, item.name);
        const match = item.name.match(/^([a-z0-9-]+)-questions\.md$/);
        if (item.isDirectory()) stack.push(full);
        else if (match) result[match[1]] = this.parseQuestionsFile(intentPath, full);
      }
    }
    return result;
  }

  parseQuestionsFile(intentPath, filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const questions = [];
    let current = null;
    for (const line of content.split(/\r?\n/)) {
      const heading = line.match(/^##\s+(Q\d+)\.?\s*(.*)$/);
      if (heading) {
        current = { key: heading[1], title: heading[2].trim(), body: [], options: [], answer: '' };
        questions.push(current);
        continue;
      }
      if (/^##\s/.test(line)) {
        current = null;
        continue;
      }
      if (!current) continue;
      const answer = line.match(/^\s*\[Answer\]:\s*(.*)$/);
      const option = line.match(/^\s*-\s+([A-Z])\.\s+(.*)$/);
      if (answer) current.answer = answer[1].trim();
      else if (option) current.options.push({ key: option[1], label: option[2].trim() });
      else if (line.trim()) current.body.push(line.trim());
    }
    return {
      relPath: path.relative(intentPath, filePath),
      mtimeMs: fs.statSync(filePath).mtimeMs,
      questions: questions.map(q => ({ ...q, body: q.body.join(' ') }))
    };
  }

  /**
   * Read available artifacts in intent
   */
  getArtifacts(intentPath) {
    const artifacts = [];
    const scanDir = (dir, prefix = '') => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'audit' || item.name === 'node_modules') continue;
        const fullPath = path.join(dir, item.name);
        const relPath = path.join(prefix, item.name);
        if (item.isDirectory()) {
          scanDir(fullPath, relPath);
        } else if (item.name.endsWith('.md') || item.name.endsWith('.json') || item.name.endsWith('.yaml')) {
          artifacts.push({
            name: item.name,
            relPath,
            size: fs.statSync(fullPath).size,
            updatedAt: fs.statSync(fullPath).mtime
          });
        }
      }
    };

    scanDir(intentPath);
    return artifacts;
  }
}

module.exports = {
  AidlcParser,
  AIDLC_PHASES
};
