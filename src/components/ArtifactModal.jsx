import React from 'react';
import { X, FileText, Download, Check } from 'lucide-react';

export default function ArtifactModal({ isOpen, onClose, artifact }) {
  if (!isOpen || !artifact) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-white text-sm">
                {artifact.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {artifact.relPath}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Viewer */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-slate-300 bg-slate-950 whitespace-pre-wrap selection:bg-emerald-500/30">
          {artifact.content}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>AI-DLC Generated Artifact</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
