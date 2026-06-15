import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '../api/client';
import { useDataset } from '../context/DatasetContext';
import { useToast } from '../components/Toast';
import { Database, Hash, Type, AlertTriangle, Activity } from 'lucide-react';

// Skeleton loader
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton ${className}`} />
);

// Health Score Gauge (SVG semicircle)
const HealthGauge = ({ score }: { score: number }) => {
  const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Fair' : 'Poor';
  const radius = 52;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="72" viewBox="0 0 130 72">
        {/* Background arc */}
        <path
          d="M 10 70 A 52 52 0 0 1 120 70"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Foreground arc */}
        <path
          d="M 10 70 A 52 52 0 0 1 120 70"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="text-center -mt-6">
        <div className="text-3xl font-extrabold" style={{ color }}>{score}</div>
        <div className="text-[11px] font-semibold" style={{ color: color + 'aa' }}>{label}</div>
      </div>
    </div>
  );
};

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  number: { label: 'NUM', color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
  float: { label: 'NUM', color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
  int: { label: 'NUM', color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
  object: { label: 'CAT', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
  string: { label: 'CAT', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
  bool: { label: 'BOOL', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  datetime: { label: 'DATE', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
};

function getTypeBadge(dtype: string) {
  const key = Object.keys(TYPE_BADGE).find((k) => dtype.toLowerCase().includes(k));
  return key ? TYPE_BADGE[key] : { label: 'UNK', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
}

function computeHealthScore(rows: number, missing: { count: number; percentage: number }[], duplicates: number, numericCols: number, totalCols: number) {
  let score = 100;
  const avgMissing = missing.reduce((a, b) => a + b.percentage, 0) / (missing.length || 1);
  score -= Math.min(40, avgMissing * 2);
  const dupPct = (duplicates / rows) * 100;
  score -= Math.min(20, dupPct);
  return Math.max(0, Math.round(score));
}

const Dashboard: React.FC = () => {
  const { dataset } = useDataset();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    apiClient
      .get(`/eda/basic/${dataset.sessionId}`)
      .then((res) => setData(res.data))
      .catch(() => toast('Failed to load dashboard data', 'error'))
      .finally(() => setLoading(false));
  }, [dataset]);

  const stats = useMemo(() => {
    if (!data) return null;
    const numCols = Object.values(data.dtypes).filter((t: any) => t.includes('float') || t.includes('int')).length;
    const catCols = Object.keys(data.dtypes).length - numCols;
    const totalMissing = data.missing_values.reduce((acc: number, m: any) => acc + m.count, 0);
    const health = computeHealthScore(data.shape.rows, data.missing_values, data.duplicate_rows, numCols, data.shape.cols);
    return { numCols, catCols, totalMissing, health };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!data || !stats) return null;

  const cols = Object.keys(data.dtypes);

  const STAT_CARDS = [
    { label: 'Total Rows', value: data.shape.rows.toLocaleString(), color: '#6366F1', icon: Database },
    { label: 'Total Columns', value: data.shape.cols, color: '#06B6D4', icon: Type },
    { label: 'Numeric Features', value: stats.numCols, color: '#10B981', icon: Hash },
    { label: 'Missing Values', value: stats.totalMissing.toLocaleString(), color: '#F59E0B', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, color, icon: Icon }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 flex items-center gap-3"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
              <h3 className="text-xl font-bold text-white">{value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Data Table (2/3 width) */}
        <div className="col-span-2 glass-card-static p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Data Preview</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Showing 10 of {data.shape.rows.toLocaleString()} rows
              </p>
            </div>
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto', overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {cols.map((col) => {
                    const badge = getTypeBadge(data.dtypes[col]);
                    return (
                      <th key={col}>
                        <div>{col}</div>
                        <div
                          className="badge mt-1 inline-block"
                          style={{ background: badge.bg, color: badge.color, fontSize: '9px' }}
                        >
                          {badge.label}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.head.map((row: any, i: number) => (
                  <tr key={i}>
                    {cols.map((col) => (
                      <td key={col}>
                        {row[col] === null || row[col] === undefined ? (
                          <span style={{ color: '#475569', fontStyle: 'italic' }}>null</span>
                        ) : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Health Score (1/3 width) */}
        <div className="glass-card p-5 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Dataset Health Score</h3>
          </div>
          <HealthGauge score={stats.health} />
          <div className="w-full space-y-2">
            {data.missing_values.slice(0, 4).map((m: any) => (
              <div key={m.column} className="flex items-center gap-2">
                <div className="flex-1 text-[11px] text-slate-500 truncate">{m.column}</div>
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, m.percentage)}%`,
                      background: m.percentage > 20 ? '#EF4444' : m.percentage > 5 ? '#F59E0B' : '#10B981',
                    }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 w-8 text-right">{m.percentage.toFixed(0)}%</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 text-center">Based on missing values, duplicates & cardinality</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
