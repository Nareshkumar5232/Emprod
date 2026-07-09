// src/pages/Predict.jsx
import { useState } from 'react';
import { BrainCircuit, Loader2, Sparkles, TrendingUp, TrendingDown, Clock, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
import Topbar from '../components/layout/Topbar';
import Toast from '../components/ui/Toast';

function InputField({ label, id, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input text-xs font-bold"
      />
    </div>
  );
}

const FIELDS = [
  { key: 'commits', label: 'Commits Contributed', placeholder: 'e.g. 15' },
  { key: 'prs',     label: 'Pull Requests (PRs)',  placeholder: 'e.g. 3' },
  { key: 'issues',  label: 'Issues Closed',        placeholder: 'e.g. 2' },
  { key: 'reviews', label: 'Code Review Comments', placeholder: 'e.g. 6' },
  { key: 'active_days', label: 'Active Days',      placeholder: 'e.g. 4' }
];

export default function Predict() {
  const [form, setForm] = useState({ commits: '', prs: '', issues: '', reviews: '', active_days: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      commits: Number(form.commits),
      prs: Number(form.prs),
      issues: Number(form.issues),
      reviews: Number(form.reviews),
      active_days: Number(form.active_days)
    };
    if (Object.values(payload).some(v => isNaN(v))) return;
    setLoading(true);
    setResult(null);
    try {
      // Call predict endpoint on the backend
      const res = await api.predict(payload);
      setResult(res.data);
      setToast({ message: 'Forecasting completed successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Prediction failed. Check backend connection.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-black">
      <Topbar title="ML Contributor Forecasting" subtitle="Run custom metrics evaluation to forecast developer performance targets" />

      <div className="flex-1 p-6 max-w-2xl w-full mx-auto space-y-6">
        {/* Form card */}
        <div className="card bg-white border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-6 border-b-3 border-black pb-3">
            <div className="w-10 h-10 border-3 border-black bg-yellow-300 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
              <BrainCircuit size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase">Simulator Parameters</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Input custom engineer metrics to evaluate scoring trend</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FIELDS.map(f => (
                <InputField
                  key={f.key}
                  id={f.key}
                  label={f.label}
                  value={form[f.key]}
                  onChange={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || Object.values(form).some(v => v === '')}
              className="btn-primary w-full justify-center mt-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] border-3 border-black text-xs font-black uppercase"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> RUNNING FORECAST…</>
                : <><Sparkles size={14} /> FORECAST FUTURE PERFORMANCE</>
              }
            </button>
          </form>
        </div>

        {/* Result card */}
        {result && (
          <div className="card bg-orange-100 border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <span className="text-[10px] font-black uppercase text-slate-500">Forecasting Evaluation Report</span>
              <span className="text-[10px] font-mono font-bold">{new Date().toLocaleTimeString()}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] text-center">
                <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Current Score</span>
                <span className="text-xl font-black text-sky-500 font-mono">{result.current_score}/100</span>
                <span className="block border border-black bg-yellow-100 px-1 py-0.2 text-[8px] font-black uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)] mt-1 max-w-max mx-auto">
                  {result.performance}
                </span>
              </div>

              <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] text-center">
                <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Forecast Score</span>
                <span className="text-xl font-black text-pink-500 font-mono">{result.future_score}/100</span>
                <span className="block border border-black bg-yellow-100 px-1 py-0.2 text-[8px] font-black uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)] mt-1 max-w-max mx-auto">
                  {result.future_performance}
                </span>
              </div>

              <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] text-center flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Trend & Risk</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    {result.future_trend === 'Improving' ? (
                      <span className="text-emerald-600 font-extrabold text-xs flex items-center gap-0.5"><TrendingUp size={14} /> IMP</span>
                    ) : result.future_trend === 'Declining' ? (
                      <span className="text-rose-600 font-extrabold text-xs flex items-center gap-0.5"><TrendingDown size={14} /> DEC</span>
                    ) : (
                      <span className="text-slate-400 font-extrabold text-xs flex items-center gap-0.5"><Clock size={14} /> STB</span>
                    )}
                    <span className={`border border-black px-1.5 py-0.2 text-[8px] font-black uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)] ${
                      result.future_risk === 'High' ? 'bg-rose-300' : (result.future_risk === 'Medium' ? 'bg-amber-300' : 'bg-emerald-300')
                    }`}>
                      {result.future_risk} Risk
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
