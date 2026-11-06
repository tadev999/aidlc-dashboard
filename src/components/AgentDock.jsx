import React from 'react';
import { Bot, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import AgentChat from './AgentChat.jsx';

// Agent conversation docked under the workflow, like an IDE's terminal panel.
export default function AgentDock({ agent, persona, open, onToggle, onSend, onStop }) {
  const last = [...(agent?.transcript || [])].reverse().find(m => m.role === 'agent' && m.text.trim());
  const preview = last ? last.text.trim().split('\n').filter(Boolean).pop() : null;

  return (
    <div className={`shrink-0 border-t border-slate-800 bg-[#0d1117] flex flex-col ${open ? 'h-[42vh] min-h-[220px]' : ''}`}>
      <button onClick={onToggle} className="h-8 shrink-0 flex items-center gap-2 px-3 text-xs text-slate-300 hover:bg-slate-800/60">
        <Bot className="w-3.5 h-3.5 text-violet-300" />
        <span className="font-semibold">Agent</span>
        {agent?.running && <span className="flex items-center gap-1 text-violet-300"><Loader2 className="w-3 h-3 animate-spin" /> đang chạy</span>}
        {!open && preview && <span className="truncate text-slate-500 max-w-[60%]">— {preview}</span>}
        <span className="ml-auto text-slate-500">{open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}</span>
      </button>
      {open && (
        <div className="flex-1 min-h-0 border-t border-slate-800">
          <AgentChat agent={agent} persona={persona} onSend={onSend} onStop={onStop} />
        </div>
      )}
    </div>
  );
}
