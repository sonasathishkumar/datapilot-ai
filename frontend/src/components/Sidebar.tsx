import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, BrainCircuit, Settings2, Rocket, Plus, Database } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Auto EDA', path: '/eda', icon: BarChart2 },
  { name: 'LLM Insights', path: '/insights', icon: BrainCircuit },
  { name: 'Preprocessing', path: '/preprocess', icon: Settings2 },
  { name: 'AutoML', path: '/automl', icon: Rocket },
];

interface SidebarProps {
  dataset: { fileName: string; rows: number; columns: number };
  onNewDataset: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ dataset, onNewDataset }) => {
  const navigate = useNavigate();

  const handleNew = () => {
    onNewDataset();
    navigate('/');
  };

  return (
    <div
      className="w-60 flex flex-col h-full flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="p-5 pb-4 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)' }}
        >
          <Rocket className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight">DataPilot AI</h1>
          <p className="text-[10px] text-slate-500">Powered by Groq</p>
        </div>
      </div>

      <div className="px-3 mb-3">
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'text-indigo-300 font-medium'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(6,182,212,0.08))',
                      border: '1px solid rgba(99,102,241,0.2)',
                    }
                  : {}
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Dataset info at bottom */}
      <div className="p-3 space-y-2">
        <div
          className="p-3 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-3 h-3 text-indigo-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Dataset</span>
          </div>
          <p className="text-xs font-medium text-slate-300 truncate mb-1">{dataset.fileName}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">{dataset.rows.toLocaleString()} rows</span>
            <span className="text-slate-600">·</span>
            <span className="text-[10px] text-slate-500">{dataset.columns} cols</span>
          </div>
        </div>

        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Dataset
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
