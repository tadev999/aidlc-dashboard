import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header.jsx';
import PoView from './components/PoView.jsx';
import DevView from './components/DevView.jsx';
import GateApprovalModal from './components/GateApprovalModal.jsx';
import ArtifactModal from './components/ArtifactModal.jsx';
import NewTaskModal from './components/NewTaskModal.jsx';
import SwitchWorkspaceModal from './components/SwitchWorkspaceModal.jsx';
import { Sparkles, AlertCircle, RefreshCw, FolderPlus } from 'lucide-react';

export default function App() {
  const [persona, setPersona] = useState('PO'); // 'PO' or 'DEV'
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Modals state
  const [gateModal, setGateModal] = useState({ open: false, mode: 'APPROVE' });
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [switchWorkspaceModalOpen, setSwitchWorkspaceModalOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const wsRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Connect to WebSocket
  useEffect(() => {
    let ws;
    let timer;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INIT' || data.type === 'STATE_UPDATE') {
            setStatus(data.payload);
          }
        } catch (e) {
          console.error('Failed to parse websocket message', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 2 seconds
        timer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(timer);
      if (ws) ws.close();
    };
  }, []);

  // Fetch initial REST fallback
  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(() => {});
  }, []);

  // Handlers
  const handleOpenGateModal = (mode) => {
    setGateModal({ open: true, mode });
  };

  const handleGateSubmit = async (comments) => {
    setLoadingAction(true);
    try {
      const endpoint = gateModal.mode === 'APPROVE' ? '/api/action/approve' : '/api/action/request-changes';
      const body = gateModal.mode === 'APPROVE' ? { feedback: comments } : { comments };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        showToast(gateModal.mode === 'APPROVE' 
          ? '🎉 Đã phê duyệt Cổng thành công! Agent tiếp tục thực hiện.' 
          : '📝 Đã gửi yêu cầu chỉnh sửa đến Agent.');
        setGateModal({ open: false, mode: 'APPROVE' });
      } else {
        alert(data.error || 'Có lỗi xảy ra khi thực hiện hành động');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleJumpStage = async (stage, phase) => {
    if (!confirm(`Bạn có chắc muốn chuyển phiên làm việc sang stage "${stage}" không?`)) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/action/jump-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, phase })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã chuyển sang stage: ${stage}`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const res = await fetch('/api/action/toggle-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Task UoW-${taskId}: ${data.completed ? 'Hoàn thành' : 'Chưa xong'}`);
      }
    } catch (e) {}
  };

  const handleViewArtifact = async (relPath) => {
    try {
      const res = await fetch(`/api/artifact?relPath=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      if (data.content) {
        setSelectedArtifact(data);
      }
    } catch (err) {
      alert('Không thể tải artifact: ' + err.message);
    }
  };

  const handleCreateDemo = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/demo/create', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('✨ Đã khởi tạo cấu trúc AI-DLC mẫu thành công!');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdvanceStage = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/action/advance', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`⚡ Chuyển bước thành công: Sang stage ${data.currentStage}`);
      } else {
        alert(data.message || 'Không thể chuyển bước');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateNewTask = async ({ description, label, scope }) => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/intents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, label, scope })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 Đã khởi tạo tác vụ: ${data.selectedIntentId}!`);
        setNewTaskModalOpen(false);
      } else {
        alert(data.error || 'Có lỗi xảy ra khi tạo tác vụ');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSwitchWorkspace = async (newPath, callback) => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/workspace/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📂 Đã chuyển sang dự án: ${data.workspaceRoot.split('/').pop()}!`);
        setSwitchWorkspaceModalOpen(false);
      } else {
        if (callback) callback(data.error);
        else alert(data.error);
      }
    } catch (err) {
      if (callback) callback(err.message);
      else alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSimulateStep = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/demo/simulate-step', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`⚡ ${data.step.actor}: ${data.step.msg}`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSelectIntent = async (intentId) => {
    try {
      await fetch('/api/intents/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId })
      });
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-emerald-600 text-white font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs ring-1 ring-white/20">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        persona={persona}
        setPersona={setPersona}
        status={status}
        connected={connected}
        onSimulateStep={handleSimulateStep}
        onAdvanceStage={handleAdvanceStage}
        onCreateDemo={handleCreateDemo}
        onOpenNewTaskModal={() => setNewTaskModalOpen(true)}
        onOpenSwitchWorkspaceModal={() => setSwitchWorkspaceModalOpen(true)}
        onSelectIntent={handleSelectIntent}
        loadingAction={loadingAction}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8">
        {!status?.hasAidlc ? (
          /* Empty State if no aidlc folder */
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-2xl mx-auto my-12 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <FolderPlus className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Chưa Tìm Thấy Thư Mục AI-DLC Trong Workspace Này
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Thư mục <code className="text-emerald-400 bg-slate-950 px-2 py-0.5 rounded font-mono">aidlc/</code> chưa được khởi tạo trong dự án này. Bạn có thể nhấn nút dưới đây để tự động tạo một mẫu AI-DLC intent (gồm đầy đủ stages, gate và tasks) để trải nghiệm toàn bộ tính năng của Dashboard.
            </p>
            <button
              onClick={handleCreateDemo}
              disabled={loadingAction}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Khởi Tạo Mẫu Dự Án AI-DLC (Demo 1-Click)</span>
            </button>
          </div>
        ) : (
          /* Persona Dynamic View */
          <div>
            {persona === 'PO' ? (
              <PoView
                status={status}
                onOpenGateModal={handleOpenGateModal}
                onViewArtifact={handleViewArtifact}
                onToggleTask={handleToggleTask}
                onAdvanceStage={handleAdvanceStage}
                loadingAction={loadingAction}
              />
            ) : (
              <DevView
                status={status}
                onOpenGateModal={handleOpenGateModal}
                onJumpStage={handleJumpStage}
                onToggleTask={handleToggleTask}
                onViewArtifact={handleViewArtifact}
                onAdvanceStage={handleAdvanceStage}
                loadingAction={loadingAction}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>AI-DLC Interactive Dashboard • Built for AWS Labs & Google DeepMind Antigravity</p>
      </footer>

      {/* Modals */}
      <GateApprovalModal
        isOpen={gateModal.open}
        onClose={() => setGateModal({ open: false, mode: 'APPROVE' })}
        mode={gateModal.mode}
        onSubmit={handleGateSubmit}
        gateDetails={status?.state?.gate}
        loading={loadingAction}
      />

      <ArtifactModal
        isOpen={!!selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
        artifact={selectedArtifact}
      />

      <NewTaskModal
        isOpen={newTaskModalOpen}
        onClose={() => setNewTaskModalOpen(false)}
        onSubmit={handleCreateNewTask}
        loading={loadingAction}
      />

      <SwitchWorkspaceModal
        isOpen={switchWorkspaceModalOpen}
        onClose={() => setSwitchWorkspaceModalOpen(false)}
        currentWorkspace={status?.workspaceRoot}
        recentWorkspaces={status?.recentWorkspaces || []}
        onSwitch={handleSwitchWorkspace}
        loading={loadingAction}
      />
    </div>
  );
}
