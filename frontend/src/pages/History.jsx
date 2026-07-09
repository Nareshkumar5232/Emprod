// src/pages/History.jsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, RefreshCw, Star, GitFork, ArrowUpRight, X, Heart, Award, ShieldAlert, Check, Trash2, Calendar, Filter } from 'lucide-react';
import { api } from '../api/client';
import Topbar from '../components/layout/Topbar';
import Toast from '../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const PAGE_SIZE = 8;
const COLS = [
  { key: 'name', label: 'Repository' },
  { key: 'stars', label: 'Stars' },
  { key: 'forks', label: 'Forks' },
  { key: 'contributors_count', label: 'Devs' },
  { key: 'health_score', label: 'Health' },
  { key: 'status', label: 'Status' },
  { key: 'analyzed_at', label: 'Analyzed At' },
  { key: 'actions', label: 'Actions' }
];

export default function History() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRepo, setFilterRepo] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [sortKey, setSortKey] = useState('id');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  
  // Details Drawer state
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getHistory();
      setRows(Array.isArray(r.data) ? r.data : []);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError('Failed to load repository analysis history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  // Open drawer detailed analysis
  const handleOpenDetails = async (id) => {
    setSelectedAnalysisId(id);
    setDetailsLoading(true);
    try {
      const res = await api.getAnalysisDetails(id);
      setSelectedAnalysis(res.data);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load details.', type: 'error' });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Delete analysis run
  const handleDeleteRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this repository analysis record? This will permanently delete the snapshot metrics and predictions.")) {
      return;
    }
    try {
      await api.deleteAnalysis(id);
      setToast({ message: 'Analysis record deleted successfully.', type: 'success' });
      load();
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.detail || 'Failed to delete record.', type: 'error' });
    }
  };

  // Get distinct repositories for the repo filter dropdown
  const uniqueRepos = useMemo(() => {
    const repos = rows.map(r => r.name).filter(Boolean);
    return ['All', ...new Set(repos)];
  }, [rows]);

  const processed = useMemo(() => {
    return rows
      .filter(r => (filterStatus === 'All' || r.status === filterStatus))
      .filter(r => (filterRepo === 'All' || r.name === filterRepo))
      .filter(r => {
        if (!startDate) return true;
        const date = new Date(r.analyzed_at);
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        return date >= start;
      })
      .filter(r => {
        if (!endDate) return true;
        const date = new Date(r.analyzed_at);
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        return date <= end;
      })
      .filter(r =>
        (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.repo_url || '').toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        return typeof va === 'number'
          ? sortAsc ? va - vb : vb - va
          : sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
  }, [rows, search, filterStatus, filterRepo, startDate, endDate, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paged = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const header = ['ID', 'Repo Name', 'Repo URL', 'Stars', 'Forks', 'Contributors', 'Health Score', 'Status', 'Analyzed At'].join(',');
    const lines = processed.map(r => [
      r.id,
      `"${r.name}"`,
      r.repo_url,
      r.stars ?? 0,
      r.forks ?? 0,
      r.contributors_count,
      r.health_score,
      r.status,
      r.analyzed_at
    ].join(','));
    
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repository_analyses_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'History exported to CSV successfully.', type: 'success' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Analysis & Prediction Audit Log" subtitle={`Manage, filter, and audit all ${rows.length} platform analyses`} />
      
      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="border-3 border-black bg-rose-200 text-black font-bold text-sm px-4 py-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
            ⚠ {error}
          </div>
        )}

        <div className="card bg-white border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-6">
          
          {/* Advanced Filter Panel */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              
              {/* Search Box */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by repository name or URL…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="input pl-9 text-xs"
                />
              </div>

              {/* Repo Selector */}
              <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                <Filter size={12} className="text-black" />
                <select
                  value={filterRepo}
                  onChange={e => { setFilterRepo(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs font-bold border-none outline-none cursor-pointer"
                >
                  <option value="All">All Repositories</option>
                  {uniqueRepos.filter(r => r !== 'All').map(repo => (
                    <option key={repo} value={repo}>{repo}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter Inputs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                  <Calendar size={12} className="text-black" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setPage(1); }}
                    className="bg-transparent border-none text-xs font-semibold outline-none"
                    placeholder="Start Date"
                  />
                </div>
                <span className="text-xs font-bold font-mono">to</span>
                <div className="flex items-center gap-1.5 border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                  <Calendar size={12} className="text-black" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setPage(1); }}
                    className="bg-transparent border-none text-xs font-semibold outline-none"
                    placeholder="End Date"
                  />
                </div>
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                    className="text-xs text-rose-500 font-extrabold uppercase hover:underline ml-1"
                  >
                    Clear Dates
                  </button>
                )}
              </div>

            </div>

            {/* Health Status & Buttons Row */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-500 mr-1">Health Status:</span>
                {['All', 'Healthy', 'Moderate', 'Critical'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilterStatus(f); setPage(1); }}
                    className={`px-3 py-1.5 border-2 border-black font-bold text-xs uppercase transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                      filterStatus === f
                        ? 'bg-yellow-300 text-black'
                        : 'bg-white text-slate-500 hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 self-stretch sm:self-auto">
                <button 
                  onClick={exportCSV} 
                  className="btn-primary flex-1 sm:flex-initial bg-white text-black text-xs font-bold gap-1.5 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] border-2 border-black" 
                  disabled={processed.length === 0}
                >
                  <Download size={14} /> EXPORT CSV
                </button>
                <button 
                  onClick={load} 
                  className="btn-primary bg-white text-black text-xs font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-[-1px] border-2 border-black"
                  disabled={loading}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 w-full border-2 border-black bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : paged.length === 0 ? (
            <div className="text-center py-16 text-sm font-bold text-slate-500 border-2 border-dashed border-black bg-[#f9f8f3] uppercase">
              {rows.length === 0 ? 'No repositories analyzed yet.' : 'No analyses match the current search or filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-yellow-400 border-b-3 border-black text-black">
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.key !== 'actions' && toggleSort(col.key)}
                        className={`p-3 text-xs font-black uppercase border-r-3 border-black last:border-r-0 select-none ${col.key !== 'actions' ? 'cursor-pointer hover:bg-yellow-300' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (sortAsc ? '↑' : '↓')}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {paged.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      
                      {/* Name */}
                      <td className="p-3 border-r-3 border-black">
                        <div className="flex items-center gap-2">
                          <GithubIcon className="text-black flex-shrink-0" size={14} />
                          <div>
                            <span className="font-extrabold text-sm block">{row.name}</span>
                            <span className="block text-[9px] text-slate-400 font-mono truncate max-w-[200px]">{row.repo_url}</span>
                          </div>
                        </div>
                      </td>

                      {/* Stars */}
                      <td className="p-3 font-mono text-xs text-slate-500 border-r-3 border-black">
                        ★ {(row.stars ?? 0).toLocaleString()}
                      </td>

                      {/* Forks */}
                      <td className="p-3 font-mono text-xs text-slate-500 border-r-3 border-black">
                        ⑂ {(row.forks ?? 0).toLocaleString()}
                      </td>

                      {/* Devs */}
                      <td className="p-3 font-mono text-xs font-extrabold text-center border-r-3 border-black">
                        {row.contributors_count}
                      </td>

                      {/* Health */}
                      <td className="p-3 font-bold text-sky-500 font-mono text-center border-r-3 border-black">
                        {row.health_score}%
                      </td>

                      {/* Status */}
                      <td className="p-3 border-r-3 border-black">
                        <span className={`border border-black px-2 py-0.5 text-[9px] font-black uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)] ${
                          row.status === 'Healthy' ? 'bg-emerald-300' : (row.status === 'Moderate' ? 'bg-amber-300' : 'bg-rose-300')
                        }`}>
                          {row.status}
                        </span>
                      </td>

                      {/* Analyzed Date */}
                      <td className="p-3 text-xs text-slate-500 font-mono border-r-3 border-black">
                        {new Date(row.analyzed_at).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetails(row.id)}
                            className="px-2.5 py-1.5 border-2 border-black bg-white hover:bg-slate-200 text-[10px] font-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all inline-flex items-center gap-1 uppercase"
                            title="View full audit run details"
                          >
                            View <ArrowUpRight size={10} />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteRecord(row.id)}
                            className="p-1.5 border-2 border-black bg-rose-200 hover:bg-rose-400 text-rose-800 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                            title="Delete this analysis run"
                          >
                            <Trash2 size={12} className="stroke-[2.5px]" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-black">
              <p className="text-xs font-bold text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, processed.length)} of {processed.length} records
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-40 text-xs font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all"
                >
                  Prev
                </button>
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 border-2 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                        page === p ? 'bg-yellow-300 text-black' : 'bg-white hover:translate-y-[-1px]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-40 text-xs font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Slide-Over Drawer */}
      <AnimatePresence>
        {selectedAnalysisId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAnalysisId(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#f9f8f3] border-l-4 border-black z-50 p-6 overflow-y-auto flex flex-col gap-6 shadow-[-10px_0_0_0_rgba(0,0,0,1)] text-black"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b-3 border-black pb-4">
                <div className="flex items-center gap-2">
                  <GithubIcon size={18} />
                  <div>
                    <h3 className="heading-syne font-black text-md uppercase leading-none">Analysis Details</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">ID: #{selectedAnalysisId} audit log</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnalysisId(null)}
                  className="w-8 h-8 border-2 border-black bg-white hover:bg-slate-200 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all animate-none"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              {detailsLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="animate-spin text-sky-500" size={32} />
                  <span className="font-extrabold text-sm uppercase">Loading details…</span>
                </div>
              ) : selectedAnalysis ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="border-3 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] space-y-2">
                    <h4 className="font-black text-md uppercase">{selectedAnalysis.name}</h4>
                    <p className="text-xs font-semibold text-slate-500 font-mono">{selectedAnalysis.repo_url}</p>
                    <div className="flex gap-4 font-mono text-xs font-extrabold pt-1">
                      <span>Stars: ★ {(selectedAnalysis.stars ?? 0).toLocaleString()}</span>
                      <span>Forks: ⑂ {(selectedAnalysis.forks ?? 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Health index card */}
                  <div className="border-3 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    <h4 className="heading-syne text-xs font-black uppercase mb-3">Sub-Health Scores</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-800 font-mono">
                      <div className="border-2 border-black p-2 bg-yellow-100 shadow-[1.5px_1.5px_0_0_rgba(0,0,0,1)]">
                        Commit Freq: {selectedAnalysis.health?.commit_activity}%
                      </div>
                      <div className="border-2 border-black p-2 bg-rose-100 shadow-[1.5px_1.5px_0_0_rgba(0,0,0,1)]">
                        PR Activity: {selectedAnalysis.health?.pr_activity}%
                      </div>
                      <div className="border-2 border-black p-2 bg-emerald-100 shadow-[1.5px_1.5px_0_0_rgba(0,0,0,1)]">
                        Resolution: {selectedAnalysis.health?.issue_resolution_rate}%
                      </div>
                      <div className="border-2 border-black p-2 bg-sky-100 shadow-[1.5px_1.5px_0_0_rgba(0,0,0,1)]">
                        Reviews: {selectedAnalysis.health?.review_participation}%
                      </div>
                    </div>
                  </div>

                  {/* Team Contributors Ranks */}
                  <div className="border-3 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
                    <div className="bg-yellow-400 p-3 border-b-3 border-black">
                      <h4 className="heading-syne text-xs font-black text-black uppercase">Contributor Ranks</h4>
                    </div>
                    <div className="divide-y divide-black/10">
                      {Array.isArray(selectedAnalysis.contributors) && selectedAnalysis.contributors.map((c, i) => (
                        <div key={i} className="p-3 flex justify-between items-center text-xs font-bold">
                          <span className="font-extrabold">{c.username}</span>
                          <div className="flex gap-2 items-center">
                            <span className="border border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)]">
                              {c.performance}
                            </span>
                            <span className="font-mono text-sky-500">{c.score}/100</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Navigation CTA */}
                  <button
                    onClick={() => {
                      setSelectedAnalysisId(null);
                      navigate(`/dashboard?id=${selectedAnalysis.id}`);
                    }}
                    className="w-full py-3.5 border-3 border-black bg-pink-300 hover:bg-[#ff4da6] hover:translate-y-[-2px] text-sm font-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 uppercase"
                  >
                    Open Full Dashboard <ArrowUpRight size={16} />
                  </button>

                </div>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
