import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { useDataset } from '../context/DatasetContext';
import { useToast } from '../components/Toast';
import { Lock, CheckCircle, Sparkles, BookOpen, Send, MessageSquare } from 'lucide-react';

const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  'Data Quality': { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: '#EF4444' },
  'Distribution': { color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: '#6366F1' },
  'Correlation': { color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: '#10B981' },
  'ML Readiness': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: '#8B5CF6' },
};

const SUGGESTED_QUESTIONS = [
  'Which columns have the most missing values?',
  'Is this dataset good for classification?',
  'What are the strongest correlations?',
  'Suggest features I should engineer.',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm w-fit" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
    {[0, 1, 2].map(i => (
      <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
    ))}
  </div>
);

const LLMInsights: React.FC = () => {
  const { dataset } = useDataset();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState(localStorage.getItem('GROQ_API_KEY') || '');
  const [connected, setConnected] = useState(!!localStorage.getItem('GROQ_API_KEY'));
  const [keyInput, setKeyInput] = useState('');
  const [insights, setInsights] = useState<any[] | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingStory, setLoadingStory] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleConnect = () => {
    if (!keyInput.trim()) { toast('Please enter your Groq API key', 'warning'); return; }
    setApiKey(keyInput.trim());
    localStorage.setItem('GROQ_API_KEY', keyInput.trim());
    setConnected(true);
    toast('Groq AI connected successfully!', 'success');
  };

  const fetchInsights = async () => {
    if (!connected) { toast('Connect your Groq API key first', 'warning'); return; }
    setLoadingInsights(true);
    try {
      const fd = new FormData();
      fd.append('session_id', dataset!.sessionId);
      fd.append('api_key', apiKey);
      const res = await apiClient.post('/llm/insights', fd);
      setInsights(Array.isArray(res.data.insights) ? res.data.insights : []);
      toast('Insights generated!', 'success');
    } catch {
      toast('Failed to generate insights. Check your API key.', 'error');
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchStory = async () => {
    if (!connected) { toast('Connect your Groq API key first', 'warning'); return; }
    setLoadingStory(true);
    try {
      const fd = new FormData();
      fd.append('session_id', dataset!.sessionId);
      fd.append('api_key', apiKey);
      const res = await apiClient.post('/llm/story', fd);
      setStory(res.data.story);
      toast('Data story generated!', 'success');
    } catch {
      toast('Failed to generate story. Check your API key.', 'error');
    } finally {
      setLoadingStory(false);
    }
  };

  const sendChat = async (question?: string) => {
    const q = question || chatInput.trim();
    if (!q) return;
    if (!connected) { toast('Connect your Groq API key first', 'warning'); return; }
    const userMsg: ChatMessage = { role: 'user', content: q };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await apiClient.post('/llm/chat', {
        session_id: dataset!.sessionId,
        query: q,
        history: chatMessages,
        api_key: apiKey,
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch {
      toast('Chat failed. Check your API key.', 'error');
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <h1 className="text-xl font-bold text-white">LLM Insights</h1>

      {/* API Key Card */}
      {!connected ? (
        <div className="glass-card p-6 max-w-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Lock className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Connect Groq AI</h3>
              <p className="text-[11px] text-slate-500">Required to generate insights and chat</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="gsk_..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button onClick={handleConnect} className="btn-primary px-4 py-2 text-sm">
              Connect
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-2">Get your free key at <span className="text-indigo-400">console.groq.com</span> · Stored in localStorage</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl w-fit" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">Groq AI Connected</span>
          <button onClick={() => { setConnected(false); localStorage.removeItem('GROQ_API_KEY'); setApiKey(''); }} className="text-[11px] text-slate-500 hover:text-slate-300 ml-2">Disconnect</button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-5">
        {/* Insights + Story (3/5) */}
        <div className="col-span-3 space-y-4">
          <div className="flex gap-3">
            <button
              onClick={fetchInsights}
              disabled={loadingInsights}
              className="btn-primary flex-1"
            >
              {loadingInsights ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loadingInsights ? 'Generating...' : 'Generate Key Insights'}
            </button>
            <button
              onClick={fetchStory}
              disabled={loadingStory}
              className="btn-secondary flex-1"
            >
              {loadingStory ? <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" /> : <BookOpen className="w-4 h-4 text-cyan-400" />}
              {loadingStory ? 'Writing...' : 'Generate Data Story'}
            </button>
          </div>

          <AnimatePresence>
            {insights && (
              <div className="space-y-2">
                {insights.map((insight: any, i: number) => {
                  const style = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES['Distribution'];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="p-4 rounded-xl"
                      style={{ background: style.bg, borderLeft: `3px solid ${style.border}`, border: `1px solid ${style.border}30` }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="badge" style={{ background: style.bg, color: style.color }}>{insight.category}</span>
                        {insight.confidence && (
                          <span className="text-[10px] text-slate-500">· {insight.confidence} confidence</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">{insight.insight}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {story && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Data Story</h3>
                </div>
                <div className="space-y-3">
                  {story.split('\n').filter(Boolean).map((p, i) => (
                    <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Panel (2/5) */}
        <div className="col-span-2 glass-card-static flex flex-col" style={{ height: '520px' }}>
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Chat with Dataset</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 text-center mb-3">Try a suggested question:</p>
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendChat(q)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[85%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? { background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.3)', color: '#E0E7FF', borderBottomRightRadius: '4px' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#CBD5E1', borderBottomLeftRadius: '4px' }
                  }
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask anything about the dataset..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !chatLoading && sendChat()}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none px-3 py-2 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                onClick={() => sendChat()}
                disabled={chatLoading || !chatInput.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMInsights;
