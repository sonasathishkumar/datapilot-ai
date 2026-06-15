import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { apiClient } from '../api/client';
import { useDataset } from '../context/DatasetContext';
import { useToast } from '../components/Toast';
import { Info } from 'lucide-react';

const COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
const TABS = ['Overview', 'Distributions', 'Correlations', 'Categorical'] as const;
type Tab = typeof TABS[number];

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton ${className}`} />
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg shadow-xl text-xs" style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill || p.color }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong></p>
      ))}
    </div>
  );
};

function getSkewBadge(skewness: number) {
  const abs = Math.abs(skewness);
  if (abs < 0.5) return { label: 'Normal', color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
  if (abs < 1) return { label: 'Moderate', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
  return { label: 'Skewed', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
}

// Skip high-cardinality string columns (like Name, Ticket, ID)
function shouldSkipCategorical(col: string, valueCounts: { label: string; count: number }[], totalRows: number) {
  if (valueCounts.length === 0) return true;
  const uniqueRatio = valueCounts.length / totalRows;
  return uniqueRatio > 0.5;
}

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="glass-card p-4">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <Info className="w-3.5 h-3.5 text-slate-600 mt-0.5 flex-shrink-0" />
    </div>
    {children}
  </div>
);

const AutoEDA: React.FC = () => {
  const { dataset } = useDataset();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [basicData, setBasicData] = useState<any>(null);
  const [edaData, setEdaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    Promise.all([
      apiClient.get(`/eda/basic/${dataset.sessionId}`),
      apiClient.get(`/eda/intermediate/${dataset.sessionId}`),
    ])
      .then(([basic, intermediate]) => {
        setBasicData(basic.data);
        setEdaData(intermediate.data);
      })
      .catch(() => toast('Failed to load EDA data', 'error'))
      .finally(() => setLoading(false));
  }, [dataset]);

  const dtypeBreakdown = useMemo(() => {
    if (!basicData) return [];
    const counts: Record<string, number> = {};
    Object.values(basicData.dtypes).forEach((t: any) => {
      const key = t.includes('int') || t.includes('float') ? 'Numeric' : t.includes('object') ? 'Categorical' : t.includes('bool') ? 'Boolean' : 'Other';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], i) => ({ name, value, fill: COLORS[i] }));
  }, [basicData]);

  const filteredCatCols = useMemo(() => {
    if (!edaData || !basicData) return [];
    return Object.entries(edaData.value_counts).filter(([col, counts]: any) =>
      !shouldSkipCategorical(col, counts, basicData.shape.rows)
    );
  }, [edaData, basicData]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <Skeleton className="h-10 w-96 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!edaData || !basicData) return null;

  const numericCols = Object.keys(edaData.distributions);
  const corrCols = Object.keys(edaData.correlation);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Automated EDA</h1>
        <div className="tab-bar">
          {TABS.map((tab) => (
            <button key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-2 gap-4">
          <ChartCard title="Column Type Breakdown" subtitle="Distribution of feature types in this dataset">
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dtypeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {dtypeBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Missing Values" subtitle="Columns with missing data (top 10)">
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={basicData.missing_values.filter((m: any) => m.count > 0).slice(0, 10)} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" stroke="#475569" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="column" type="category" width={90} stroke="#475569" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="percentage" name="Missing %" radius={[0, 4, 4, 0]}>
                    {basicData.missing_values.filter((m: any) => m.count > 0).slice(0, 10).map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Descriptive stats table */}
          <div className="col-span-2 glass-card-static overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Descriptive Statistics</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Summary of numeric feature distributions</p>
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: '260px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Mean</th>
                    <th>Std</th>
                    <th>Min</th>
                    <th>25%</th>
                    <th>50%</th>
                    <th>75%</th>
                    <th>Max</th>
                  </tr>
                </thead>
                <tbody>
                  {numericCols.map((col) => {
                    const desc = basicData.description[col];
                    return desc ? (
                      <tr key={col}>
                        <td className="font-medium text-slate-300">{col}</td>
                        <td>{desc.mean?.toFixed?.(2) ?? '-'}</td>
                        <td>{desc.std?.toFixed?.(2) ?? '-'}</td>
                        <td>{desc.min?.toFixed?.(2) ?? '-'}</td>
                        <td>{desc['25%']?.toFixed?.(2) ?? '-'}</td>
                        <td>{desc['50%']?.toFixed?.(2) ?? '-'}</td>
                        <td>{desc['75%']?.toFixed?.(2) ?? '-'}</td>
                        <td>{desc.max?.toFixed?.(2) ?? '-'}</td>
                      </tr>
                    ) : null;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Distributions Tab */}
      {activeTab === 'Distributions' && (
        <div className="grid grid-cols-2 gap-4">
          {numericCols.map((col, idx) => {
            const dist = edaData.distributions[col];
            const skewInfo = edaData.skew_kurtosis?.[col];
            const badge = skewInfo ? getSkewBadge(skewInfo.skewness) : null;
            const chartData = dist.counts.map((count: number, i: number) => ({
              bin: `${dist.bin_edges[i].toFixed(1)}`,
              count,
            }));
            return (
              <motion.div
                key={col}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <ChartCard
                  title={col}
                  subtitle={skewInfo ? `Skewness: ${skewInfo.skewness.toFixed(2)} · Kurtosis: ${skewInfo.kurtosis.toFixed(2)}` : undefined}
                >
                  {badge && (
                    <span className="badge mb-3 inline-block" style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  )}
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="bin" stroke="#475569" tick={{ fontSize: 9 }} interval={4} />
                        <YAxis stroke="#475569" tick={{ fontSize: 9 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Count" fill={COLORS[idx % COLORS.length]} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Correlations Tab */}
      {activeTab === 'Correlations' && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Correlation Heatmap</h3>
          <p className="text-[11px] text-slate-500 mb-4">Pearson correlation between numeric features. Green = positive, Red = negative.</p>
          <div className="overflow-x-auto">
            <table style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th className="p-2 text-slate-500 font-medium text-left" style={{ minWidth: '90px' }}></th>
                  {corrCols.map(c => (
                    <th key={c} className="p-2 text-slate-400 font-medium" style={{ minWidth: '70px', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c}>{c.length > 8 ? c.slice(0, 7) + '…' : c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrCols.map((row) => (
                  <tr key={row}>
                    <td className="p-2 text-slate-300 font-medium pr-4 whitespace-nowrap" style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row}>{row.length > 10 ? row.slice(0, 9) + '…' : row}</td>
                    {corrCols.map((col) => {
                      const val = edaData.correlation[row]?.[col];
                      const v = typeof val === 'number' ? val : 0;
                      const r = v >= 0 ? Math.round(v * 100) : 0;
                      const b = v < 0 ? Math.round(Math.abs(v) * 100) : 0;
                      const bg = `rgba(${b > 0 ? '239,68,68' : '99,102,241'}, ${Math.abs(v) * 0.6})`;
                      return (
                        <td key={col} style={{ background: bg, padding: '6px 8px', textAlign: 'center', color: Math.abs(v) > 0.5 ? '#fff' : '#94A3B8', borderRadius: '4px', margin: '1px' }}>
                          {val !== null && val !== undefined ? v.toFixed(2) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categorical Tab */}
      {activeTab === 'Categorical' && (
        <div className="grid grid-cols-2 gap-4">
          {filteredCatCols.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-500">No meaningful categorical columns found (high-cardinality columns like Name/ID are skipped).</div>
          ) : (
            filteredCatCols.map(([col, counts]: any, idx) => (
              <motion.div key={col} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <ChartCard title={col} subtitle={`Top ${Math.min(10, counts.length)} most frequent values`}>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={counts} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" stroke="#475569" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="label" type="category" width={80} stroke="#475569" tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                          {counts.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AutoEDA;
