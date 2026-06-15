from typing import Dict, Any
import pandas as pd
import uuid

# In-memory storage for datasets during the session
# Key: session_id (str)
# Value: Dict containing 'df' (pandas DataFrame), 'filename' (str), 'preprocessing' (dict)
DATASETS_STORE: Dict[str, Dict[str, Any]] = {}

def get_session_data(session_id: str) -> Dict[str, Any]:
    if session_id not in DATASETS_STORE:
        raise ValueError("Session ID not found or expired.")
    return DATASETS_STORE[session_id]

def set_session_data(session_id: str, df: pd.DataFrame, filename: str):
    DATASETS_STORE[session_id] = {
        "df": df,
        "filename": filename,
        "preprocessing": {},
        "models": {},
        "target": None,
        "problem_type": None
    }

def generate_session_id() -> str:
    return str(uuid.uuid4())
