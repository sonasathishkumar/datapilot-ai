import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { useDataset } from '../context/DatasetContext';
import { useToast } from '../components/Toast';
import { Rocket, Trophy, Clock, Medal, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const MEDAL_CONFIG = [
  { icon: Crown, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', label: '1st' },
  { icon: Medal, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: '#94A3B8', label: '2nd' },
  { icon: Medal, color: '#CD7F32', bg: 'rgba(205,127,50,0.12)', border: '#CD7F32', label: '3rd' },
];

type ModelStatus = 'waiting' | 'training' | 'done' | 'failed';

interface ModelResult {
  model: string;
  status: ModelStatus;
  metrics?: Record<string, number | null>;
  time_taken?: number;
  feature_importance?: { feature: string; importance: number }[];
}

const STATUS_STYLE: Record<ModelStatus, { label: string; color: string; bg: string }> = {
  waiting: { label: 'Waiting', color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
  training: { label: 'Training...', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  done: { label: 'Complete', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  failed: { label: 'Failed', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg shadow-xl text-xs" style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill || '#818CF8' }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</strong></p>
      ))}
    </div>
  );
};

const ModelCard = ({ result, rank }: { result: ModelResult; rank: number }) => {
  const medal = rank <= 3 ? MEDAL_CONFIG[rank - 1] : null;
  const status = STATUS_STYLE[result.status];
  const primaryMetricKey = result.metrics ? (result.metrics.Accuracy !== undefined ? 'Accuracy' : 'R2') : null;
  const primaryMetric = primaryMetricKey && result.metrics ? result.metrics[primaryMetricKey] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: rank * 0.06 }}
      className="p-4 rounded-xl flex flex-col gap-3"
      style={{
        background: rank === 1 ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${rank === 1 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {medal && (
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: medal.bg }}>
              <medal.icon className="w-3 h-3" style={{ color: medal.color }} />
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-white">{result.model}</h4>
            {result.time_taken && (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500">
                <Clock className="w-2.5 h-2.5" />
                {result.time_taken}s
              </div>
            )}
          </div>
        </div>
        <span className="badge" style={{ background: status.bg, color: status.color }}>{status.label}</span>
      </div>

      {result.status === 'training' && (
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full animate-pulse rounded-full" style={{ background: 'linear-gradient(90deg, #6366F1, #06B6D4)', width: '70%' }} />
        </div>
      )}

      {primaryMetric !== null && primaryMetric !== undefined && (
        <div className="flex items-end gap-2">
          <div>
            <div className="text-[10px] text-slate-500 mb-0.5">{primaryMetricKey}</div>
            <div className="text-xl font-bold" style={{ color: rank === 1 ? '#F59E0B' : '#fff' }}>
              {(primaryMetric * 100).toFixed(1)}%
            </div>
          </div>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, primaryMetric * 100))}%`, background: rank === 1 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #6366F1, #06B6D4)' }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

const AutoML: React.FC = () => {
  const { dataset } = useDataset();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ModelResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const startTraining = async () => {
    setLoading(true);
    setResults([]);
    try {
      const res = await apiClient.post('/automl/train', { session_id: dataset!.sessionId });
      const sorted = [...res.data.leaderboard].sort((a, b) => {
        const getScore = (m: any) => m.metrics?.Accuracy ?? m.metrics?.R2 ?? 0;
        return getScore(b) - getScore(a);
      }).map((m: any) => ({ ...m, status: 'done' as ModelStatus }));
      setResults(sorted);
      toast(`Training complete! Best model: ${sorted[0]?.model}`, 'success');
    } catch {
      toast('AutoML training failed. Make sure you preprocessed the data first.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const bestModel = results[0];

  const featImportanceData = useMemo(() => {
    if (!bestModel?.feature_importance?.length) return [];
    return [...bestModel.feature_importance].slice(0, 10).reverse();
  }, [bestModel]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">AutoML</h1>
          <p className="text-xs text-slate-500 mt-0.5">Train multiple models automatically and compare results</p>
        </div>
        <button
          onClick={startTraining}
          disabled={loading}
          className="btn-primary text-sm px-5 py-2.5"
          style={{ background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #10B981, #059669)', boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,0.3)' }}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Rocket className="w-4 h-4 fill-white" />
          )}
          {loading ? 'Training...' : 'Start Training'}
        </button>
      </div>

      {/* Idle state */}
      {!loading && results.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.06)' }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Rocket className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Ready to train</h3>
          <p className="text-sm text-slate-500 max-w-xs">Click "Start Training" to train multiple ML models in parallel and get a ranked leaderboard.</p>
          <p className="text-xs text-slate-600 mt-2">Make sure you've completed Preprocessing first.</p>
        </div>
      )}

      {/* Loading skeleton grid */}
      {loading && (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex justify-between items-center">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-4 w-16 rounded-full" />
              </div>
              <div className="skeleton h-1.5 w-full rounded-full" />
              <div className="skeleton h-6 w-16 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-6">
          {/* Model Cards Grid */}
          <div className="grid grid-cols-3 gap-4">
            {results.map((res, i) => (
              <ModelCard key={res.model} result={res} rank={i + 1} />
            ))}
          </div>

          {/* Best Model Deep Dive */}
          {bestModel && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6 space-y-5"
              style={{
                background: 'rgba(245,158,11,0.04)',
                border: '1px solid rgba(245,158,11,0.2)',
                backgroundImage: 'linear-gradient(135deg, rgba(245,158,11,0.03), rgba(16,185,129,0.03))',
              }}
            >
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <h2 className="text-base font-bold text-white">Best Model: {bestModel.model}</h2>
                <span className="badge ml-auto" style={{ background: 'rgba(245,158,11,0.15)', color: '#FBBF24' }}>Leaderboard #1</span>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Metrics */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Performance Metrics</h4>
                  <div className="space-y-2">
                    {bestModel.metrics && Object.entries(bestModel.metrics).map(([key, val], i) => (
                      val !== null && val !== undefined ? (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-20 flex-shrink-0">{key}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, val * 100))}%`, background: COLORS[i % COLORS.length] }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-white w-12 text-right">{(val * 100).toFixed(1)}%</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>

                {/* Feature Importance */}
                {featImportanceData.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Top Feature Importance</h4>
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={featImportanceData} layout="vertical" margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                          <XAxis type="number" stroke="#475569" tick={{ fontSize: 9 }} />
                          <YAxis dataKey="feature" type="category" width={70} stroke="#475569" tick={{ fontSize: 9 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="importance" name="Importance" radius={[0, 4, 4, 0]}>
                            {featImportanceData.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Full Leaderboard Table */}
          <div className="glass-card-static overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Full Leaderboard</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Model</th>
                    {results[0]?.metrics && Object.keys(results[0].metrics).map(k => <th key={k}>{k}</th>)}
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.model}>
                      <td>
                        <span className="font-bold" style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : '#475569' }}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="font-semibold text-slate-200">{r.model}</td>
                      {r.metrics && Object.values(r.metrics).map((v, j) => (
                        <td key={j} style={{ color: i === 0 ? '#F59E0B' : '#94A3B8' }}>
                          {v !== null && v !== undefined ? (v * 100).toFixed(2) + '%' : '-'}
                        </td>
                      ))}
                      <td className="text-slate-500">{r.time_taken}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoML;
