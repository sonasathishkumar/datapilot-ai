# DataPilot AI 🚀

DataPilot AI is an end-to-end Automated Exploratory Data Analysis (EDA), LLM Insights, and AutoML platform. It allows users to upload a CSV dataset and get immediate insights, data preprocessing, and trained machine learning models without writing code.

## Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Recharts, Framer Motion
- **Backend**: Python, FastAPI, Pandas, Scikit-learn, XGBoost, LightGBM
- **LLM Integration**: Groq API (llama3-70b-8192 model)

## Folder Structure
- `/frontend` - Contains the React Single Page Application.
- `/backend` - Contains the FastAPI python backend.

## Local Setup Instructions

### 1. Backend Setup
Make sure you have Python 3.9+ installed.
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Run the backend server:
```bash
uvicorn main:app --reload --port 8000
```
The backend API will be available at `http://localhost:8000`.

### 2. Frontend Setup
Make sure you have Node.js and npm installed.
```bash
cd frontend
npm install
```

Run the development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Environment Variables
To use the LLM Insights module, you need a Groq API key.
You can either:
1. Provide it directly in the UI under the "LLM Insights" page.
2. Set it as an environment variable in your backend environment: `export GROQ_API_KEY=your_key_here`.

## Deployment
- **Frontend**: Connect the `frontend/` folder to Vercel for auto-deployment.
- **Backend**: Connect the `backend/` folder to Render.com as a Web Service using the command `uvicorn main:app --host 0.0.0.0 --port 10000`. Set the necessary environment variables in the Render dashboard.
