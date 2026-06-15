from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import pandas as pd
import io
import traceback
from core.state import get_session_data, set_session_data, generate_session_id
from services.eda_service import basic_eda, intermediate_eda, advanced_eda
from services.ml_service import preprocess_data, train_models
from services.llm_service import generate_insights, generate_data_story, chat_with_dataset, explain_model
from groq import Groq
router = APIRouter()

class GroqKeyDep(BaseModel):
    api_key: Optional[str] = None

class PreprocessRequest(BaseModel):
    session_id: str
    target_column: str
    problem_type: str
    options: Dict[str, Any]

class TrainRequest(BaseModel):
    session_id: str

class ChatRequest(BaseModel):
    session_id: str
    query: str
    history: List[Dict[str, str]]
    api_key: str

class ExplainRequest(BaseModel):
    session_id: str
    model_name: str
    api_key: str

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        session_id = generate_session_id()
        set_session_data(session_id, df, file.filename)
        
        return {
            "session_id": session_id,
            "filename": file.filename,
            "rows": df.shape[0],
            "columns": df.shape[1],
            "file_size": len(content)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/eda/basic/{session_id}")
async def get_basic_eda(session_id: str):
    data = get_session_data(session_id)
    return basic_eda(data["df"])

@router.get("/eda/intermediate/{session_id}")
async def get_intermediate_eda(session_id: str):
    data = get_session_data(session_id)
    return intermediate_eda(data["df"])

@router.get("/eda/advanced/{session_id}")
async def get_advanced_eda(session_id: str):
    data = get_session_data(session_id)
    return advanced_eda(data["df"])

@router.post("/llm/insights")
async def get_llm_insights(session_id: str = Form(...), api_key: str = Form(...)):
    try:
        client = Groq(api_key=api_key)
        data = get_session_data(session_id)
        stats = basic_eda(data["df"])
        # Simplify stats to avoid token limits
        summary = f"Rows: {stats['shape']['rows']}, Cols: {stats['shape']['cols']}\nMissing Values: {stats['missing_values']}\nDtypes: {stats['dtypes']}"
        insights = generate_insights(client, summary)
        return {"insights": insights}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/llm/story")
async def get_data_story(session_id: str = Form(...), api_key: str = Form(...)):
    try:
        client = Groq(api_key=api_key)
        data = get_session_data(session_id)
        stats = basic_eda(data["df"])
        summary = f"Rows: {stats['shape']['rows']}, Cols: {stats['shape']['cols']}\nMissing Values: {stats['missing_values']}\nDtypes: {stats['dtypes']}"
        story = generate_data_story(client, summary)
        return {"story": story}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/llm/chat")
async def chat_dataset(req: ChatRequest):
    try:
        client = Groq(api_key=req.api_key)
        data = get_session_data(req.session_id)
        stats = basic_eda(data["df"])
        summary = f"Columns: {list(data['df'].columns)}\nShape: {data['df'].shape}\nMissing: {stats['missing_values']}"
        response = chat_with_dataset(client, req.query, summary, req.history)
        return {"response": response}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/preprocess")
async def preprocess(req: PreprocessRequest):
    data = get_session_data(req.session_id)
    try:
        clean_df = preprocess_data(data["df"], req.options)
        data["preprocessing"] = req.options
        data["clean_df"] = clean_df
        data["target"] = req.target_column
        data["problem_type"] = req.problem_type
        
        return {
            "status": "success",
            "new_shape": {"rows": clean_df.shape[0], "cols": clean_df.shape[1]},
            "null_count": int(clean_df.isnull().sum().sum())
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/automl/train")
async def run_automl(req: TrainRequest):
    data = get_session_data(req.session_id)
    if "clean_df" not in data or not data["target"]:
        raise HTTPException(status_code=400, detail="Data not preprocessed or target not set")
        
    try:
        results = train_models(data["clean_df"], data["target"], data["problem_type"])
        data["models"] = results
        return {"status": "success", "leaderboard": results}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/automl/results/{session_id}")
async def get_automl_results(session_id: str):
    data = get_session_data(session_id)
    return {"leaderboard": data.get("models", [])}

@router.post("/automl/explain")
async def explain_automl_model(req: ExplainRequest):
    data = get_session_data(req.session_id)
    models = data.get("models", [])
    model_data = next((m for m in models if m["model"] == req.model_name), None)
    if not model_data:
        raise HTTPException(status_code=404, detail="Model not found")
        
    explanation = explain_model(req.model_name, model_data["metrics"], model_data["feature_importance"], req.api_key)
    return {"explanation": explanation}
