import React from 'react';
import { CheckCircle2, Circle, CircleDot, PauseCircle, MinusCircle, RotateCcw, ChevronDown } from 'lucide-react';

const STAGE_ICON = {
  COMPLETED: { icon: CheckCircle2, cls: 'text-emerald-400' },
  ACTIVE: { icon: CircleDot, cls: 'text-cyan-400' },
  WAITING_APPROVAL: { icon: PauseCircle, cls: 'text-amber-400' },
  REVISING: { icon: RotateCcw, cls: 'text-orange-400' },
  SKIPPED: { icon: MinusCircle, cls: 'text-slate-600' },
  PENDING: { icon: Circle, cls: 'text-slate-600' }
};

function stageLabel(stage) {
  return stage.name && stage.name !== stage.id ? stage.name : stage.id.replace(/-/g, ' ');
}

export default function WorkflowSidebar({ status, persona, selectedStage, onSelectStage }) {
  const phases = status?.phases || [];
  const currentStage = status?.state?.stage;
  const allStages = phases.flatMap(p => p.stages);
  const done = allStages.filter(s => s.progress === 'COMPLETED' || s.progress === 'SKIPPED').length;

  return (
    <aside className="w-52 xl:w-60 shrink-0 border-r border-slate-800 bg-[#0d1117] hidden md:flex flex-col min-h-0">
      <div className="px-3 py-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
        <span>Workflow</span>
        {allStages.length > 0 && <span className="font-mono normal-case">{done}/{allStages.length}</span>}
      </div>
      {allStages.length > 0 && (
        <div className="h-0.5 bg-slate-800">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(done / allStages.length) * 100}%` }} />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {phases.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">Chưa có workflow.</p>}
        {phases.map(phase => {
          const shown = phase.stages.filter(s => persona === 'DEV' || s.progress !== 'SKIPPED');
          if (shown.length === 0) return null;
          return (
            <div key={phase.id} className="mb-1">
              <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                <ChevronDown className="w-3 h-3" />
                {phase.name}
              </div>
              {shown.map(stage => {
                const { icon: Icon, cls } = STAGE_ICON[stage.progress] || STAGE_ICON.PENDING;
                const isCurrent = stage.id === currentStage;
                const isSelected = stage.id === selectedStage;
                return (
                  <button
                    key={stage.id}
                    onClick={() => onSelectStage(isSelected ? null : stage.id)}
                    className={`w-full flex items-center gap-2 pl-5 pr-2 py-1 text-xs text-left ${isSelected
                      ? 'bg-slate-800 text-white'
                      : isCurrent ? 'bg-cyan-500/10 text-cyan-100' : 'text-slate-300 hover:bg-slate-800/60'}`}
                    title={persona === 'DEV' ? stage.id : stageLabel(stage)}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${cls}`} />
                    <span className={`truncate capitalize ${stage.progress === 'SKIPPED' ? 'line-through text-slate-600' : ''}`}>
                      {persona === 'DEV' ? stage.id : stageLabel(stage)}
                    </span>
                    {stage.progress === 'WAITING_APPROVAL' && (
                      <span className="ml-auto text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">GATE</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
