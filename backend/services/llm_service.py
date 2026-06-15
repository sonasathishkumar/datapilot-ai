from groq import Groq
import os
from typing import List, Dict, Any
import json

def get_groq_client(api_key: str = None):
    key = api_key or os.environ.get("GROQ_API_KEY")
    if not key:
        raise ValueError("Groq API Key is not set.")
    return Groq(api_key=key)

def generate_insights(client: Groq, stats_summary: str) -> List[Dict[str, str]]:
    prompt = f"""
    You are an expert Data Scientist. I have run EDA on a dataset and here is the summary of the statistics:
    {stats_summary}
    
    Please provide 5 to 8 key bullet-point insights about this dataset.
    Cover data quality issues, notable distributions, correlations, and potential ML concerns.
    Format your response as a JSON list of objects, where each object has:
    - "insight": The text of the insight.
    - "category": One of "Data Quality", "Distribution", "Correlation", "ML Readiness"
    - "confidence": A string like "High", "Medium", or "Low"
    
    Return ONLY valid JSON.
    """
    
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    
    try:
        content = response.choices[0].message.content
        data = json.loads(content)
        # Handle cases where the LLM wraps the list in a dict
        if isinstance(data, dict):
            for key, val in data.items():
                if isinstance(val, list):
                    return val
            return [data]
        return data
    except Exception as e:
        return [{"insight": f"Failed to parse insights: {str(e)}", "category": "Data Quality", "confidence": "Low"}]

def generate_data_story(client: Groq, stats_summary: str) -> str:
    prompt = f"""
    You are an expert Data Scientist and Storyteller. Based on the following dataset statistics:
    {stats_summary}
    
    Write a cohesive, engaging 300-word narrative about what this dataset likely represents, 
    what the key patterns or anomalies are, and what machine learning problem it is best suited for.
    Use clear paragraphs. Do not use markdown bullet points if possible, write in a narrative style.
    """
    
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.5
    )
    
    return response.choices[0].message.content

def chat_with_dataset(client: Groq, query: str, stats_summary: str, history: List[Dict[str, str]]) -> str:
    
    messages = [
        {"role": "system", "content": f"You are DataPilot AI, an expert data science assistant. Here is the dataset context:\n{stats_summary}\n\nAnswer the user's questions about this dataset concisely and accurately."}
    ]
    
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    messages.append({"role": "user", "content": query})
    
    response = client.chat.completions.create(
        messages=messages,
        model="llama-3.3-70b-versatile",
        temperature=0.4
    )
    
    return response.choices[0].message.content

def explain_model(model_name: str, metrics: Dict[str, Any], feature_importance: List[Dict[str, Any]], api_key: str = None) -> str:
    client = get_groq_client(api_key)
    
    prompt = f"""
    You are an expert Data Scientist. Explain the performance of the {model_name} model.
    Metrics achieved: {json.dumps(metrics)}
    Top Features by Importance: {json.dumps(feature_importance)}
    
    Explain in plain English why this model might have performed the way it did based on these metrics.
    Provide actionable suggestions for improvement (e.g., feature engineering, more data, hyperparameter tuning).
    Write 2-3 short paragraphs.
    """
    
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.5
    )
    
    return response.choices[0].message.content
