import React, { useState } from 'react';
import { FolderGit2, X, ArrowRight, Folder, Check, AlertCircle } from 'lucide-react';

export default function SwitchWorkspaceModal({ 
  isOpen, 
  onClose, 
  currentWorkspace, 
  recentWorkspaces = [], 
  onSwitch, 
  loading 
}) {
  const [targetPath, setTargetPath] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetPath.trim()) return;
    setErrorMsg('');
    onSwitch(targetPath.trim(), (err) => {
      if (err) setErrorMsg(err);
    });
  };

  const handleSelectRecent = (path) => {
    setTargetPath(path);
    setErrorMsg('');
    onSwitch(path, (err) => {
      if (err) setErrorMsg(err);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                Chuyển Đổi Dự Án (Switch Project Workspace)
              </h3>
              <p className="text-xs text-slate-400">
                Theo dõi và điều khiển một dự án AI-DLC khác trên máy
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Dự án đang theo dõi hiện tại:
            </label>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 truncate">
              {currentWorkspace || 'Chưa xác định'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nhập đường dẫn đến dự án mới:
            </label>
            <input
              type="text"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="/Users/taduongngoc/Projects/..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
            />
          </div>

          {/* Recent Workspaces */}
          {recentWorkspaces.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Các dự án gần đây:
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {recentWorkspaces.map((wsPath) => {
                  const isCurrent = wsPath === currentWorkspace;
                  const folderName = wsPath.split('/').pop() || wsPath;
                  return (
                    <div
                      key={wsPath}
                      onClick={() => !isCurrent && handleSelectRecent(wsPath)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                        isCurrent
                          ? 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-default'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800/50 hover:border-cyan-500/40 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Folder className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-slate-600' : 'text-cyan-400'}`} />
                        <div className="truncate">
                          <span className="font-semibold block text-slate-200">{folderName}</span>
                          <span className="text-[10px] font-mono text-slate-500 truncate block">{wsPath}</span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                          ACTIVE
                        </span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !targetPath.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-600/30 transition active:scale-95 disabled:opacity-50"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{loading ? 'Đang chuyển...' : 'Chuyển Dự Án'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
