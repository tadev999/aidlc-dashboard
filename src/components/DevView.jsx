import React, { useState } from 'react';
import { 
  Terminal, 
  Cpu, 
  GitCommit, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Code, 
  FastForward, 
  Layers, 
  ShieldAlert,
  FileCode2,
  PlayCircle
} from 'lucide-react';

export default function DevView({ 
  status, 
  onOpenGateModal, 
  onJumpStage, 
  onToggleTask, 
  onViewArtifact,
  loadingAction 
}) {
  const state = status?.state;
  const auditLogs = status?.auditLogs || [];
  const phases = status?.phases || [];
  const uows = state?.unitsOfWork || [];
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [activeTab, setActiveTab] = useState('AUDIT'); // 'AUDIT' or 'RAW_STATE'

  const filteredLogs = auditLogs.filter(log => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 'DECISION':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'GATE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'APPROVAL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'TOOL_CALL':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Stage Matrix & State Machine Navigator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              AI-DLC State Machine & Stage Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Nhấp vào bất kỳ stage nào để điều hướng hoặc ép chuyển bước (Jump Stage)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Current: <strong className="text-emerald-400">{state?.stage}</strong>
            </span>
            <span className={`px-2.5 py-1 rounded border font-semibold ${
              state?.status === 'WAITING_APPROVAL' 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {state?.status || 'RUNNING'}
            </span>
          </div>
        </div>

        {/* Phase / Stage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {phases.map((phase) => (
            <div key={phase.id} className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>{phase.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{phase.stages.length} stages</span>
              </h4>

              <div className="space-y-2">
                {phase.stages.map((stg) => {
                  const isCurrent = state?.stage === stg.id;
                  return (
                    <div
                      key={stg.id}
                      onClick={() => onJumpStage(stg.id, phase.id)}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md shadow-emerald-500/10 font-semibold ring-1 ring-emerald-500/50'
                          : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                        <span className="truncate">{stg.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {stg.isGate && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                            GATE
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Interactive Gate Controls (If in Gate) */}
      {state?.status === 'WAITING_APPROVAL' && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Active Gate: {state?.gate?.name}</h4>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-mono">
              {state?.gate?.prompt}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => onOpenGateModal('APPROVE')}
              disabled={loadingAction}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition active:scale-95"
            >
              Approve Gate & Continue
            </button>
            <button
              onClick={() => onOpenGateModal('REQUEST_CHANGES')}
              disabled={loadingAction}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-slate-900 border border-amber-500/30 hover:bg-slate-800 transition active:scale-95"
            >
              Reject / Send Feedback
            </button>
          </div>
        </div>
      )}

      {/* 3. Bottom Split: Units of Work vs Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (5 cols): Units of Work Matrix */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-cyan-400" />
              Units of Work (Task Execution)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {uows.filter(t => t.completed).length}/{uows.length} Done
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {uows.map((task) => (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start justify-between gap-3 ${
                  task.completed
                    ? 'bg-emerald-950/20 border-emerald-900/30 text-slate-400'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-emerald-500 focus:ring-0 bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="font-mono text-[10px] text-slate-500 block">ID: {task.id}</span>
                    <span className={`font-medium ${task.completed ? 'line-through text-slate-500' : ''}`}>
                      {task.title}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                  task.completed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right (7 cols): Live Audit Logs & Raw State */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col">
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('AUDIT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'AUDIT'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Audit Trail Stream</span>
              </button>
              <button
                onClick={() => setActiveTab('RAW_STATE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'RAW_STATE'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>aidlc-state.md</span>
              </button>
            </div>

            {/* Filter */}
            {activeTab === 'AUDIT' && (
              <div className="flex items-center gap-1 text-[11px]">
                <Filter className="w-3 h-3 text-slate-500" />
                {['ALL', 'INFO', 'DECISION', 'GATE', 'TOOL_CALL'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setFilterLevel(lvl)}
                    className={`px-2 py-0.5 rounded font-mono ${
                      filterLevel === lvl 
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 min-h-[380px] max-h-[480px] overflow-y-auto font-mono text-xs">
            {activeTab === 'AUDIT' ? (
              <div className="space-y-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    Chưa có log audit sự kiện nào khớp bộ lọc.
                  </div>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mb-1">
                        <span className="text-slate-400 font-semibold">{log.actor}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getLevelBadgeClass(log.level)}`}>
                          {log.level}
                        </span>
                        <p className="text-slate-300 leading-relaxed break-words flex-1">
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 whitespace-pre-wrap text-[11px] leading-relaxed selection:bg-emerald-500/30">
                {state?.raw || 'Không tìm thấy nội dung aidlc-state.md'}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
