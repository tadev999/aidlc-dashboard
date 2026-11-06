import React from 'react';
import { 
  Layers, 
  Cpu, 
  Briefcase, 
  Code2, 
  Radio, 
  Sparkles, 
  FolderGit2, 
  Play, 
  RefreshCw,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';

export default function Header({ 
  persona, 
  setPersona, 
  status, 
  connected, 
  onSimulateStep, 
  onAdvanceStage,
  onCreateDemo,
  onOpenNewTaskModal,
  onOpenSwitchWorkspaceModal,
  onSelectIntent,
  loadingAction
}) {
  const currentIntent = status?.currentIntent;
  const intents = status?.intents || [];
  const state = status?.state;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                AI-DLC Control Hub
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AWS Labs & Antigravity
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {connected ? 'Live Sync' : 'Reconnecting...'}
              </span>
              <span>•</span>
              <button
                onClick={onOpenSwitchWorkspaceModal}
                className="inline-flex items-center gap-1.5 font-mono hover:text-white px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/50 transition cursor-pointer text-slate-300"
                title="Nhấp để đổi sang dự án khác"
              >
                <FolderGit2 className="w-3 h-3 text-cyan-400" />
                <span className="truncate max-w-[150px] font-semibold text-slate-200">
                  {status?.workspaceRoot ? status.workspaceRoot.split('/').pop() : 'Workspace'}
                </span>
                <span className="text-[10px] text-cyan-400 font-bold">▾</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center: Intent Selector (if exists) */}
        {intents.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 px-3 rounded-lg border border-slate-800/80 text-xs">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Intent:</span>
            <select
              value={currentIntent?.id || ''}
              onChange={(e) => onSelectIntent(e.target.value)}
              className="bg-transparent text-emerald-300 font-mono font-medium focus:outline-none cursor-pointer pr-2"
            >
              {intents.map((i) => (
                <option key={i.id} value={i.id} className="bg-slate-900 text-slate-200">
                  {i.id} ({i.space})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right: Persona Toggle & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Start New Task Button */}
          <button
            onClick={onOpenNewTaskModal}
            disabled={loadingAction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Start New Task</span>
          </button>

          {/* Simulation & Next Stage buttons */}
          {status?.hasAidlc ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onAdvanceStage}
                disabled={loadingAction}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Cho phép AI tiến sang bước tiếp theo"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Next Stage</span>
              </button>

              <button
                onClick={onSimulateStep}
                disabled={loadingAction}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                title="Mô phỏng một bước log làm việc tiếp theo"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Log</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onCreateDemo}
              disabled={loadingAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tạo Demo AI-DLC</span>
            </button>
          )}

          {/* Persona Switcher (PO vs DEV) */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setPersona('PO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                persona === 'PO'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>👔 PO View</span>
            </button>

            <button
              onClick={() => setPersona('DEV')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                persona === 'DEV'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>💻 DEV View</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
