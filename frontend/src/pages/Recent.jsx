// src/pages/Recent.jsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, Clock, ShieldAlert, Activity, ArrowRight, Users, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import Topbar from '../components/layout/Topbar';
import Toast from '../components/ui/Toast';

const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const PAGE_SIZE = 6;

export default function Recent() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getHistory(); // `/history` returns repository analysis records
      setAnalyses(Array.isArray(r.data) ? r.data : []);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError('Failed to load recent repository analyses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAnalyzeAgain = async (url, id) => {
    setActionLoadingId(id);
    try {
      const res = await api.analyzeRepo({ repo_url: url });
      setToast({ message: 'Repository analyzed successfully!', type: 'success' });
      // Redirect to dashboard with the new analysis ID
      if (res.data && res.data.id) {
        navigate(`/dashboard?id=${res.data.id}`);
      } else {
        load();
      }
    } catch (err) {
      console.error(err);
      setToast({ 
        message: err.response?.data?.detail || 'Analysis failed. Please check rate limits or repository accessibility.', 
        type: 'error' 
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = useMemo(() => {
    return analyses.filter(a =>
      (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.repo_url || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.status || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [analyses, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col min-h-screen text-black">
      <Topbar title="Recent Repository Runs" subtitle="Real-time status of the latest codebase snapshots analyzed in the Postgres registry" />
      
      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="border-3 border-black bg-rose-200 text-black font-bold text-sm px-4 py-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
            ⚠ {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 w-full max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search recent analysis runs by name or URL…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9 text-xs"
            />
          </div>

          <button 
            onClick={load} 
            className="btn-primary w-full sm:w-auto bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] border-2 border-black" 
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH
          </button>
        </div>

        {/* Card Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 border-3 border-black bg-slate-100 animate-pulse shadow-[4px_4px_0_0_rgba(0,0,0,1)]" />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="text-center py-20 text-sm font-bold text-slate-500 border-2 border-dashed border-black bg-[#f9f8f3] uppercase">
            {analyses.length === 0 ? 'No repositories analyzed yet.' : 'No results match your search.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paged.map(row => {
                const isCardLoading = actionLoadingId === row.id;
                const statusColor = row.status === 'Healthy' 
                  ? 'bg-emerald-100 border-emerald-400' 
                  : (row.status === 'Moderate' ? 'bg-amber-100 border-amber-400' : 'bg-rose-100 border-rose-400');
                
                const badgeColor = row.status === 'Healthy' 
                  ? 'bg-emerald-400 text-black' 
                  : (row.status === 'Moderate' ? 'bg-amber-400 text-black' : 'bg-rose-400 text-black');

                return (
                  <div key={row.id} className="card bg-white border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col justify-between p-5 space-y-4 hover:translate-y-[-2px] transition-all">
                    
                    {/* Repo Name and URL Header */}
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <GithubIcon size={18} className="text-black flex-shrink-0" />
                          <h3 className="font-black text-sm text-black truncate max-w-[180px] leading-tight" title={row.name}>
                            {row.name}
                          </h3>
                        </div>
                        <span className={`border border-black px-2 py-0.5 text-[8px] font-black uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)] ${badgeColor}`}>
                          {row.status}
                        </span>
                      </div>
                      
                      <p className="text-[10px] font-mono text-slate-400 truncate mt-1.5" title={row.repo_url}>
                        {row.repo_url}
                      </p>
                    </div>

                    {/* Score and Stats Details */}
                    <div className="grid grid-cols-2 gap-3 border-y-2 border-black/10 py-3">
                      
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 leading-none">Health Score</span>
                        <span className="text-xl font-black text-sky-500 font-mono mt-1">
                          {row.health_score}%
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 leading-none">Contributors</span>
                        <span className="text-xl font-black text-black font-mono mt-1 flex items-center gap-1">
                          <Users size={14} className="text-slate-500" />
                          {row.contributors_count}
                        </span>
                      </div>

                    </div>

                    {/* Timestamp & Actions */}
                    <div className="flex flex-col space-y-3">
                      
                      <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                        <Clock size={10} />
                        <span>{new Date(row.analyzed_at).toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => navigate(`/dashboard?id=${row.id}`)}
                          className="px-3 py-2 border-2 border-black bg-yellow-300 hover:bg-yellow-400 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1"
                          disabled={isCardLoading}
                        >
                          View Run
                        </button>
                        
                        <button
                          onClick={() => handleAnalyzeAgain(row.repo_url, row.id)}
                          className="px-3 py-2 border-2 border-black bg-white hover:bg-slate-100 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1"
                          disabled={isCardLoading}
                        >
                          {isCardLoading ? (
                            <RefreshCw size={12} className="animate-spin text-black" />
                          ) : (
                            <RefreshCw size={12} className="text-black" />
                          )}
                          Re-Analyze
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t-2 border-black">
                <p className="text-xs font-bold text-slate-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} recent runs
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-40 text-xs font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
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
                    className="px-3 py-1.5 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-40 text-xs font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
