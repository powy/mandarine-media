from typing import Any, Dict, List, Optional, Union, Annotated
from pydantic import field_validator, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "KYOOL Media Platform"
    
    # Environment
    ENVIRONMENT: str = "local"
    
    # CORS
    CORS_ORIGINS: str = ""
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list."""
        if not self.CORS_ORIGINS.strip():
            return []
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    # Database
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    DATABASE_URI: Optional[str] = None
    
    @field_validator("DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info) -> str:
        if isinstance(v, str):
            return v
        values = info.data if hasattr(info, 'data') else {}
        # Only assemble postgres URI if we have all postgres fields
        if all(values.get(key) for key in ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_SERVER', 'POSTGRES_DB']):
            return f"postgresql://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}@{values.get('POSTGRES_SERVER')}/{values.get('POSTGRES_DB')}"
        # Default to SQLite for development
        return "sqlite:///./kyool_media.db"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    
    # API Settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # File Upload Storage Configuration
    UPLOAD_LOCAL_STORAGE_PATH: str = "./uploads"
    UPLOAD_LOCAL_BASE_URL: str = "http://localhost:8000/files"
    
    # S3 Configuration
    UPLOAD_S3_BUCKET_NAME: Optional[str] = None
    UPLOAD_S3_REGION: str = "us-east-1"
    UPLOAD_S3_ACCESS_KEY: Optional[str] = None
    UPLOAD_S3_SECRET_KEY: Optional[str] = None
    UPLOAD_S3_ENDPOINT_URL: Optional[str] = None  # For S3-compatible services
    UPLOAD_S3_ACL: str = "private"
    
    # Mux Configuration
    UPLOAD_MUX_TOKEN_ID: Optional[str] = None
    UPLOAD_MUX_TOKEN_SECRET: Optional[str] = None
    UPLOAD_MUX_WEBHOOK_URL: Optional[str] = None
    UPLOAD_MUX_ENCODING_TIER: str = "baseline"
    
    # Backend Selection for Media Types
    UPLOAD_VIDEO_BACKEND: str = "local"  # local, s3, mux
    UPLOAD_WEBCOMIC_BACKEND: str = "local"  # local, s3
    
    def get_upload_config(self) -> Dict[str, Any]:
        """Get complete upload configuration for the MediaUploadService."""
        config = {
            "backends": {},
            "media_types": {
                "video": {"backend": self.UPLOAD_VIDEO_BACKEND},
                "webtoon": {"backend": self.UPLOAD_WEBCOMIC_BACKEND},
                "trailer": {"backend": self.UPLOAD_VIDEO_BACKEND},
                "teaser": {"backend": self.UPLOAD_VIDEO_BACKEND},
                "excerpt": {"backend": self.UPLOAD_VIDEO_BACKEND},
            }
        }
        
        # Local storage configuration
        config["backends"]["local"] = {
            "storage_path": self.UPLOAD_LOCAL_STORAGE_PATH,
            "base_url": self.UPLOAD_LOCAL_BASE_URL,
            "max_file_size": 100 * 1024 * 1024 * 1024,  # 100GB
        }
        
        # S3 configuration (only if credentials provided)
        if self.UPLOAD_S3_BUCKET_NAME and self.UPLOAD_S3_ACCESS_KEY and self.UPLOAD_S3_SECRET_KEY:
            config["backends"]["s3"] = {
                "bucket_name": self.UPLOAD_S3_BUCKET_NAME,
                "region": self.UPLOAD_S3_REGION,
                "access_key": self.UPLOAD_S3_ACCESS_KEY,
                "secret_key": self.UPLOAD_S3_SECRET_KEY,
                "endpoint_url": self.UPLOAD_S3_ENDPOINT_URL,
                "acl": self.UPLOAD_S3_ACL,
                "max_file_size": 100 * 1024 * 1024 * 1024,  # 100GB
            }
        
        # Mux configuration (only if credentials provided)
        if self.UPLOAD_MUX_TOKEN_ID and self.UPLOAD_MUX_TOKEN_SECRET:
            config["backends"]["mux"] = {
                "token_id": self.UPLOAD_MUX_TOKEN_ID,
                "token_secret": self.UPLOAD_MUX_TOKEN_SECRET,
                "webhook_url": self.UPLOAD_MUX_WEBHOOK_URL,
                "encoding_tier": self.UPLOAD_MUX_ENCODING_TIER,
                "max_file_size": 100 * 1024 * 1024 * 1024,  # 100GB
            }
        
        return config
    
    model_config = {
        "env_file": [".env.test", ".env.local", ".env"],
        "case_sensitive": True
    }


settings = Settings()