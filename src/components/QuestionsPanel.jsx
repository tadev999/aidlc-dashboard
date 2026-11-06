import React, { useEffect, useState } from 'react';
import { Copy, Save, FileText } from 'lucide-react';

const copy = async (text, showToast) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast?.('Đã copy — dán vào chat của agent rồi Enter.');
  } catch {
    window.prompt('Copy nội dung này vào chat của agent:', text);
  }
};

export default function QuestionsPanel({ status, file, onSaveAnswers, onSend, loading, showToast }) {
  const [draft, setDraft] = useState({});
  const [savedPath, setSavedPath] = useState(null);

  useEffect(() => {
    if (!file) return;
    setDraft(Object.fromEntries(file.questions.map(q => [q.key, q.answer || ''])));
  }, [file?.relPath, file?.mtimeMs]);

  if (!file || file.questions.length === 0) {
    return <p className="p-6 text-sm text-slate-500">Stage hiện tại không có bộ câu hỏi.</p>;
  }

  const answered = file.questions.filter(q => (draft[q.key] || '').trim()).length;

  const toggleOption = (key, letter) => {
    setDraft(prev => {
      const parts = (prev[key] || '').split(',').map(s => s.trim()).filter(Boolean);
      const next = parts.includes(letter) ? parts.filter(p => p !== letter) : [...parts, letter];
      return { ...prev, [key]: next.join(', ') };
    });
  };

  const save = async () => {
    const ok = await onSaveAnswers(file.relPath, draft, file.mtimeMs);
    if (!ok) return;
    setSavedPath(file.relPath);
    if (status?.agent) {
      await onSend(`Tôi đã điền câu trả lời trong file ${file.relPath.split('/').pop()}, hãy đọc và tiếp tục.`);
    }
  };

  const chatLine = savedPath ? `Tôi đã điền câu trả lời trong file ${savedPath.split('/').pop()}, hãy đọc và tiếp tục.` : null;

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-slate-800 text-xs">
        <FileText className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-mono text-slate-300 truncate">{file.relPath}</span>
        <span className="text-slate-500">{answered}/{file.questions.length} đã trả lời</span>
        <button
          onClick={save}
          disabled={loading || status?.agent?.running}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {status?.agent ? 'Lưu & gửi cho agent' : 'Lưu vào file'}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
        {file.questions.map(q => {
          const picked = (draft[q.key] || '').split(',').map(s => s.trim());
          return (
            <div key={q.key} className="max-w-3xl">
              <p className="text-sm font-semibold text-slate-100">
                <span className="font-mono text-cyan-400 mr-1.5">{q.key}</span>{q.title}
              </p>
              {q.body && <p className="text-xs text-slate-400 mt-1">{q.body}</p>}
              {q.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {q.options.map(o => (
                    <button
                      key={o.key}
                      onClick={() => toggleOption(q.key, o.key)}
                      className={`px-2 py-1 text-xs rounded-md border text-left ${picked.includes(o.key)
                        ? 'bg-cyan-600/25 border-cyan-500 text-cyan-100'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                    >
                      <span className="font-mono mr-1">{o.key}.</span>{o.label}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={draft[q.key] || ''}
                onChange={e => setDraft(prev => ({ ...prev, [q.key]: e.target.value }))}
                placeholder="Chọn ở trên hoặc gõ câu trả lời (vd: A, C hoặc X: mô tả…)"
                className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          );
        })}

        {chatLine && !status?.agent && (
          <div className="max-w-3xl p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between gap-3">
            <span>Đã lưu. Gửi câu này trong chat để agent đọc file: “{chatLine}”</span>
            <button onClick={() => copy(chatLine, showToast)} className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
