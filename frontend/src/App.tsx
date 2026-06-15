import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { DatasetProvider, useDataset } from './context/DatasetContext';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AutoEDA from './pages/AutoEDA';
import LLMInsights from './pages/LLMInsights';
import Preprocessing from './pages/Preprocessing';
import AutoML from './pages/AutoML';

const AppLayout = () => {
  const { dataset, setDataset } = useDataset();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0F172A' }}>
      {dataset && (
        <Sidebar dataset={dataset} onNewDataset={() => setDataset(null)} />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {dataset && (
          <header
            className="h-14 flex items-center px-6 justify-between flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Dataset
              </span>
              <span className="text-sm font-semibold text-slate-200">{dataset.fileName}</span>
              <div className="flex items-center gap-2 ml-2">
                <span
                  className="badge"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
                >
                  {dataset.rows.toLocaleString()} rows
                </span>
                <span
                  className="badge"
                  style={{ background: 'rgba(6,182,212,0.15)', color: '#22D3EE' }}
                >
                  {dataset.columns} cols
                </span>
              </div>
            </div>

          </header>
        )}
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/dashboard"
              element={dataset ? <Dashboard /> : <Navigate to="/" replace />}
            />
            <Route
              path="/eda"
              element={dataset ? <AutoEDA /> : <Navigate to="/" replace />}
            />
            <Route
              path="/insights"
              element={dataset ? <LLMInsights /> : <Navigate to="/" replace />}
            />
            <Route
              path="/preprocess"
              element={dataset ? <Preprocessing /> : <Navigate to="/" replace />}
            />
            <Route
              path="/automl"
              element={dataset ? <AutoML /> : <Navigate to="/" replace />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <DatasetProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </DatasetProvider>
    </ToastProvider>
  );
}

export default App;
