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
          if (!intent.isDirectory()) continue;
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
        updatedAt: fs.statSync(filePath).mtime
      };
    } catch (err) {
      console.error('Error parsing state file:', err);
      return null;
    }
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
          if (!trimmed || trimmed.startsWith('#')) continue;

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

    // Sort newest first
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
