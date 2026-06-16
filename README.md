# 🚀 DataPilot AI — Automated Data Science Platform

> Upload a CSV. Get AI-powered insights in seconds.

**Live Demo:** https://datapilot-ai-seven.vercel.app

![DataPilot AI](https://img.shields.io/badge/Status-Live-brightgreen)
![React](https://img.shields.io/badge/React-TypeScript-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![Groq](https://img.shields.io/badge/LLM-Groq-orange)

---

## ✨ Features

- 📊 **Auto EDA** — Instant distributions, correlations, outlier detection across 3 levels
- 🤖 **LLM Insights** — AI-generated data insights and stories powered by Groq + LLaMA 3
- 💬 **Chat with Dataset** — Ask natural language questions about your data
- 🧹 **Smart Preprocessing** — Step-by-step wizard for cleaning and transforming data
- 🏋️ **AutoML** — Train 8 models in parallel, get ranked leaderboard with metrics
- 📄 **Report Export** — Download full PDF analysis report

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, Recharts, Framer Motion |
| Backend | FastAPI, Python |
| LLM | Groq API (LLaMA 3 70B) + LangChain |
| ML | Scikit-learn, XGBoost, LightGBM |
| Deployment | Vercel (Frontend) + Render (Backend) |

---

## 🚀 Live Demo

👉 **[datapilot-ai-seven.vercel.app](https://datapilot-ai-seven.vercel.app)**

> Note: Backend runs on Render free tier — first request may take 50 seconds to wake up.

---

## 🖥️ Local Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment
Get a free Groq API key at [console.groq.com](https://console.groq.com) and enter it in the app settings.

---

## 📁 Project Structure
datapilot-ai/

├── frontend/          # React + Vite + TypeScript

│   └── src/

│       ├── pages/     # Dashboard, EDA, LLM, Preprocessing, AutoML

│       ├── components/

│       └── api/

├── backend/           # FastAPI + Python

│   ├── api/           # Route handlers

│   ├── services/      # EDA, ML, LLM services

│   └── core/          # Session management
