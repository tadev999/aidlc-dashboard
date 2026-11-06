import React, { useMemo, useState } from 'react';
import { Activity, Search } from 'lucide-react';

// Business wording for PO; events not listed here are hidden in PO mode.
export const PO_LABELS = {
  WORKFLOW_STARTED: 'Bắt đầu workflow',
  STAGE_STARTED: 'Bắt đầu stage',
  STAGE_AWAITING_APPROVAL: 'Chờ phê duyệt',
  STAGE_COMPLETED: 'Hoàn thành stage',
  STAGE_REVISING: 'Đang sửa theo yêu cầu',
  STAGE_SKIPPED: 'Bỏ qua stage',
  GATE_APPROVED: 'Đã phê duyệt',
  GATE_REJECTED: 'Yêu cầu sửa',
  EXTERNAL_DECISION: 'Quyết định từ dashboard',
  DECISION_RECORDED: 'Agent hỏi',
  QUESTION_ANSWERED: 'Đã trả lời',
  HUMAN_TURN: 'Bạn nhắn',
  ARTIFACT_CREATED: 'Tạo tài liệu',
  ARTIFACT_UPDATED: 'Cập nhật tài liệu',
  WORKFLOW_COMPLETED: 'Hoàn thành workflow',
  ERROR_LOGGED: 'Lỗi'
};

const TONE = {
  GATE_APPROVED: 'text-emerald-300', STAGE_COMPLETED: 'text-emerald-300', WORKFLOW_COMPLETED: 'text-emerald-300',
  STAGE_AWAITING_APPROVAL: 'text-amber-300', GATE_REJECTED: 'text-amber-300', STAGE_REVISING: 'text-amber-300',
  DECISION_RECORDED: 'text-violet-300', HUMAN_TURN: 'text-sky-300', QUESTION_ANSWERED: 'text-sky-300',
  EXTERNAL_DECISION: 'text-sky-300', ERROR_LOGGED: 'text-rose-300'
};

const time = (ts) => {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export default function ActivityPanel({ status, persona, embedded = false }) {
  const [query, setQuery] = useState('');
  const logs = status?.auditLogs || [];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs
      .filter(log => persona === 'DEV' || PO_LABELS[log.level])
      .filter(log => !q || `${log.level} ${log.actor} ${log.message}`.toLowerCase().includes(q))
      .slice(0, 300);
  }, [logs, persona, query]);

  return (
    <aside className={embedded
      ? 'h-full flex flex-col min-h-0'
      : 'hidden lg:flex w-72 xl:w-80 shrink-0 border-l border-slate-800 bg-[#0d1117] flex-col min-h-0'}>
      <div className="px-3 py-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
        <Activity className="w-3.5 h-3.5" />
        <span>Hoạt động</span>
        <span className="ml-auto font-mono normal-case">{rows.length}</span>
      </div>
      <div className="px-2 py-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800">
          <Search className="w-3 h-3 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={persona === 'DEV' ? 'Lọc theo event, stage, nội dung…' : 'Tìm trong hoạt động…'}
            className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
          />
        </div>
      </div>
      <ol className="flex-1 min-h-0 overflow-y-auto py-1">
        {rows.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">Chưa có hoạt động.</li>}
        {rows.map((log, i) => (
          <li key={`${log.timestamp}-${i}`} className="px-3 py-1.5 border-b border-slate-900 hover:bg-slate-900/60">
            <div className="flex items-center gap-2 text-[11px]">
              <span className={`font-medium ${TONE[log.level] || 'text-slate-300'} ${persona === 'DEV' ? 'font-mono' : ''}`}>
                {persona === 'DEV' ? log.level : PO_LABELS[log.level]}
              </span>
              <span className="ml-auto font-mono text-slate-600">{time(log.timestamp)}</span>
            </div>
            {log.message && <p className="text-xs text-slate-400 break-words line-clamp-3">{log.message}</p>}
            {persona === 'DEV' && log.actor && log.actor !== 'AI-DLC' && (
              <p className="text-[10px] font-mono text-slate-600">{log.actor}</p>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}
