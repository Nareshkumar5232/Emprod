// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Award, Activity, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, RefreshCw, Star, GitFork,
  FileCode2, ShieldAlert, Users, Calendar, ArrowRight, X, Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { api } from '../api/client';
import Topbar from '../components/layout/Topbar';
import Toast from '../components/ui/Toast';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const repoParam = searchParams.get('repo');
  const analysisIdParam = searchParams.get('id');

  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '');
  
  // Developer Drawer State
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerData, setDrawerData] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Load a repository analysis by URL or ID
  const loadAnalysis = async (url = null, id = null) => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (id) {
        res = await api.getAnalysisDetails(id);
      } else if (url) {
        res = await api.analyzeRepo({ repo_url: url });
      } else {
        return;
      }

      if (res.data && !res.data.error) {
        setData(res.data);
        if (res.data.repo_url) setRepoUrl(res.data.repo_url);
        setToast({ message: 'Analysis loaded successfully!', type: 'success' });
      } else {
        setError(res.data?.error || 'Failed to fetch repository details.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Could not connect to the backend server. Please verify FastAPI is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (analysisIdParam) {
      loadAnalysis(null, analysisIdParam);
    } else if (repoParam) {
      loadAnalysis(decodeURIComponent(repoParam));
    } else {
      // Check if there is any real recent analysis in the DB to display
      api.getRecent().then(res => {
        if (Array.isArray(res.data) && res.data.length > 0 && res.data[0].id) {
          loadAnalysis(null, res.data[0].id);
        }
      }).catch(() => {
        // No analyses in DB yet; keep data null for clean empty state
      });
    }
  }, [repoParam, analysisIdParam]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    loadAnalysis(repoUrl.trim());
  };

  // Fetch drawer details for developer profile
  const handleOpenDrawer = async (username) => {
    setDrawerUser(username);
    setDrawerLoading(true);
    try {
      const res = await api.getContributorDetails(username);
      setDrawerData(res.data);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to fetch contributor details.', type: 'error' });
    } finally {
      setDrawerLoading(false);
    }
  };

  // Recharts Colors
  const COLORS = ['#38bdf8', '#ff60b5', '#39ef87', '#ff8533', '#ffe600', '#a855f7'];

  // Trend Chart (Simulate weekly data based on metrics)
  const healthMetricsData = data?.health ? [
    { name: 'Commits', value: data.health.commit_activity },
    { name: 'PRs', value: data.health.pr_activity },
    { name: 'Resolution', value: data.health.issue_resolution_rate },
    { name: 'Participation', value: data.health.contributor_participation },
    { name: 'Maintenance', value: data.health.repository_maintenance },
    { name: 'Reviews', value: data.health.review_participation }
  ] : [];

  // Contributor score comparison
  const contributorScores = data?.contributors
    ? data.contributors.map(c => ({
        name: c.username,
        score: c.score,
        commits: c.commits,
        prs: c.pull_requests
      })).sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Engineering Intelligence Platform" subtitle="Continuous repository insights, contribution forecasting, and MLOps metrics" />
      
      <div className="flex-1 p-6 space-y-6">
        
        {/* Repo Input Box */}
        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-extrabold font-mono text-sm">URL:</span>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="Enter GitHub Repository URL (e.g. https://github.com/facebook/react)"
                className="input pl-14 pr-4 py-3.5 w-full font-extrabold text-sm"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className="btn-primary w-full md:w-auto px-8 py-3.5 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all font-black text-xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  ANALYZING…
                </>
              ) : (
                <>
                  <Search size={14} />
                  ANALYZE REPO
                </>
              )}
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="mt-4 flex flex-wrap gap-2 items-center text-xs font-bold text-slate-500">
            <span className="uppercase tracking-wide text-[10px]">Quick Suggestions:</span>
            {[
              { name: 'facebook/react', url: 'https://github.com/facebook/react' },
              { name: 'psf/requests', url: 'https://github.com/psf/requests' },
              { name: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi' }
            ].map(repo => (
              <button
                key={repo.name}
                type="button"
                onClick={() => { setRepoUrl(repo.url); loadAnalysis(repo.url); }}
                className="px-3 py-1.5 bg-yellow-200 border-2 border-black hover:translate-y-[-2px] shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] font-mono text-[10px] uppercase font-black tracking-wide text-black transition-all"
              >
                {repo.name}
              </button>
            ))}
          </div>

          <div className="mt-4 border-t-2 border-dashed border-black pt-4">
            <details className="group">
              <summary className="text-[11px] font-black uppercase text-slate-500 hover:text-black cursor-pointer list-none flex items-center gap-1">
                <span>🛠️ Configure GitHub Personal Access Token (PAT)</span>
                <span className="transition-transform group-open:rotate-90">▶</span>
              </summary>
              <div className="mt-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => {
                    setGithubToken(e.target.value);
                    localStorage.setItem('github_token', e.target.value);
                  }}
                  placeholder="ghp_..."
                  className="input py-2 px-3 w-full sm:w-72 font-mono text-xs border-2 border-black"
                />
                <p className="text-[10px] text-slate-500 font-bold leading-normal">
                  Providing a PAT avoids GitHub API rate limits. Token is stored locally in your browser.
                </p>
              </div>
            </details>
          </div>
        </div>

        {error && (
          <div className="border-3 border-black bg-rose-200 text-black font-extrabold text-sm px-5 py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex items-center gap-3">
            <AlertTriangle size={18} className="stroke-[3px]" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State when no repository is analyzed yet */}
        {!data && !loading && !error && (
          <div className="card text-center py-16 px-6 bg-white border-3 border-dashed border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 border-3 border-black bg-yellow-300 flex items-center justify-center mx-auto shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
              <Search size={28} className="text-black" />
            </div>
            <h3 className="heading-syne text-xl font-black uppercase text-black">Ready to Analyze Repository</h3>
            <p className="text-xs font-bold text-slate-600 leading-relaxed max-w-lg mx-auto">
              Enter any valid public GitHub repository URL above (e.g. <span className="font-mono text-black font-extrabold">https://github.com/facebook/react</span> or <span className="font-mono text-black font-extrabold">https://github.com/psf/requests</span>) to fetch real commits, contributors, PR velocity, calculate explainable activity scores, and generate MLOps predictions.
            </p>
          </div>
        )}

        {/* Dashboard Grid Data */}
        {data && (
          <div className="space-y-6">
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="card flex items-center gap-4 bg-yellow-100">
                <div className="w-12 h-12 border-3 border-black bg-yellow-400 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex-shrink-0">
                  <Star className="text-black stroke-[3px] fill-black" size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-black uppercase tracking-wider">Repository</p>
                  <p className="text-lg font-black truncate">{data.name}</p>
                  <div className="flex gap-2 text-xs font-bold text-slate-700 font-mono mt-0.5">
                    <span>★ {(data.stars ?? 0).toLocaleString()}</span>
                    <span>⑂ {(data.forks ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className={`card flex items-center gap-4 ${data.health.health_score >= 75 ? 'bg-emerald-100' : (data.health.health_score >= 50 ? 'bg-amber-100' : 'bg-rose-100')}`}>
                <div className={`w-12 h-12 border-3 border-black ${data.health.health_score >= 75 ? 'bg-emerald-400' : (data.health.health_score >= 50 ? 'bg-amber-400' : 'bg-rose-400')} flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex-shrink-0`}>
                  <Activity className="text-black stroke-[3px]" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-black uppercase tracking-wider">Health Index</p>
                  <p className="text-2xl font-black">{data.health.health_score}%</p>
                  <span className="border border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)] mt-0.5 inline-block">{data.health.status}</span>
                </div>
              </div>

              <div className="card flex items-center gap-4 bg-sky-100">
                <div className="w-12 h-12 border-3 border-black bg-sky-400 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex-shrink-0">
                  <Award className="text-black stroke-[3px]" size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-black uppercase tracking-wider">Top Contributor</p>
                  <p className="text-lg font-black truncate">{data.top_performers?.best_contributor?.name || 'N/A'}</p>
                  <p className="text-xs font-bold text-slate-700 font-mono">Score: {data.top_performers?.best_contributor?.score || 0}/100</p>
                </div>
              </div>

              <div className="card flex items-center gap-4 bg-rose-100">
                <div className="w-12 h-12 border-3 border-black bg-rose-400 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex-shrink-0">
                  <AlertTriangle className="text-black stroke-[3px]" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-black uppercase tracking-wider">Contributor Risks</p>
                  <p className="text-2xl font-black">{data.risks?.length || 0}</p>
                  <span className="text-xs font-bold text-slate-700">Team alerts detected</span>
                </div>
              </div>

            </div>

            {/* Visual Charts & AI Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Health indicators radar-like bar chart */}
              <div className="card lg:col-span-2">
                <h3 className="heading-syne text-md font-black text-black uppercase mb-4">Repository Health Indicators</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={healthMetricsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#000" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis stroke="#000" domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <Tooltip contentStyle={{ background: '#fff', border: '3px solid black', fontWeight: 'bold' }} />
                      <Bar dataKey="value" stroke="#000" strokeWidth={2.5}>
                        {healthMetricsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Insights panel */}
              <div className="card flex flex-col justify-between bg-violet-100">
                <div>
                  <div className="flex items-center gap-2 border-b-3 border-black pb-3 mb-4">
                    <Sparkles className="text-black fill-black" size={18} />
                    <h3 className="heading-syne text-md font-black text-black uppercase">AI Sprint Recommendations</h3>
                  </div>
                  <ul className="space-y-3">
                    {data.recommendations.map((rec, idx) => (
                      <li key={idx} className="border-2 border-black bg-white p-3 font-semibold text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] leading-relaxed">
                        👉 {rec}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-4 border-t-2 border-black pt-3 flex items-center justify-between text-xs font-mono font-bold text-slate-700">
                  <span>Forecast Health:</span>
                  <span className="border border-black bg-white px-2 py-0.5 shadow-[1.5px_1.5px_0_0_rgba(0,0,0,1)] text-emerald-500 font-extrabold">{data.future_health}%</span>
                </div>
              </div>

            </div>

            {/* Contributor Distribution & Metadata Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Contributor Distribution chart */}
              <div className="card lg:col-span-2">
                <h3 className="heading-syne text-md font-black text-black uppercase mb-4">Contributor Score Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contributorScores} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#000" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis stroke="#000" domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <Tooltip contentStyle={{ background: '#fff', border: '3px solid black', fontWeight: 'bold' }} />
                      <Bar dataKey="score" fill="#ff60b5" stroke="#000" strokeWidth={2.5} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Repo Metadata panel */}
              <div className="card bg-orange-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b-3 border-black pb-3 mb-4">
                    <FileCode2 size={18} />
                    <h3 className="heading-syne text-md font-black text-black uppercase">Codebase Metadata</h3>
                  </div>
                  <div className="space-y-2 text-xs font-bold text-slate-800">
                    <div className="flex justify-between border-b border-black/10 pb-1.5">
                      <span>Default Branch:</span>
                      <span className="font-mono">{data.default_branch}</span>
                    </div>
                    <div className="flex justify-between border-b border-black/10 pb-1.5">
                      <span>Total Branches:</span>
                      <span className="font-mono">{data.branches_count}</span>
                    </div>
                    <div className="flex justify-between border-b border-black/10 pb-1.5">
                      <span>Releases Tagged:</span>
                      <span className="font-mono">{data.releases_count}</span>
                    </div>
                    <div className="flex justify-between border-b border-black/10 pb-1.5">
                      <span>Languages Count:</span>
                      <span className="font-mono">{Object.keys(data.languages || {}).length}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-black/10">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Languages Distribution</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.languages || {}).map(([lang, pct], idx) => (
                      <span key={lang} className="border border-black bg-white px-2 py-0.5 text-[9px] font-black font-mono shadow-[1px_1px_0_0_rgba(0,0,0,1)] uppercase">
                        {lang} ({pct}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Team Leaderboard */}
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="heading-syne text-md font-black text-black uppercase">Contributor Engineering Activity</h3>
                <span className="text-[10px] font-bold text-slate-600 bg-yellow-100 border-2 border-black px-2.5 py-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                  ℹ️ Activity Notice: Measures observable repository actions, not complete employee capability.
                </span>
              </div>
              <div className="overflow-x-auto border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-3 border-black bg-yellow-400">
                      <th className="p-3 text-xs font-black uppercase border-r-3 border-black text-black">Rank</th>
                      <th className="p-3 text-xs font-black uppercase border-r-3 border-black text-black">Developer</th>
                      <th className="p-3 text-xs font-black uppercase border-r-3 border-black text-black text-center">Score</th>
                      <th className="p-3 text-xs font-black uppercase border-r-3 border-black text-black">Performance</th>
                      <th className="p-3 text-xs font-black uppercase border-r-3 border-black text-black text-center">Trend</th>
                      <th className="p-3 text-xs font-black uppercase border-r-3 border-black text-black text-center">Risk</th>
                      <th className="p-3 text-xs font-black uppercase border-r-3 border-black text-black text-center">Commits</th>
                      <th className="p-3 text-xs font-black uppercase border-r-3 border-black text-black text-center">PRs</th>
                      <th className="p-3 text-xs font-black uppercase text-black text-center">Reviews</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {[...data.contributors].sort((a,b) => b.score - a.score).map((emp, idx) => (
                      <tr key={emp.username} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                        <td className="p-3 font-bold font-mono text-center border-r-3 border-black">{idx + 1}</td>
                        <td className="p-3 border-r-3 border-black">
                          <button
                            onClick={() => handleOpenDrawer(emp.username)}
                            className="flex items-center gap-2 text-left hover:text-sky-500 font-extrabold focus:outline-none"
                          >
                            <img
                              src={`https://github.com/${emp.username}.png`}
                              alt={emp.username}
                              className="w-7 h-7 border-2 border-black shadow-[1.5px_1.5px_0_0_rgba(0,0,0,1)] flex-shrink-0"
                            />
                            <span>{emp.username}</span>
                          </button>
                        </td>
                        <td className="p-3 font-mono font-bold text-center border-r-3 border-black text-sky-500">
                          {emp.score}/100
                        </td>
                        <td className="p-3 border-r-3 border-black">
                          <span className={`border border-black px-2 py-0.5 text-[9px] font-black uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white`}>
                            {emp.performance}
                          </span>
                        </td>
                        <td className="p-3 border-r-3 border-black text-center">
                          {emp.future_trend === 'Improving' ? (
                            <span className="text-emerald-500 flex items-center justify-center gap-0.5 font-bold text-xs"><TrendingUp size={14} /> IMP</span>
                          ) : emp.future_trend === 'Declining' ? (
                            <span className="text-rose-500 flex items-center justify-center gap-0.5 font-bold text-xs"><TrendingDown size={14} /> DEC</span>
                          ) : (
                            <span className="text-slate-400 flex items-center justify-center gap-0.5 font-bold text-xs"><Clock size={14} /> STB</span>
                          )}
                        </td>
                        <td className="p-3 border-r-3 border-black text-center font-bold">
                          <span className={`border border-black px-2 py-0.5 text-[9px] font-black shadow-[1px_1px_0_0_rgba(0,0,0,1)] text-black ${
                            emp.future_risk === 'High' ? 'bg-rose-300' : (emp.future_risk === 'Medium' ? 'bg-amber-300' : 'bg-emerald-300')
                          }`}>
                            {emp.future_risk} Risk
                          </span>
                        </td>
                        <td className="p-3 font-mono text-center border-r-3 border-black">{emp.commits}</td>
                        <td className="p-3 font-mono text-center border-r-3 border-black">{emp.pull_requests}</td>
                        <td className="p-3 font-mono text-center">{emp.reviews}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Details Slide-Over Drawer */}
      <AnimatePresence>
        {drawerUser && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerUser(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-[#f9f8f3] border-l-4 border-black z-50 p-6 overflow-y-auto flex flex-col gap-6 shadow-[-10px_0_0_0_rgba(0,0,0,1)] text-black"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b-3 border-black pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://github.com/${drawerUser}.png`}
                    alt={drawerUser}
                    className="w-10 h-10 border-3 border-black shadow-[2.5px_2.5px_0_0_rgba(0,0,0,1)]"
                  />
                  <div>
                    <h3 className="heading-syne font-black text-md uppercase leading-none">{drawerUser}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Developer Analytics history</p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerUser(null)}
                  className="w-8 h-8 border-2 border-black bg-white hover:bg-slate-200 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              {drawerLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="animate-spin text-sky-500" size={32} />
                  <span className="font-extrabold text-sm uppercase">Loading timelines…</span>
                </div>
              ) : drawerData ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="border-3 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Projects Contributed</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {drawerData.repositories.map(repo => (
                        <span key={repo} className="border border-black bg-yellow-100 px-2 py-0.5 text-[10px] font-bold font-mono">
                          {repo}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Historical Contribution Score Timeline Chart */}
                  <div className="border-3 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    <h4 className="heading-syne text-xs font-black uppercase mb-3">Contribution Score History</h4>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={drawerData.history} margin={{ left: -30, right: 10, top: 5, bottom: 5 }}>
                          <XAxis dataKey="timestamp" stroke="#000" tickFormatter={(t) => {
                            const date = new Date(t);
                            return `${date.getMonth()+1}/${date.getDate()}`;
                          }} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                          <YAxis stroke="#000" domain={[0, 100]} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                          <Tooltip contentStyle={{ background: '#fff', border: '2px solid black', fontSize: 10, fontWeight: 'bold' }} />
                          <Line type="monotone" dataKey="score" stroke="#ffe600" strokeWidth={3} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="future_score" stroke="#ff60b5" strokeWidth={3} strokeDasharray="3 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Developer Stats List */}
                  <div className="border-3 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
                    <div className="bg-rose-400 p-3 border-b-3 border-black">
                      <h4 className="heading-syne text-xs font-black text-black uppercase">Weekly Snapshot Timeline</h4>
                    </div>
                    <div className="divide-y divide-black/10 max-h-48 overflow-y-auto">
                      {drawerData.history.map((h, i) => (
                        <div key={i} className="p-3 text-xs font-bold flex justify-between items-center">
                          <div>
                            <span className="block font-mono text-[9px] text-slate-400">
                              {new Date(h.timestamp).toLocaleDateString()}
                            </span>
                            <span className="font-extrabold">Commits: {h.commits} | PRs: {h.prs} | Reviews: {h.reviews}</span>
                          </div>
                          <span className="border border-black bg-yellow-200 px-1.5 py-0.5 text-[9px] font-bold">
                            Score: {h.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-10 font-bold text-slate-500">No history found.</div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
