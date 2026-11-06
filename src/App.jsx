import React, { useState, useEffect, useRef } from 'react';
import TopBar from './components/TopBar.jsx';
import WorkflowSidebar from './components/WorkflowSidebar.jsx';
import ActionBar from './components/ActionBar.jsx';
import ActivityPanel from './components/ActivityPanel.jsx';
import StatusBar from './components/StatusBar.jsx';
import ArtifactViewer from './components/ArtifactViewer.jsx';
import GateApprovalModal from './components/GateApprovalModal.jsx';
import NewTaskModal from './components/NewTaskModal.jsx';
import SwitchWorkspaceModal from './components/SwitchWorkspaceModal.jsx';
import QuestionsPanel from './components/QuestionsPanel.jsx';
import AgentDock from './components/AgentDock.jsx';
import WorkflowOverview from './components/WorkflowOverview.jsx';
import { LayoutDashboard, ListChecks, FileText, FileCode2, FolderPlus, Sparkles, Activity } from 'lucide-react';

let tokenPromise = null;
const dashboardToken = () => {
  tokenPromise ??= fetch('/api/session').then(res => res.json()).then(data => data.token);
  return tokenPromise;
};

async function postJson(url, body = {}) {
  const token = await dashboardToken();
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-AIDLC-Dashboard-Token': token },
    body: JSON.stringify(body)
  });
}

export default function App() {
  const [persona, setPersonaState] = useState(() => localStorage.getItem('aidlc.persona') || 'PO');
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [tab, setTab] = useState('overview');
  const [selectedStage, setSelectedStage] = useState(null);
  const [questionsStage, setQuestionsStage] = useState(null);
  const [openArtifact, setOpenArtifact] = useState(null);
  const [dockOpen, setDockOpenState] = useState(() => localStorage.getItem('aidlc.dock') === 'open');
  const seenRun = useRef(null);

  const setDockOpen = (value) => {
    localStorage.setItem('aidlc.dock', value ? 'open' : 'closed');
    setDockOpenState(value);
  };

  const [gateModal, setGateModal] = useState({ open: false, mode: 'APPROVE' });
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [switchWorkspaceModalOpen, setSwitchWorkspaceModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const setPersona = (value) => {
    localStorage.setItem('aidlc.persona', value);
    setPersonaState(value);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let ws;
    let timer;
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      ws.onopen = () => setConnected(true);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INIT' || data.type === 'STATE_UPDATE') {
            setStatus(data.payload);
          } else if (data.type === 'AGENT_UPDATE') {
            setStatus(prev => (prev ? { ...prev, agent: data.payload } : prev));
          }
        } catch (e) {
          console.error('Failed to parse websocket message', e);
        }
      };
      ws.onclose = () => {
        setConnected(false);
        timer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      clearTimeout(timer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    fetch('/api/status').then(res => res.json()).then(setStatus).catch(() => {});
  }, []);

  // Open the agent panel when a new agent run starts or the agent asks something.
  const running = Boolean(status?.agent?.running);
  const askingId = status?.pendingQuestion?.type !== 'gate' ? status?.pendingQuestion?.id : null;
  useEffect(() => {
    const key = `${running}:${askingId}`;
    if (seenRun.current !== null && seenRun.current !== key && (running || askingId)) setDockOpen(true);
    seenRun.current = key;
  }, [running, askingId]);

  const handleGateSubmit = async (comments) => {
    setLoadingAction(true);
    try {
      const endpoint = gateModal.mode === 'APPROVE' ? '/api/action/approve' : '/api/action/request-changes';
      const expectedMtimeMs = status?.state?.updatedAt ? new Date(status.state.updatedAt).getTime() : undefined;
      const body = gateModal.mode === 'APPROVE' ? { feedback: comments, expectedMtimeMs } : { comments, expectedMtimeMs };
      const data = await (await postJson(endpoint, body)).json();
      if (data.success) {
        showToast(data.relayed
          ? 'Đã gửi quyết định cho agent.'
          : gateModal.mode === 'APPROVE' ? 'Đã phê duyệt gate.' : 'Đã gửi yêu cầu chỉnh sửa.');
        setGateModal({ open: false, mode: 'APPROVE' });
        if (data.relayed) setDockOpen(true);
      } else {
        alert(data.error || 'Có lỗi xảy ra khi thực hiện hành động');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleOpenArtifact = async (relPath) => {
    try {
      const data = await (await fetch(`/api/artifact?relPath=${encodeURIComponent(relPath)}`)).json();
      if (data.content !== undefined) {
        setOpenArtifact(data);
        setTab('doc');
      } else {
        alert(data.error || 'Không mở được tài liệu');
      }
    } catch (err) {
      alert('Không thể tải tài liệu: ' + err.message);
    }
  };

  const runAction = async (url, body, onSuccess) => {
    setLoadingAction(true);
    try {
      const data = await (await postJson(url, body)).json();
      if (data.success) onSuccess?.(data);
      else alert(data.error || data.message || 'Có lỗi xảy ra');
      return data;
    } catch (err) {
      alert(err.message);
      return null;
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateDemo = () => runAction('/api/demo/create', {}, () => showToast('Đã tạo dữ liệu AI-DLC mẫu.'));
  const handleSimulateStep = () => runAction('/api/demo/simulate-step', {}, d => showToast(`${d.step.actor}: ${d.step.msg}`));
  const handleCreateNewTask = ({ description, label, scope }) =>
    runAction('/api/intents/create', { description, label, scope }, d => {
      showToast(`Đã tạo intent ${d.selectedIntentId}`);
      setNewTaskModalOpen(false);
    });

  const handleSwitchWorkspace = async (newPath, callback) => {
    setLoadingAction(true);
    try {
      const data = await (await postJson('/api/workspace/switch', { path: newPath })).json();
      if (data.success) {
        showToast(`Đã chuyển sang ${data.workspaceRoot.split('/').pop()}`);
        setSwitchWorkspaceModalOpen(false);
        setOpenArtifact(null);
        setSelectedStage(null);
      } else if (callback) callback(data.error);
      else alert(data.error);
    } catch (err) {
      if (callback) callback(err.message);
      else alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveAnswers = async (relPath, answers, expectedMtimeMs) => {
    const data = await runAction('/api/questions/answer', { relPath, answers, expectedMtimeMs },
      d => showToast(`Đã lưu ${d.written.length} câu trả lời.`));
    return Boolean(data?.success);
  };

  const handleSendToAgent = async (text) => {
    try {
      const data = await (await postJson('/api/agent/send', { text })).json();
      if (!data.success) {
        alert(data.error || 'Không gửi được cho agent');
        return false;
      }
      setDockOpen(true);
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  };

  const handleStopAgent = () => postJson('/api/agent/stop');

  const handleSelectIntent = async (intentId) => {
    setOpenArtifact(null);
    setSelectedStage(null);
    await postJson('/api/intents/select', { intentId }).catch(() => {});
  };

  const handleOpenQuestions = (stage) => {
    setQuestionsStage(stage);
    setTab('questions');
  };

  const qStage = questionsStage || status?.pendingQuestion?.stage || status?.state?.stage;
  const qFile = status?.questionFiles?.[qStage] || null;
  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    ...(qFile ? [{
      id: 'questions',
      label: `Câu hỏi • ${qStage}`,
      icon: ListChecks,
      badge: `${qFile.questions.filter(q => q.answer).length}/${qFile.questions.length}`
    }] : []),
    ...(openArtifact ? [{ id: 'doc', label: openArtifact.name, icon: FileText }] : []),
    ...(persona === 'DEV' ? [{ id: 'state', label: 'aidlc-state.md', icon: FileCode2 }] : []),
    { id: 'activity', label: 'Hoạt động', icon: Activity, narrowOnly: true }
  ];
  const activeTab = tabs.some(t => t.id === tab) ? tab : 'overview';

  return (
    <div className="h-screen flex flex-col bg-[#0b0e13] text-slate-100 font-sans overflow-hidden">
      <TopBar
        persona={persona}
        setPersona={setPersona}
        status={status}
        connected={connected}
        onOpenNewTaskModal={() => setNewTaskModalOpen(true)}
        onOpenSwitchWorkspaceModal={() => setSwitchWorkspaceModalOpen(true)}
        onSelectIntent={handleSelectIntent}
        onCreateDemo={handleCreateDemo}
        onSimulateStep={handleSimulateStep}
        loadingAction={loadingAction}
      />

      {!status?.hasAidlc ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-lg text-center">
            <FolderPlus className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Chưa có thư mục aidlc/ trong workspace này</h2>
            <p className="text-sm text-slate-400 mb-6">
              Cài AI-DLC vào project (<code className="font-mono text-emerald-300">aidlc config</code>) rồi bắt đầu một intent,
              hoặc đổi workspace ở thanh trên. Có thể tạo dữ liệu mẫu để xem thử.
            </p>
            <button
              onClick={handleCreateDemo}
              disabled={loadingAction}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-emerald-600 hover:bg-emerald-500"
            >
              <Sparkles className="w-4 h-4" /> Tạo dữ liệu mẫu
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <WorkflowSidebar
            status={status}
            persona={persona}
            selectedStage={selectedStage}
            onSelectStage={(stage) => { setSelectedStage(stage); setTab('overview'); }}
          />

          <main className="flex-1 min-w-0 flex flex-col min-h-0">
            <ActionBar
              status={status}
              onOpenGateModal={(mode) => setGateModal({ open: true, mode })}
              onSend={handleSendToAgent}
              loadingAction={loadingAction}
            />

            <div className="shrink-0 flex items-end gap-px px-2 pt-1.5 border-b border-slate-800 bg-[#0d1117]">
              {tabs.map(({ id, label, icon: Icon, badge, narrowOnly }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`${narrowOnly ? 'lg:hidden ' : ''}flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md border-x border-t max-w-[220px] ${activeTab === id
                    ? 'bg-[#0b0e13] border-slate-800 text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                  {badge && <span className="text-[10px] px-1 rounded bg-slate-700 text-slate-200">{badge}</span>}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0">
              {activeTab === 'overview' && (
                <WorkflowOverview
                  status={status}
                  persona={persona}
                  selectedStage={selectedStage}
                  onSelectStage={setSelectedStage}
                  onOpenArtifact={handleOpenArtifact}
                  onOpenQuestions={handleOpenQuestions}
                />
              )}
              {activeTab === 'questions' && (
                <QuestionsPanel
                  key={qFile?.relPath}
                  status={status}
                  file={qFile}
                  onSaveAnswers={handleSaveAnswers}
                  onSend={handleSendToAgent}
                  loading={loadingAction}
                  showToast={showToast}
                />
              )}
              {activeTab === 'doc' && (
                <ArtifactViewer
                  key={openArtifact?.relPath}
                  artifact={openArtifact}
                  persona={persona}
                  onClose={() => { setOpenArtifact(null); setTab('overview'); }}
                />
              )}
              {activeTab === 'state' && (
                <pre className="h-full overflow-auto p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap">
                  {status?.state?.raw || 'Không tìm thấy aidlc-state.md'}
                </pre>
              )}
              {activeTab === 'activity' && <ActivityPanel status={status} persona={persona} embedded />}
            </div>

            {status?.agent && (
              <AgentDock
                agent={status.agent}
                persona={persona}
                open={dockOpen}
                onToggle={() => setDockOpen(!dockOpen)}
                onSend={handleSendToAgent}
                onStop={handleStopAgent}
              />
            )}
          </main>

          <ActivityPanel status={status} persona={persona} />
        </div>
      )}

      <StatusBar status={status} persona={persona} />

      {toastMessage && (
        <div className="fixed bottom-9 right-4 z-50 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-100 shadow-xl">
          {toastMessage}
        </div>
      )}

      <GateApprovalModal
        isOpen={gateModal.open}
        onClose={() => setGateModal({ open: false, mode: 'APPROVE' })}
        mode={gateModal.mode}
        onSubmit={handleGateSubmit}
        gateDetails={{
          name: status?.approver?.gate?.stage || status?.state?.stage,
          prompt: `Stage "${status?.approver?.gate?.stage || status?.state?.stage}" đã xong và đang chờ quyết định của bạn.`
        }}
        loading={loadingAction}
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
