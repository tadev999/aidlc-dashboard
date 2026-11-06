import React from 'react';
import { PO_LABELS } from './ActivityPanel.jsx';
import {
  CheckCircle2, CircleDot, PauseCircle, RotateCcw, MinusCircle, Circle,
  FileText, ListChecks, ShieldCheck, Clock, Activity, ChevronRight
} from 'lucide-react';

const PROGRESS = {
  COMPLETED: { label: 'Hoàn thành', icon: CheckCircle2, text: 'text-emerald-300', dot: 'bg-emerald-500', ring: 'border-emerald-500/40 bg-emerald-500/10' },
  ACTIVE: { label: 'Đang làm', icon: CircleDot, text: 'text-cyan-300', dot: 'bg-cyan-400', ring: 'border-cyan-500/40 bg-cyan-500/10' },
  WAITING_APPROVAL: { label: 'Chờ phê duyệt', icon: PauseCircle, text: 'text-amber-300', dot: 'bg-amber-400', ring: 'border-amber-500/40 bg-amber-500/10' },
  REVISING: { label: 'Đang sửa', icon: RotateCcw, text: 'text-orange-300', dot: 'bg-orange-400', ring: 'border-orange-500/40 bg-orange-500/10' },
  SKIPPED: { label: 'Bỏ qua', icon: MinusCircle, text: 'text-slate-500', dot: 'bg-slate-700', ring: 'border-slate-700 bg-slate-800/40' },
  PENDING: { label: 'Chưa bắt đầu', icon: Circle, text: 'text-slate-400', dot: 'bg-slate-600', ring: 'border-slate-700 bg-slate-800/40' }
};

const DECISION_EVENTS = {
  GATE_APPROVED: { label: 'Đã phê duyệt', cls: 'text-emerald-300' },
  GATE_REJECTED: { label: 'Yêu cầu sửa', cls: 'text-amber-300' },
  EXTERNAL_DECISION: { label: 'Quyết định từ dashboard', cls: 'text-sky-300' },
  QUESTION_ANSWERED: { label: 'Đã trả lời', cls: 'text-sky-300' }
};

const prettify = (slug) => slug.replace(/-/g, ' ');

function since(ts) {
  if (!ts) return null;
  const minutes = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} giờ trước` : `${Math.round(hours / 24)} ngày trước`;
}

function Pipeline({ phases, currentStage, selectedStage, onSelectStage, persona }) {
  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {phases.map((phase, pi) => {
        const stages = phase.stages.filter(s => persona === 'DEV' || s.progress !== 'SKIPPED');
        if (stages.length === 0) return null;
        const done = stages.filter(s => s.progress === 'COMPLETED' || s.progress === 'SKIPPED').length;
        const hasCurrent = stages.some(s => s.id === currentStage);
        return (
          <React.Fragment key={phase.id}>
            {pi > 0 && <ChevronRight className="w-4 h-4 text-slate-700 self-center shrink-0" />}
            <div className={`shrink-0 rounded-lg border px-3 py-2 ${hasCurrent ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${hasCurrent ? 'text-cyan-200' : 'text-slate-400'}`}>{phase.name}</span>
                <span className="text-[10px] font-mono text-slate-500">{done}/{stages.length}</span>
              </div>
              <div className="flex items-center gap-1">
                {stages.map(stage => {
                  const p = PROGRESS[stage.progress] || PROGRESS.PENDING;
                  const isCurrent = stage.id === currentStage;
                  const isSelected = stage.id === selectedStage;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => onSelectStage(stage.id)}
                      title={`${prettify(stage.id)} — ${p.label}`}
                      className={`h-6 rounded flex items-center justify-center transition-all ${isSelected ? 'ring-2 ring-white/70' : ''} ${isCurrent ? 'px-2 gap-1 ' + p.ring + ' border' : 'w-6 hover:bg-slate-800'}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${p.dot} ${isCurrent && stage.progress === 'ACTIVE' ? 'animate-pulse' : ''}`} />
                      {isCurrent && <span className={`text-[11px] capitalize ${p.text}`}>{prettify(stage.id)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function WorkflowOverview({ status, persona, selectedStage, onSelectStage, onOpenArtifact, onOpenQuestions }) {
  const phases = status?.phases || [];
  const currentStage = status?.state?.stage;
  const stageId = selectedStage || currentStage;
  const phase = phases.find(p => p.stages.some(s => s.id === stageId));
  const stage = phase?.stages.find(s => s.id === stageId);
  const logs = status?.auditLogs || [];
  const stageLogs = logs.filter(l => l.stage === stageId && (persona === 'DEV' || PO_LABELS[l.level]));
  const artifacts = (status?.artifacts || [])
    .filter(a => a.relPath.split('/').includes(stageId) && !a.name.endsWith('-questions.md'))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const qfile = status?.questionFiles?.[stageId];
  const answered = qfile ? qfile.questions.filter(q => q.answer).length : 0;
  const started = [...stageLogs].reverse().find(l => l.level === 'STAGE_STARTED');
  const lastActivity = stageLogs[0];
  const decisions = stageLogs.filter(l => DECISION_EVENTS[l.level]).slice(0, 8);
  const p = PROGRESS[stage?.progress] || PROGRESS.PENDING;
  const Icon = p.icon;
  const isCurrent = stageId === currentStage;

  const allStages = phases.flatMap(ph => ph.stages);
  const done = allStages.filter(s => s.progress === 'COMPLETED' || s.progress === 'SKIPPED').length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-baseline gap-3 mb-3">
          <h2 className="text-sm font-semibold text-slate-100">Tiến trình</h2>
          <span className="text-xs text-slate-500">{done}/{allStages.length} stage đã xong</span>
          <div className="flex-1 h-1 rounded bg-slate-800 overflow-hidden self-center">
            <div className="h-full bg-emerald-500" style={{ width: `${allStages.length ? (done / allStages.length) * 100 : 0}%` }} />
          </div>
        </div>
        <Pipeline phases={phases} currentStage={currentStage} selectedStage={selectedStage} onSelectStage={onSelectStage} persona={persona} />
      </div>

      {!stage ? (
        <p className="p-5 text-sm text-slate-500">Chưa có stage nào đang chạy.</p>
      ) : (
        <div className="p-5 space-y-5 max-w-5xl">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${p.ring}`}>
              <Icon className={`w-5 h-5 ${p.text}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {phase?.name}{isCurrent ? ' • stage hiện tại' : ''}
              </p>
              <h3 className="text-lg font-semibold text-slate-100 capitalize">
                {persona === 'DEV' ? stage.id : prettify(stage.id)}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs">
                <span className={p.text}>{p.label}</span>
                {started && <span className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" /> bắt đầu {since(started.timestamp)}</span>}
                {lastActivity && <span className="flex items-center gap-1 text-slate-400"><Activity className="w-3 h-3" /> hoạt động cuối {since(lastActivity.timestamp)}</span>}
              </div>
            </div>
            {selectedStage && selectedStage !== currentStage && (
              <button onClick={() => onSelectStage(null)} className="text-xs text-cyan-300 hover:underline">Về stage hiện tại</button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className="rounded-lg border border-slate-800 bg-slate-900/40">
              <header className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 text-xs text-slate-400">
                <ListChecks className="w-3.5 h-3.5" /> Câu hỏi làm rõ
              </header>
              <div className="p-3">
                {qfile ? (
                  <>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="text-slate-200">{answered}/{qfile.questions.length} đã trả lời</span>
                      <div className="flex-1 h-1 rounded bg-slate-800 overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${(answered / qfile.questions.length) * 100}%` }} />
                      </div>
                    </div>
                    <button onClick={() => onOpenQuestions(stageId)} className="text-xs px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white">
                      {answered < qfile.questions.length ? 'Trả lời câu hỏi' : 'Xem câu trả lời'}
                    </button>
                  </>
                ) : <p className="text-xs text-slate-500">Stage này không có bộ câu hỏi.</p>}
              </div>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/40">
              <header className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 text-xs text-slate-400">
                <FileText className="w-3.5 h-3.5" /> Tài liệu đã tạo <span className="ml-auto font-mono">{artifacts.length}</span>
              </header>
              <div className="py-1 max-h-48 overflow-y-auto">
                {artifacts.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">Chưa có tài liệu.</p>}
                {artifacts.map(a => (
                  <button key={a.relPath} onClick={() => onOpenArtifact(a.relPath)} className="w-full flex items-center gap-2 px-3 py-1 text-xs text-left text-slate-300 hover:bg-slate-800/60" title={a.relPath}>
                    <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{persona === 'DEV' ? a.relPath : a.name}</span>
                    <span className="ml-auto text-[10px] text-slate-500 shrink-0">{since(a.updatedAt)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/40">
              <header className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Quyết định
              </header>
              <ol className="py-1">
                {decisions.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">Chưa có quyết định nào.</li>}
                {decisions.map((d, i) => (
                  <li key={`${d.timestamp}-${i}`} className="px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={DECISION_EVENTS[d.level].cls}>{persona === 'DEV' ? d.level : DECISION_EVENTS[d.level].label}</span>
                      {d.actor && d.actor !== 'AI-DLC' && <span className="text-slate-500">• {d.actor}</span>}
                      <span className="ml-auto text-[10px] text-slate-500">{since(d.timestamp)}</span>
                    </div>
                    {d.detail && <p className="text-slate-400 line-clamp-2">{d.detail}</p>}
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/40">
              <header className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 text-xs text-slate-400">
                <Activity className="w-3.5 h-3.5" /> Hoạt động của stage <span className="ml-auto font-mono">{stageLogs.length}</span>
              </header>
              <ol className="py-1 max-h-48 overflow-y-auto">
                {stageLogs.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">Chưa có hoạt động.</li>}
                {stageLogs.slice(0, 30).map((l, i) => (
                  <li key={`${l.timestamp}-${i}`} className="px-3 py-1 text-xs flex gap-2">
                    <span className={`shrink-0 ${persona === 'DEV' ? 'font-mono text-[10px]' : ''} text-slate-400`}>
                      {persona === 'DEV' ? l.level : PO_LABELS[l.level]}
                    </span>
                    <span className="truncate text-slate-500">{l.detail}</span>
                    <span className="ml-auto text-[10px] text-slate-600 shrink-0">{since(l.timestamp)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
