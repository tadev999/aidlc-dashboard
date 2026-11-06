import React, { useState } from 'react';
import { PlusCircle, X, Sparkles, Layers, Send } from 'lucide-react';

export default function NewTaskModal({ isOpen, onClose, onSubmit, loading }) {
  const [description, setDescription] = useState('');
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState('feature');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit({ description, label, scope });
  };

  const handleDescChange = (val) => {
    setDescription(val);
    if (!label || label === description.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 15)) {
      setLabel(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 18).replace(/^-|-$/g, ''));
    }
  };

  const scopes = [
    { id: 'feature', name: 'Feature (30 stages)', desc: 'Vòng đời đầy đủ cho tính năng mới, có các trạm Approval Gate' },
    { id: 'classic', name: 'Classic (15 stages)', desc: 'Quy trình Inception và Construction cơ bản' },
    { id: 'express', name: 'Express (7 stages)', desc: 'Rút gọn nhanh từ đặc tả sang triển khai' },
    { id: 'poc', name: 'Proof of Concept (5 stages)', desc: 'Khảo sát và chứng minh tính khả thi nhanh' },
    { id: 'bugfix', name: 'Bugfix (6 stages)', desc: 'Sửa lỗi cụ thể có kèm kiểm thử hồi quy' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                Bắt Đầu Tác Vụ Mới (Start New Task)
              </h3>
              <p className="text-xs text-slate-400">
                Khởi tạo workflow AI-DLC có kiểm soát cho AI Agent
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
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Yêu cầu công việc cần AI thực hiện (User Request):
            </label>
            <textarea
              value={description}
              onChange={(e) => handleDescChange(e.target.value)}
              required
              rows={3}
              placeholder="Ví dụ: Xây dựng tính năng Checkout, Thêm cổng thanh toán MoMo, Tối ưu hóa Radar..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 placeholder-slate-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Định danh ngắn gọn (Kebab label):
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="checkout"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 transition"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Thư mục intent sẽ có tên dạng: <code className="text-slate-400">261105-{label || 'label'}</code>
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Kế hoạch thực thi (AI-DLC Scope):
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {scopes.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setScope(s.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    scope === s.id
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <span className="font-semibold block text-slate-200">{s.name}</span>
                    <span className="text-[11px] text-slate-400">{s.desc}</span>
                  </div>
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === s.id}
                    onChange={() => setScope(s.id)}
                    className="text-emerald-500 focus:ring-0"
                  />
                </div>
              ))}
            </div>
          </div>

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
              disabled={loading || !description.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Đang khởi tạo...' : 'Bắt Đầu Tác Vụ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
