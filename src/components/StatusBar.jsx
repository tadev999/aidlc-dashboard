import React from 'react';
import { GitBranch, Bot, ShieldCheck } from 'lucide-react';

export default function StatusBar({ status, persona }) {
  const state = status?.state;
  const agent = status?.agent;
  const approver = status?.approver;
  const mode = status?.capabilities?.controlMode === 'demo-file' ? 'demo' : 'engine';

  return (
    <footer className="h-6 shrink-0 flex items-center gap-4 px-3 text-[11px] bg-emerald-700 text-emerald-50">
      <span className="flex items-center gap-1">
        <GitBranch className="w-3 h-3" />
        {status?.currentIntent?.id || 'chưa có intent'}
      </span>
      {state && (
        <span className="capitalize">{state.phase} › {state.stage}</span>
      )}
      <span className="flex items-center gap-1">
        <Bot className="w-3 h-3" />
        {agent ? (agent.running ? 'agent đang chạy…' : 'agent rảnh') : 'chat ở CLI'}
      </span>
      <div className="flex-1" />
      {approver && (
        <span className="flex items-center gap-1" title={approver.error || ''}>
          <ShieldCheck className="w-3 h-3" />
          {approver.enrolled ? approver.name : 'approver chưa enroll'}
        </span>
      )}
      {persona === 'DEV' && agent?.sessionId && <span className="font-mono">session {agent.sessionId.slice(0, 8)}</span>}
      <span className="font-mono uppercase">{mode}</span>
    </footer>
  );
}
