import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, BarChart2, BrainCircuit, Rocket, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '../api/client';
import { useToast } from '../components/Toast';
import { useDataset } from '../context/DatasetContext';

const FEATURES = [
  {
    icon: BarChart2,
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.12)',
    title: 'Auto EDA',
    desc: 'Instant distributions, correlations, and outlier analysis',
  },
  {
    icon: BrainCircuit,
    color: '#06B6D4',
    bg: 'rgba(6,182,212,0.12)',
    title: 'AI Insights',
    desc: 'LLM-powered data stories, insights, and Q&A chat',
  },
  {
    icon: Rocket,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    title: 'AutoML',
    desc: 'Train 8 models in parallel, get ranked leaderboard',
  },
];

const Home: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setDataset } = useDataset();

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast('Only CSV files are supported. Please upload a .csv file.', 'error');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDataset({
        sessionId: res.data.session_id,
        fileName: res.data.filename,
        rows: res.data.rows,
        columns: res.data.columns,
      });
      toast(`"${res.data.filename}" uploaded successfully!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      toast('Failed to upload file. Make sure the backend is running.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center py-12 px-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-10 max-w-2xl"
      >
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold"
          style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <Zap className="w-3 h-3" />
          Powered by Groq · LLaMA 3 · 70B
        </div>
        <h1 className="text-5xl font-extrabold leading-tight mb-4 tracking-tight">
          Upload a CSV.{' '}
          <span className="gradient-text">Get AI-powered</span>
          <br />insights in seconds.
        </h1>
        <p className="text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
          Automated EDA, LLM data stories, and AutoML — no code required. Built for data scientists who move fast.
        </p>
      </motion.div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-xl mb-8"
      >
        <div
          className={`relative rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            isDragging ? 'scale-[1.02]' : ''
          }`}
          style={{
            background: isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${isDragging ? '#6366F1' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '16px',
            minHeight: '220px',
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => !loading && fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-12 h-12 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin"
              />
              <p className="text-sm font-semibold text-slate-300">Uploading & analyzing dataset...</p>
              <div
                className="h-1 w-48 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  className="h-full animate-pulse"
                  style={{ background: 'linear-gradient(90deg, #6366F1, #06B6D4)', width: '60%' }}
                />
              </div>
            </div>
          ) : (
            <>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 hover:scale-110"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                <UploadCloud className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Drag & drop your CSV file</h3>
              <p className="text-sm text-slate-500 mb-4">or click anywhere to browse</p>
              <div
                className="px-4 py-2 rounded-lg text-sm font-semibold text-indigo-300 transition-all"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                Select CSV File <ArrowRight className="inline w-3.5 h-3.5 ml-1" />
              </div>
              <p className="text-xs text-slate-600 mt-4">
                Or try a sample:{' '}
                <span className="text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors">Titanic</span>
                {' · '}
                <span className="text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors">House Prices</span>
                {' · '}
                <span className="text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors">Iris</span>
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* Feature Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-3 gap-4 w-full max-w-xl"
      >
        {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
          <div
            key={title}
            className="p-4 rounded-xl text-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: bg }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default Home;
