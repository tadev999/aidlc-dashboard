import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  Layers, 
  FileText, 
  ChevronRight, 
  ArrowRight,
  Send,
  Sparkles,
  HelpCircle,
  ThumbsUp,
  MessageSquareQuote
} from 'lucide-react';

export default function PoView({ 
  status, 
  onOpenGateModal, 
  onViewArtifact,
  onToggleTask,
  onAdvanceStage,
  loadingAction 
}) {
  const state = status?.state;
  const currentIntent = status?.currentIntent;
  const uows = state?.unitsOfWork || [];
  const artifacts = status?.artifacts || [];

  const completedCount = uows.filter(t => t.completed).length;
  const totalCount = uows.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isWaitingApproval = state?.status === 'WAITING_APPROVAL';

  // Phases mapping for PO
  const phases = [
    {
      id: 'inception',
      name: '1. Khởi Tạo & Thiết Kế',
      desc: 'Lên User Stories, kiến trúc hệ thống và API',
      active: state?.phase === 'inception',
      completed: state?.phase === 'construction' || state?.phase === 'operations',
    },
    {
      id: 'construction',
      name: '2. Lập Trình & Kiểm Thử',
      desc: 'Thực thi các Units of Work, sinh code & test tự động',
      active: state?.phase === 'construction',
      completed: state?.phase === 'operations',
    },
    {
      id: 'operations',
      name: '3. Nghiệm Thu & Vận Hành',
      desc: 'Báo cáo bàn giao, kiểm toán audit trail và deploy',
      active: state?.phase === 'operations',
      completed: false,
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Vòng đời */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Tiến Độ Tổng Thể</span>
            <span className="text-emerald-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-white tracking-tight">
              {completedCount} / {totalCount} Tasks
            </h4>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Trạng thái Gate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Trạng Thái Cổng Kiểm Soát</span>
            {isWaitingApproval ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="mt-3">
            <h4 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {isWaitingApproval ? (
                <span className="text-amber-400">Chờ PO Phê Duyệt</span>
              ) : (
                <span className="text-emerald-400">Đang Tiến Hành</span>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-2 truncate">
              {isWaitingApproval ? 'Cần phê duyệt để AI viết code' : 'AI đang xử lý tác vụ kế tiếp'}
            </p>
            {!isWaitingApproval && (
              <button
                onClick={onAdvanceStage}
                disabled={loadingAction}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <span>▶️ Chạy Bước Kế Tiếp</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Giai đoạn hiện tại */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <div className="text-slate-400 text-xs font-medium">
            Giai Đoạn Đang Thực Hiện
          </div>
          <div className="mt-3">
            <h4 className="text-xl font-bold text-white tracking-tight capitalize truncate">
              {state?.stage ? state.stage.replace(/-/g, ' ') : 'Khởi tạo'}
            </h4>
            <span className="inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              Phase: {state?.phase || 'Inception'}
            </span>
          </div>
        </div>

        {/* Card 4: AI Agent phụ trách */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <div className="text-slate-400 text-xs font-medium">
            Agent Phụ Trách
          </div>
          <div className="mt-3">
            <h4 className="text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>{state?.activeAgent || 'Antigravity Architect'}</span>
            </h4>
            <p className="text-xs text-slate-400 mt-2">
              Google DeepMind / AWS Engine
            </p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Approval Gate Card (Dành riêng cho PO quyết định) */}
      {isWaitingApproval && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border-2 border-amber-500/40 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                  <AlertCircle className="w-4 h-4" />
                  Cần Phê Duyệt Của Product Owner
                </span>
                <span className="text-xs text-amber-400 font-medium">
                  {state?.gate?.name || 'Technical Design Gate'}
                </span>
              </div>

              <h3 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
                {state?.gate?.prompt || 'AI Agent đã hoàn tất thiết kế hệ thống và cần sự đồng ý của bạn.'}
              </h3>

              {state?.gate?.summary && (
                <div className="bg-slate-950/80 p-4 rounded-xl border border-amber-500/20 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                  {state.gate.summary}
                </div>
              )}
            </div>

            {/* Decision Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[240px]">
              <button
                onClick={() => onOpenGateModal('APPROVE')}
                disabled={loadingAction}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-600/30 transition-all transform active:scale-95 cursor-pointer"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Phê Duyệt & Tiếp Tục</span>
              </button>

              <button
                onClick={() => onOpenGateModal('REQUEST_CHANGES')}
                disabled={loadingAction}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold text-amber-300 bg-slate-950/80 hover:bg-slate-900 border border-amber-500/30 transition transform active:scale-95 cursor-pointer"
              >
                <MessageSquareQuote className="w-4 h-4" />
                <span>Yêu Cầu Sửa Đổi (Feedback)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. High-level Lifecycle Stepper */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Tiến Trình Phát Triển Sản Phẩm (AI-DLC Workflow)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {phases.map((p, idx) => (
            <div
              key={p.id}
              className={`p-5 rounded-xl border transition-all ${
                p.active
                  ? 'bg-slate-800/80 border-emerald-500 shadow-lg shadow-emerald-500/10'
                  : p.completed
                  ? 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                  : 'bg-slate-950/20 border-slate-900 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  p.active 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : p.completed 
                    ? 'bg-slate-800 text-slate-300' 
                    : 'bg-slate-900 text-slate-600'
                }`}>
                  Pha {idx + 1}
                </span>
                {p.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : p.active ? (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                ) : null}
              </div>

              <h4 className={`font-bold text-base mt-3 ${p.active ? 'text-white' : 'text-slate-300'}`}>
                {p.name}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Feature Checklist & Deliverables Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Units of Work (Features) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-white text-base">Danh Sách Hạng Mục Thực Thi (Tasks / Features)</h3>
              <p className="text-xs text-slate-400">Các phần việc chi tiết được phân rã từ User Stories</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              {completedCount} / {totalCount} hoàn tất
            </span>
          </div>

          <div className="space-y-3">
            {uows.map((task, idx) => (
              <div
                key={task.id || idx}
                onClick={() => onToggleTask(task.id)}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all ${
                  task.completed
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-300 hover:bg-emerald-950/30'
                    : task.status === 'IN_PROGRESS'
                    ? 'bg-blue-950/20 border-blue-900/40 text-white hover:bg-blue-950/30'
                    : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                    task.completed 
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                      : task.status === 'IN_PROGRESS'
                      ? 'border-blue-400 text-blue-400'
                      : 'border-slate-700 text-transparent'
                  }`}>
                    {task.completed ? <CheckCircle2 className="w-4 h-4" /> : task.status === 'IN_PROGRESS' ? '•' : null}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                      {task.title}
                    </p>
                    <span className="text-[10px] font-mono text-slate-500">ID: {task.id}</span>
                  </div>
                </div>

                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                  task.completed 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : task.status === 'IN_PROGRESS' 
                    ? 'bg-blue-500/10 text-blue-400 animate-pulse' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {task.completed ? 'Hoàn thành' : task.status === 'IN_PROGRESS' ? 'Đang code' : 'Chờ làm'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Artifacts / Báo cáo tài liệu */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-white text-base mb-1">Tài Liệu Nghiệm Thu</h3>
          <p className="text-xs text-slate-400 mb-4">Các văn bản kỹ thuật & đặc tả do Agent soạn thảo</p>

          <div className="space-y-2.5">
            {artifacts.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3">Chưa có artifact nào được lưu trữ</p>
            ) : (
              artifacts.map((art) => (
                <div
                  key={art.relPath}
                  onClick={() => onViewArtifact(art.relPath)}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900 cursor-pointer transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate">
                      {art.name}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
