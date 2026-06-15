import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useDataset } from '../context/DatasetContext';
import { useToast } from '../components/Toast';
import { ChevronRight, ChevronLeft, CheckCircle2, Target, Layers, Scale, Sliders, ClipboardList, Rocket } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Target', icon: Target },
  { id: 2, label: 'Missing', icon: Layers },
  { id: 3, label: 'Encoding', icon: Sliders },
  { id: 4, label: 'Scaling', icon: Scale },
  { id: 5, label: 'Review', icon: ClipboardList },
];

interface Options {
  target: string;
  problem_type: string;
  missing_strategy: string;
  encoding: string;
  scaling: string;
  remove_duplicates: boolean;
  drop_null_threshold: number;
}

const SelectOption = ({
  label, selected, onClick
}: { label: string; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
    style={
      selected
        ? { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.5)', color: '#A5B4FC' }
        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }
    }
  >
    {label}
  </button>
);

const Preprocessing: React.FC = () => {
  const { dataset } = useDataset();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [opts, setOpts] = useState<Options>({
    target: '',
    problem_type: 'Auto',
    missing_strategy: 'Mean',
    encoding: 'Label Encoding',
    scaling: 'None',
    remove_duplicates: false,
    drop_null_threshold: 50,
  });

  useEffect(() => {
    if (!dataset) return;
    apiClient.get(`/eda/basic/${dataset.sessionId}`).then((res) => {
      const cols = Object.keys(res.data.dtypes);
      setColumns(cols);
      setOpts(o => ({ ...o, target: cols[cols.length - 1] }));
    });
  }, [dataset]);

  const set = (key: keyof Options, val: any) => setOpts(o => ({ ...o, [key]: val }));

  const handleApply = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/preprocess', {
        session_id: dataset!.sessionId,
        target_column: opts.target,
        problem_type: opts.problem_type,
        options: {
          missing_strategy: opts.missing_strategy,
          encoding: opts.encoding,
          scaling: opts.scaling,
          remove_duplicates: opts.remove_duplicates,
          drop_null_threshold: opts.drop_null_threshold,
        },
      });
      setResult(res.data);
      setApplied(true);
      toast('Preprocessing applied successfully!', 'success');
    } catch {
      toast('Preprocessing failed. Please check your configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const REVIEW_ITEMS = [
    { label: 'Target Column', value: opts.target },
    { label: 'Problem Type', value: opts.problem_type },
    { label: 'Missing Values', value: opts.missing_strategy },
    { label: 'Encoding', value: opts.encoding },
    { label: 'Scaling', value: opts.scaling },
    { label: 'Remove Duplicates', value: opts.remove_duplicates ? 'Yes' : 'No' },
    { label: 'Drop High-Null Cols', value: `>${opts.drop_null_threshold}% missing` },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <h1 className="text-xl font-bold text-white mb-6">Data Preprocessing</h1>

      {/* Progress Bar */}
      <div className="flex items-center mb-8 relative">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center z-10">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={
                    isDone
                      ? { background: '#10B981', color: '#fff' }
                      : isActive
                      ? { background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.06)', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-[10px] mt-1.5 font-medium" style={{ color: isActive ? '#818CF8' : isDone ? '#10B981' : '#475569' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 -mt-4" style={{ background: step > s.id ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.06)' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="glass-card p-6 space-y-5"
        >
          {step === 1 && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Select Target Column</h3>
                <p className="text-[11px] text-slate-500 mb-3">The column your model will predict</p>
                <select
                  value={opts.target}
                  onChange={e => set('target', e.target.value)}
                  className="w-full bg-transparent border rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                >
                  {columns.map(c => <option key={c} value={c} style={{ background: '#1E293B' }}>{c}</option>)}
                </select>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Problem Type</h3>
                <div className="flex gap-2 flex-wrap">
                  {['Auto', 'Classification', 'Regression'].map(p => (
                    <SelectOption key={p} label={p} selected={opts.problem_type === p} onClick={() => set('problem_type', p)} />
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Handle Missing Values</h3>
                <p className="text-[11px] text-slate-500 mb-3">Strategy for filling or removing null values</p>
                <div className="flex gap-2 flex-wrap">
                  {['Mean', 'Median', 'Mode', 'Drop rows'].map(s => (
                    <SelectOption key={s} label={s} selected={opts.missing_strategy === s} onClick={() => set('missing_strategy', s)} />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Drop High-Null Columns</h3>
                <p className="text-[11px] text-slate-500 mb-3">Remove columns where missing % exceeds threshold: <span className="text-indigo-400">{opts.drop_null_threshold}%</span></p>
                <input type="range" min={0} max={100} value={opts.drop_null_threshold} onChange={e => set('drop_null_threshold', parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="dups" checked={opts.remove_duplicates} onChange={e => set('remove_duplicates', e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                <label htmlFor="dups" className="text-sm text-slate-300">Remove duplicate rows</label>
              </div>
            </>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Categorical Encoding</h3>
              <p className="text-[11px] text-slate-500 mb-3">Convert text categories to numeric values for ML</p>
              <div className="flex gap-2 flex-wrap">
                {['Label Encoding', 'One-Hot Encoding'].map(e => (
                  <SelectOption key={e} label={e} selected={opts.encoding === e} onClick={() => set('encoding', e)} />
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl text-xs text-slate-400" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <strong className="text-slate-300">Label Encoding</strong> — Assigns integers (0, 1, 2...). Best for tree-based models.<br />
                <strong className="text-slate-300 mt-2 block">One-Hot Encoding</strong> — Creates binary columns per category. Best for linear models.
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Feature Scaling</h3>
              <p className="text-[11px] text-slate-500 mb-3">Normalize numeric feature ranges</p>
              <div className="flex gap-2 flex-wrap">
                {['None', 'StandardScaler', 'MinMaxScaler', 'RobustScaler'].map(s => (
                  <SelectOption key={s} label={s} selected={opts.scaling === s} onClick={() => set('scaling', s)} />
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl text-xs text-slate-400 space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div><strong className="text-slate-300">None</strong> — Skip scaling (tree-based models don't need it)</div>
                <div><strong className="text-slate-300">StandardScaler</strong> — Zero mean, unit variance (best for SVM, LR)</div>
                <div><strong className="text-slate-300">MinMaxScaler</strong> — Scale to [0, 1] range</div>
                <div><strong className="text-slate-300">RobustScaler</strong> — Robust to outliers using IQR</div>
              </div>
            </div>
          )}

          {step === 5 && !applied && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Review Configuration</h3>
              <div className="space-y-2">
                {REVIEW_ITEMS.map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-white/[0.05]">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-xs font-semibold text-slate-200 px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#A5B4FC' }}>{value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleApply}
                disabled={loading}
                className="btn-primary w-full mt-5 justify-center"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Applying...' : 'Apply Preprocessing'}
              </button>
            </div>
          )}

          {step === 5 && applied && result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Preprocessing Complete!</h3>
              <p className="text-sm text-slate-400 mb-4">Your dataset is ready for model training.</p>
              <div className="flex justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{result.new_shape?.rows?.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-500">Rows after</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{result.new_shape?.cols}</div>
                  <div className="text-[11px] text-slate-500">Columns after</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-400">{result.null_count}</div>
                  <div className="text-[11px] text-slate-500">Nulls remaining</div>
                </div>
              </div>
              <button onClick={() => navigate('/automl')} className="btn-primary justify-center mx-auto">
                <Rocket className="w-4 h-4" /> Proceed to AutoML
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {!applied && (
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="btn-secondary"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < 5 && (
            <button onClick={() => setStep(s => Math.min(5, s + 1))} className="btn-primary">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Preprocessing;
