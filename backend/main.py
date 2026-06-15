from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.router import router

app = FastAPI(
    title="DataPilot AI API",
    description="Backend API for DataPilot AI - Automated EDA, LLM Insights, and AutoML Platform",
    version="1.0.0"
)

# Allow CORS for all origins during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"message": "DataPilot AI API is running!"}
