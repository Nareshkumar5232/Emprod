// src/pages/Landing.jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, Users, Brain, HeartPulse, Sparkles, 
  Activity, ArrowRight, Code, Database, Container, 
  Terminal, ShieldCheck, Layers, Play
} from 'lucide-react';

const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" width={props.size || 24} height={props.size || 24} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function Landing() {
  const features = [
    {
      title: "Explainable Analytics",
      description: "Extract deep metadata from releases, branches, closed issues, and review comments without mock values.",
      icon: BarChart3,
      color: "bg-amber-300"
    },
    {
      title: "Transparent Scoring",
      description: "Evaluate contributors against clear weights: commits 30%, PRs 25%, issues 15%, reviews 15%, and consistency 15%.",
      icon: Users,
      color: "bg-rose-300"
    },
    {
      title: "Predictive Forecasting",
      description: "Train Random Forest models on historical repository logs to forecast scores, trends, and risk metrics.",
      icon: Brain,
      color: "bg-emerald-300"
    },
    {
      title: "Repository Health",
      description: "Synthesize 6 metrics including resolution rate, commit frequency, and PR velocity into Healthy/Moderate/Critical indicators.",
      icon: HeartPulse,
      color: "bg-sky-300"
    },
    {
      title: "AI Insights Engine",
      description: "Receive actionable sprint observations to clean backlogs, boost peer reviews, and resolve blocker bottlenecks.",
      icon: Sparkles,
      color: "bg-violet-300"
    },
    {
      title: "Evidently Data Drift",
      description: "Run Kolmogorov-Smirnov statistical tests and Evidently AI presets to track feature drift in production.",
      icon: Activity,
      color: "bg-orange-300"
    }
  ];

  const techStack = [
    { name: "React & Vite", icon: Code, color: "bg-sky-400" },
    { name: "FastAPI", icon: Terminal, color: "bg-emerald-400" },
    { name: "PostgreSQL", icon: Database, color: "bg-blue-400" },
    { name: "MLflow Registry", icon: Layers, color: "bg-pink-400" },
    { name: "Evidently AI", icon: Activity, color: "bg-orange-400" },
    { name: "Scikit-Learn", icon: Brain, color: "bg-amber-400" },
    { name: "Docker Compose", icon: Container, color: "bg-indigo-400" },
    { name: "GitHub Actions", icon: ShieldCheck, color: "bg-violet-400" }
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f9f8f3] text-black">
      {/* Header */}
      <header className="border-b-4 border-black bg-white px-6 md:px-12 py-5 flex items-center justify-between sticky top-0 z-50 shadow-[0_4px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-3 border-black bg-yellow-400 flex items-center justify-center shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
            <Layers className="text-black stroke-[3px]" size={20} />
          </div>
          <div>
            <h1 className="heading-syne text-xl text-black font-extrabold tracking-tight">RepoIntel</h1>
            <p className="text-[9px] font-black text-black uppercase tracking-widest">Engineering Analytics</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="neo-btn neo-btn-primary text-xs py-2 px-4 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
            Launch Platform
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 space-y-6 text-left">
          <div className="inline-block border-3 border-black bg-emerald-400 px-4 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] tracking-wider">
            ⚡ COMMERCIAL-GRADE MLOPS PLATFORM
          </div>
          <h2 className="heading-syne text-4xl md:text-6xl text-black font-black leading-none tracking-tight">
            AI-Powered <br/>
            <span className="bg-yellow-300 border-3 border-black px-2 py-0.5 shadow-[4px_4px_0_0_rgba(0,0,0,1)] inline-block my-2">Repository Analytics</span> <br/>
            & Employee Contribution Intelligence
          </h2>
          <p className="text-lg font-bold text-gray-800 border-3 border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] leading-relaxed">
            Stop relying on generic issue counters. Track developer trends, predict repository health, monitor machine learning drift, and log retraining artifacts in MLflow using production-ready MLOps pipelines.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link to="/dashboard" className="neo-btn neo-btn-pink text-base py-3 px-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)] hover:bg-[#ff4da6]">
              Analyze Repository <ArrowRight className="ml-2 inline" size={20} />
            </Link>
            <Link to="/dashboard" className="neo-btn bg-white text-black text-base py-3 px-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
              View Demo Dashboard
            </Link>
          </div>
        </div>
        
        <div className="flex-1 w-full flex items-center justify-center">
          <motion.div 
            initial={{ rotate: -2, y: 10 }}
            animate={{ rotate: 1, y: 0 }}
            transition={{ repeat: Infinity, repeatType: "reverse", duration: 4, ease: "easeInOut" }}
            className="w-full max-w-lg bg-white border-4 border-black p-6 shadow-[10px_10px_0_0_rgba(0,0,0,1)]"
          >
            <div className="flex items-center justify-between border-b-3 border-black pb-4 mb-4">
              <div className="flex gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-black bg-rose-500"></span>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-black bg-yellow-400"></span>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-black bg-emerald-400"></span>
              </div>
              <span className="font-mono text-xs font-black uppercase text-slate-500">Platform Overview</span>
            </div>
            
            <div className="space-y-4">
              <div className="border-3 border-black bg-yellow-200 p-4 font-bold text-sm shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                ⚙️ GitHub API Metrics Collector (stars, commits, releases)
              </div>
              <div className="border-3 border-black bg-rose-200 p-4 font-bold text-sm shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                🧮 Contribution Score Engine (explainable 0-100 weighted ranks)
              </div>
              <div className="border-3 border-black bg-emerald-200 p-4 font-bold text-sm shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                🧠 Random Forest Predictor (MLflow Registry & Evidently drift detection)
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="border-t-4 border-black bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16 space-y-2">
            <h3 className="heading-syne text-3xl md:text-5xl font-black text-black uppercase tracking-tight">
              Enterprise Intelligence Features
            </h3>
            <p className="text-lg font-bold text-gray-700">
              Complete observability for codebases, delivery teams, and ML pipelines.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="neo-container p-6 bg-white flex flex-col gap-4 border-3 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:translate-x-[-4px] hover:shadow-[9px_9px_0_0_rgba(0,0,0,1)] transition-all">
                  <div className={`w-12 h-12 border-3 border-black ${feat.color} flex items-center justify-center shadow-[3px_3px_0_0_rgba(0,0,0,1)]`}>
                    <Icon className="text-black stroke-[3px]" size={22} />
                  </div>
                  <h4 className="heading-syne text-xl font-black text-black uppercase">
                    {feat.title}
                  </h4>
                  <p className="text-sm font-semibold text-gray-600 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="border-t-4 border-black bg-orange-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="heading-syne text-3xl md:text-5xl font-black text-black uppercase">
              Platform Data Flow
            </h3>
            <p className="text-lg font-bold text-gray-700 mt-2">
              From source control metadata to explainable machine learning predictions.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <div className="flex flex-col items-center justify-center p-4 border-3 border-black bg-yellow-200 w-full md:w-1/5 text-center font-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
              Repository URL
            </div>
            <ArrowRight className="hidden md:block text-black stroke-[3px]" size={24} />
            <div className="flex flex-col items-center justify-center p-4 border-3 border-black bg-sky-200 w-full md:w-1/5 text-center font-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
              GitHub API
            </div>
            <ArrowRight className="hidden md:block text-black stroke-[3px]" size={24} />
            <div className="flex flex-col items-center justify-center p-4 border-3 border-black bg-pink-200 w-full md:w-1/5 text-center font-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
              Metrics Engine
            </div>
            <ArrowRight className="hidden md:block text-black stroke-[3px]" size={24} />
            <div className="flex flex-col items-center justify-center p-4 border-3 border-black bg-emerald-200 w-full md:w-1/5 text-center font-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
              ML Engine
            </div>
            <ArrowRight className="hidden md:block text-black stroke-[3px]" size={24} />
            <div className="flex flex-col items-center justify-center p-4 border-3 border-black bg-violet-200 w-full md:w-1/5 text-center font-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
              Neo UI
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t-4 border-black bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h3 className="heading-syne text-3xl md:text-5xl font-black text-black uppercase">
              Production Architecture Stack
            </h3>
            <p className="text-lg font-bold text-gray-700 mt-2">
              Driven by modern, robust enterprise integrations.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {techStack.map((tech, idx) => {
              const Icon = tech.icon;
              return (
                <div key={idx} className="neo-container p-6 flex flex-col items-center justify-center gap-3 text-center border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <div className={`w-12 h-12 border-3 border-black ${tech.color} flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]`}>
                    <Icon className="text-black stroke-[3px]" size={20} />
                  </div>
                  <h4 className="font-extrabold text-sm text-black uppercase">
                    {tech.name}
                  </h4>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="border-t-4 border-black bg-yellow-100 py-20 text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <h3 className="heading-syne text-3xl md:text-5xl font-black text-black uppercase">
            Ready to audit your repository?
          </h3>
          <p className="text-lg font-bold text-gray-800 max-w-2xl mx-auto">
            Analyze any repository URL instantaneously, compute performance rankings, check model parameters, and manage team risks.
          </p>
          <div className="pt-4">
            <Link to="/dashboard" className="neo-btn neo-btn-primary text-lg py-4 px-10 shadow-[6px_6px_0_0_rgba(0,0,0,1)] font-black hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-all">
              Launch Platform Dashboard <Play className="ml-2 inline fill-black" size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-black text-white py-12 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="heading-syne text-lg font-extrabold uppercase tracking-wider text-yellow-400">RepoIntel</h4>
            <p className="text-xs font-mono text-slate-400 mt-1">AI-Powered Engineering platform using MLOps</p>
          </div>
          <div className="flex items-center gap-6 text-sm font-bold text-slate-300">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-yellow-400 flex items-center gap-1.5 transition">
              <GithubIcon size={16} /> GitHub URL
            </a>
            <span className="text-slate-700">|</span>
            <span className="text-xs text-slate-500 font-mono">© 2026 RepoIntel - Antigravity Systems</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
