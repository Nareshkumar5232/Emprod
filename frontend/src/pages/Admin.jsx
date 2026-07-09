// src/pages/Admin.jsx
import { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Loader2, AlertTriangle, Play, HelpCircle, FileText, CheckCircle2, User, Key } from 'lucide-react';
import { api } from '../api/client';
import Topbar from '../components/layout/Topbar';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';

export default function Admin() {
  const [showModal, setShowModal] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);
  const [loadingDrift, setLoadingDrift] = useState(false);
  const [loadingRetrain, setLoadingRetrain] = useState(false);
  
  // Auth state
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('user_role') || 'Viewer');
  const [currentUsername, setCurrentUsername] = useState(() => localStorage.getItem('user_name') || 'anonymous');
  const [loginLoading, setLoginLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const [driftResult, setDriftResult] = useState(null);
  const [retrainResult, setRetrainResult] = useState(null);

  // Auto load JWT on mount if empty (default to Viewer)
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      handleRoleSwitch('Viewer');
    }
  }, []);

  const handleRoleSwitch = async (role) => {
    setLoginLoading(true);
    let username = 'viewer';
    let password = 'viewer123';
    
    if (role === 'Admin') {
      username = 'admin';
      password = 'admin123';
    } else if (role === 'Team Leader') {
      username = 'leader';
      password = 'leader123';
    }
    
    try {
      const res = await api.login({ username, password });
      if (res.data && res.data.token) {
        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('user_role', res.data.role);
        localStorage.setItem('user_name', res.data.username);
        setCurrentRole(res.data.role);
        setCurrentUsername(res.data.username);
        setToast({ message: `Logged in as ${res.data.username} (${res.data.role})! JWT stored.`, type: 'success' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Authentication failure. Check DB seeder is run.', type: 'error' });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleClear = async () => {
    setLoadingClear(true);
    try {
      const res = await api.clearHistory();
      setShowModal(false);
      setToast({ message: res.data?.message || 'Database records cleared successfully.', type: 'success' });
      setDriftResult(null);
      setRetrainResult(null);
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.detail || 'Failed to clear history. Admin role required.', type: 'error' });
    } finally {
      setLoadingClear(false);
    }
  };

  const runDrift = async () => {
    setLoadingDrift(true);
    setDriftResult(null);
    try {
      const res = await api.getDriftReport();
      if (res.data && !res.data.error) {
        setDriftResult(res.data);
        setToast({ message: 'Drift analysis completed!', type: 'success' });
      } else {
        setToast({ message: res.data?.error || 'Drift analysis failed.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.detail || 'Failed to run drift detection. Team Leader or Admin role required.', type: 'error' });
    } finally {
      setLoadingDrift(false);
    }
  };

  const triggerRetraining = async () => {
    setLoadingRetrain(true);
    setRetrainResult(null);
    try {
      const res = await api.triggerRetraining();
      if (res.data && !res.data.error) {
        setRetrainResult(res.data);
        setToast({ message: 'Model retrained and logged in MLflow!', type: 'success' });
      } else {
        setToast({ message: res.data?.error || 'Retraining failed.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.detail || 'Failed to trigger retraining. Team Leader or Admin role required.', type: 'error' });
    } finally {
      setLoadingRetrain(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="MLOps Control Center" subtitle="Track statistics drift, run retraining, comparison logs, and manage server schema" />
      
      <div className="flex-1 p-6 max-w-4xl w-full mx-auto space-y-6">

        {/* Warning banner */}
        <div className="border-3 border-black bg-yellow-100 p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex gap-3 text-black font-semibold text-xs">
          <AlertTriangle size={16} className="text-black stroke-[3.5px] flex-shrink-0 mt-0.5" />
          <p>
            Warning: Administrative pipelines impact the active prediction environment. Purging records or retraining models alters baseline indicators.
          </p>
        </div>

        {/* JWT Role Switcher Panel */}
        <div className="card bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-3 border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-3 border-black bg-[#ffe600] flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
              <User size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase">Role-Based Access (JWT)</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Active Account: <span className="font-mono text-sky-500 font-black">{currentUsername}</span> | Role: <span className="font-mono text-pink-500 font-black">{currentRole}</span></p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {['Viewer', 'Team Leader', 'Admin'].map(role => (
              <button
                key={role}
                disabled={loginLoading}
                onClick={() => handleRoleSwitch(role)}
                className={`px-3 py-1.5 border-2 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                  currentRole === role
                    ? 'bg-black text-white'
                    : 'bg-white hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Model Drift Detection Card */}
          <div className="card bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 border-3 border-black bg-sky-300 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                <HelpCircle size={20} className="text-black" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase">Data Drift Detection</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Kolmogorov-Smirnov feature check</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 font-semibold mb-6 leading-relaxed">
              Compare recent contributor metrics (commits, PRs, issues, reviews) against baseline coordinates using Evidently AI metrics to check statistical drift.
            </p>

            <button
              onClick={runDrift}
              disabled={loadingDrift}
              className="btn-primary w-full justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] border-3 border-black text-xs font-black uppercase"
            >
              {loadingDrift ? <><Loader2 size={14} className="animate-spin" /> ANALYZING DRIFT…</> : <><Play size={14} /> RUN DRIFT ANALYSIS</>}
            </button>

            {driftResult && (
              <div className="mt-5 p-4 border-2 border-black bg-[#f9f8f3] shadow-[3px_3px_0_0_rgba(0,0,0,1)] space-y-2.5 font-semibold text-xs text-black">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 uppercase text-[10px]">Method:</span>
                  <span className="font-mono font-bold">{driftResult.method}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 uppercase text-[10px]">Drift Detected:</span>
                  <span className={`font-black ${driftResult.drift_detected ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {driftResult.drift_detected ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 uppercase text-[10px]">Drifted Features Ratio:</span>
                  <span className="font-mono">{Math.round(driftResult.drift_share * 100)}%</span>
                </div>
                {driftResult.report_url && (
                  <a
                    href="http://127.0.0.1:8000/drift-report"
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('http://127.0.0.1:8000/drift-report', '_blank');
                    }}
                    className="w-full mt-2.5 py-2.5 border-2 border-black bg-sky-300 hover:bg-sky-400 font-bold hover:translate-y-[-1px] shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 text-black"
                  >
                    <FileText size={14} /> VIEW INTERACTIVE REPORT
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Model Retraining Pipeline Card */}
          <div className="card bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 border-3 border-black bg-emerald-300 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                <CheckCircle2 size={20} className="text-black" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase">Retraining Pipeline</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">MLflow registry tracking</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 font-semibold mb-6 leading-relaxed">
              Extract historical timeline data points from the database, retrain the forecasting estimators, log parameters in MLflow, and reload predictions.
            </p>

            <button
              onClick={triggerRetraining}
              disabled={loadingRetrain}
              className="btn-primary w-full bg-emerald-300 hover:bg-emerald-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] border-3 border-black text-xs font-black uppercase text-black"
            >
              {loadingRetrain ? <><Loader2 size={14} className="animate-spin" /> RETRAINING MODELS…</> : <><Play size={14} /> TRIGGER RETRAINING</>}
            </button>

            {retrainResult && (
              <div className="mt-5 p-4 border-2 border-black bg-[#f9f8f3] shadow-[3px_3px_0_0_rgba(0,0,0,1)] space-y-2.5 font-semibold text-xs text-black">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 uppercase text-[10px]">Status:</span>
                  <span className="font-bold text-emerald-500 uppercase">{retrainResult.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 uppercase text-[10px]">Trend Acc:</span>
                  <span className="font-mono font-bold text-sky-500">{(retrainResult.contrib_trend_accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 uppercase text-[10px]">Risk Acc:</span>
                  <span className="font-mono font-bold text-sky-500">{(retrainResult.contrib_risk_accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 uppercase text-[10px]">Sample Size:</span>
                  <span className="font-mono">{retrainResult.dataset_size} samples</span>
                </div>
                {retrainResult.run_id && (
                  <div className="text-[9px] border-2 border-black bg-white p-2 font-mono break-all font-black text-slate-700 shadow-[1.5px_1.5px_0_0_rgba(0,0,0,1)]">
                    MLflow Run ID: {retrainResult.run_id}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Database Clear Action Card */}
        <div className="card bg-rose-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 border-3 border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-3 border-black bg-rose-400 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex-shrink-0">
              <ShieldAlert size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase text-black">Reset Platform Database</h2>
              <p className="text-xs text-rose-900 font-semibold mt-0.5">Purges repository analytics history, audit logs, recommendations, and prediction registries.</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-3 border-3 border-black bg-rose-400 hover:bg-rose-500 text-xs font-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 uppercase text-black flex-shrink-0"
          >
            <Trash2 size={14} /> Clear History
          </button>
        </div>

      </div>

      {/* Confirmation modal */}
      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Confirm Purge database"
      >
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-700 leading-relaxed">
            Are you sure you want to delete all repository analyses, contributor statistics, MLflow metrics, and recommendations? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-3.5 py-2 border-2 border-black bg-white hover:bg-slate-200 text-xs font-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
            >
              Cancel
            </button>
            <button
              onClick={handleClear}
              disabled={loadingClear}
              className="px-3.5 py-2 border-2 border-black bg-rose-400 hover:bg-rose-500 text-xs font-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] text-black"
            >
              {loadingClear ? 'Clearing…' : 'Purge All Database'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
