import React from 'react';
import { Layers, FolderGit2, GitBranch, PlusCircle, Briefcase, Code2, Sparkles } from 'lucide-react';

export default function TopBar({
  persona,
  setPersona,
  status,
  connected,
  onOpenNewTaskModal,
  onOpenSwitchWorkspaceModal,
  onSelectIntent,
  onCreateDemo,
  onSimulateStep,
  loadingAction
}) {
  const intents = status?.intents || [];
  const capabilities = status?.capabilities || {};
  const workspace = status?.workspaceRoot ? status.workspaceRoot.split('/').pop() : 'workspace';

  return (
    <header className="h-11 shrink-0 flex items-center gap-3 px-3 border-b border-slate-800 bg-[#0d1117] text-xs">
      <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
        <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center">
          <Layers className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-slate-100">AI-DLC</span>
      </div>

      <button
        onClick={onOpenSwitchWorkspaceModal}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300"
        title={status?.workspaceRoot}
      >
        <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-mono">{workspace}</span>
      </button>

      {intents.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800">
          <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={status?.currentIntent?.id || ''}
            onChange={(e) => onSelectIntent(e.target.value)}
            className="bg-transparent font-mono text-slate-200 focus:outline-none cursor-pointer max-w-[260px]"
          >
            {intents.map(i => (
              <option key={i.id} value={i.id} className="bg-slate-900">{i.id}</option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={onOpenNewTaskModal}
        disabled={loadingAction}
        className="flex items-center gap-1 px-2 py-1 rounded text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        <span>Intent mới</span>
      </button>

      {!status?.hasAidlc && (
        <button onClick={onCreateDemo} disabled={loadingAction} className="flex items-center gap-1 px-2 py-1 rounded text-amber-300 hover:bg-amber-500/10">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tạo demo</span>
        </button>
      )}
      {capabilities.canSimulate && (
        <button onClick={onSimulateStep} disabled={loadingAction} className="flex items-center gap-1 px-2 py-1 rounded text-amber-300 hover:bg-amber-500/10">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mô phỏng log</span>
        </button>
      )}

      <div className="flex-1" />

      <span className="flex items-center gap-1.5 text-slate-400" title={connected ? 'Đang đồng bộ trực tiếp' : 'Mất kết nối'}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
        {connected ? 'live' : 'offline'}
      </span>

      <div className="flex items-center rounded-md border border-slate-800 overflow-hidden">
        {[
          { id: 'PO', label: 'PO', icon: Briefcase },
          { id: 'DEV', label: 'DEV', icon: Code2 }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPersona(id)}
            className={`flex items-center gap-1 px-2.5 py-1 ${persona === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            title={id === 'PO' ? 'Chế độ PO: ngôn ngữ nghiệp vụ, chỉ hiện sự kiện quan trọng' : 'Chế độ DEV: sự kiện thô, state và session'}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}
