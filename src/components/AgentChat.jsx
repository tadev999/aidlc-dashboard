import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Square, Loader2, User } from 'lucide-react';

export default function AgentChat({ agent, persona, onSend, onStop }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const transcript = agent?.transcript || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [transcript.length, transcript[transcript.length - 1]?.text]);

  if (!agent) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Chế độ demo không có agent thật. Chạy dashboard trên một project đã cài AI-DLC để chat với agent.
      </p>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || agent.running) return;
    if (await onSend(text)) setText('');
  };

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {transcript.length === 0 && (
          <p className="text-sm text-slate-500">
            Tin nhắn ở đây được gửi vào phiên Copilot CLI của project, như khi bạn gõ trong CLI.
            {persona === 'PO' ? ' Bạn có thể trả lời câu hỏi, phê duyệt hoặc yêu cầu sửa bằng lời thường.' : ''}
          </p>
        )}
        {transcript.map((m, i) => {
          const isYou = m.role === 'you';
          return (
            <div key={`${m.runId}-${m.role}-${i}`} className="flex gap-2.5 max-w-4xl">
              <div className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center ${isYou ? 'bg-sky-600' : 'bg-violet-600'}`}>
                {isYou ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-500">{isYou ? 'Bạn' : 'Agent'}</p>
                <div className={`text-sm whitespace-pre-wrap break-words ${isYou ? 'text-slate-100' : 'text-slate-300'} ${!isYou && persona === 'DEV' ? 'font-mono text-xs' : ''}`}>
                  {m.text || (agent.running && !isYou ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" /> : '')}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-slate-800 p-3 flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
          rows={2}
          placeholder={agent.running ? 'Agent đang xử lý…' : 'Nhắn cho agent (Enter để gửi, Shift+Enter xuống dòng)'}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500 resize-none"
        />
        {agent.running ? (
          <button type="button" onClick={onStop} className="px-3 rounded-md bg-rose-600 hover:bg-rose-500 text-white" title="Dừng lượt hiện tại">
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button type="submit" disabled={!text.trim()} className="px-3 rounded-md bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40" title="Gửi">
            <Send className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
}
