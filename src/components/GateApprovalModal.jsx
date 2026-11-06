import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, X, Send } from 'lucide-react';

export default function GateApprovalModal({ 
  isOpen, 
  onClose, 
  mode, // 'APPROVE' or 'REQUEST_CHANGES'
  onSubmit, 
  gateDetails,
  loading 
}) {
  const [comments, setComments] = useState('');

  if (!isOpen) return null;

  const isApprove = mode === 'APPROVE';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(comments);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className={`p-5 flex items-center justify-between border-b ${
          isApprove ? 'bg-emerald-950/40 border-emerald-900/50' : 'bg-amber-950/40 border-amber-900/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isApprove ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isApprove ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                {isApprove ? 'Xác nhận Phê duyệt Cổng (Approval Gate)' : 'Yêu cầu Chỉnh sửa (Request Changes)'}
              </h3>
              <p className="text-xs text-slate-400">
                {gateDetails?.name || 'Human Verification Checkpoint'}
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
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-300">
            <p className="font-medium text-slate-200 mb-1">Mục tiêu phê duyệt:</p>
            <p className="text-slate-400 leading-relaxed">
              {gateDetails?.prompt || 'Agent đã hoàn tất các tiêu chí và đang chờ xác nhận từ bạn.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              {isApprove 
                ? 'Ghi chú phê duyệt bổ sung (Tùy chọn):' 
                : 'Nhận xét chi tiết cho AI Agent cần sửa lại gì (Bắt buộc):'}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              required={!isApprove}
              rows={4}
              placeholder={isApprove 
                ? 'Ví dụ: Thiết kế rất tốt, tiếp tục thực hiện Unit of Work 5...' 
                : 'Ví dụ: Cần bổ sung validation cho số điện thoại, đổi cấu trúc bảng payments...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 placeholder-slate-600 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
              disabled={loading || (!isApprove && !comments.trim())}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                isApprove 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' 
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isApprove ? 'Phê duyệt & Cho phép Chạy' : 'Gửi Yêu Cầu Chỉnh Sửa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
