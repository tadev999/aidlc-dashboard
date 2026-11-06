import React from 'react';
import { PauseCircle, MessageSquare, ThumbsUp, MessageSquareWarning, Send } from 'lucide-react';

// What the workflow is waiting on from the person, pinned above the work area.
export default function ActionBar({ status, onOpenGateModal, onSend, loadingAction }) {
  const pending = status?.pendingQuestion;
  const gateStage = status?.approver?.gate?.stage
    || (pending?.type === 'gate' ? pending.stage : null)
    || (status?.state?.status === 'WAITING_APPROVAL' ? status?.state?.stage : null);
  const agentBusy = status?.agent?.running;

  if (gateStage) {
    return (
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-amber-500/30 bg-amber-500/10">
        <PauseCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-100">Chờ phê duyệt: <span className="font-mono">{gateStage}</span></p>
          <p className="text-[11px] text-amber-200/70">Xem tài liệu và quyết định của stage trong Tổng quan trước khi duyệt.</p>
        </div>
        <button
          onClick={() => onOpenGateModal('REQUEST_CHANGES')}
          disabled={loadingAction || agentBusy || !status?.capabilities?.canRequestChanges}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-amber-200 border border-amber-500/40 hover:bg-amber-500/10 disabled:opacity-40"
        >
          <MessageSquareWarning className="w-3.5 h-3.5" />
          Yêu cầu sửa
        </button>
        <button
          onClick={() => onOpenGateModal('APPROVE')}
          disabled={loadingAction || agentBusy || !status?.capabilities?.canApprove}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          Phê duyệt
        </button>
      </div>
    );
  }

  if (!pending) return null;

  return (
    <div className="shrink-0 px-4 py-2.5 border-b border-violet-500/30 bg-violet-500/10">
      <div className="flex items-start gap-3">
        <MessageSquare className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-violet-300/80">Agent đang hỏi{pending.stage ? ` • ${pending.stage}` : ''}</p>
          <p className="text-sm text-slate-100 whitespace-pre-wrap">{pending.text}</p>
          {pending.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pending.options.map(option => (
                <button
                  key={option}
                  onClick={() => onSend(option)}
                  disabled={!status?.agent || agentBusy}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-slate-900 border border-slate-700 text-slate-200 hover:border-violet-400 disabled:opacity-40"
                  title={status?.agent ? 'Gửi lựa chọn này cho agent' : 'Trả lời trong chat của agent'}
                >
                  <Send className="w-3 h-3 text-violet-300" />
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
