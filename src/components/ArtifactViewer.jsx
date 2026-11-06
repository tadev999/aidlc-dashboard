import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';

// Light Markdown rendering: headings, list items, checkboxes and `[Answer]:` lines stand out.
function renderLine(line, i) {
  const heading = line.match(/^(#{1,4})\s+(.*)$/);
  if (heading) {
    const size = ['text-lg', 'text-base', 'text-sm', 'text-sm'][heading[1].length - 1];
    return <p key={i} className={`${size} font-semibold text-slate-100 mt-4 mb-1`}>{heading[2]}</p>;
  }
  if (/^\s*\[Answer\]:/.test(line)) {
    return <p key={i} className="font-mono text-xs text-emerald-300 bg-emerald-500/5 px-2 py-0.5 rounded">{line.trim()}</p>;
  }
  const box = line.match(/^(\s*)-\s+\[([ xX?R~S-])\]\s+(.*)$/);
  if (box) {
    return (
      <p key={i} className="text-sm text-slate-300" style={{ paddingLeft: `${box[1].length * 6 + 4}px` }}>
        <span className="font-mono text-slate-500 mr-1.5">[{box[2]}]</span>{box[3]}
      </p>
    );
  }
  if (/^\s*[-*]\s+/.test(line)) {
    return <p key={i} className="text-sm text-slate-300 pl-4 -indent-3">• {line.replace(/^\s*[-*]\s+/, '')}</p>;
  }
  if (/^\s*```/.test(line)) return <hr key={i} className="border-slate-800 my-1" />;
  if (!line.trim()) return <div key={i} className="h-2" />;
  return <p key={i} className="text-sm text-slate-300 whitespace-pre-wrap">{line}</p>;
}

export default function ArtifactViewer({ artifact, persona, onClose }) {
  const [showRaw, setShowRaw] = useState(false);
  if (!artifact) return null;
  const raw = showRaw || artifact.relPath.endsWith('.json');
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-slate-800 text-xs">
        <FileText className="w-3.5 h-3.5 text-sky-400" />
        <span className="font-mono text-slate-300 truncate">{persona === 'DEV' ? artifact.relPath : artifact.name}</span>
        <button
          onClick={() => setShowRaw(v => !v)}
          className="ml-auto px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200"
        >
          {showRaw ? 'Hiển thị đẹp' : 'Nguồn'}
        </button>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400" title="Đóng">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {raw
          ? <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">{artifact.content}</pre>
          : <div className="max-w-3xl">{artifact.content.split('\n').map(renderLine)}</div>}
      </div>
    </div>
  );
}
