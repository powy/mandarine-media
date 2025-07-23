from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title="KYOOL Media Platform API",
    description="Media platform backend for video content and web-comics",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

if settings.cors_origins_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "KYOOL Media Platform API v1.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}