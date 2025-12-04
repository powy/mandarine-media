from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api import deps
from app.core.config import settings
from app import schemas

router = APIRouter()


@router.get("/version")
def get_version() -> Dict[str, str]:
    """
    Get server version.
    Public endpoint - no authentication required.
    """
    return {"version": settings.SERVER_VERSION}


@router.get("/env-vars")
def get_env_vars(
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Dict[str, Any]:
    """
    Get environment variables and runtime health checks.
    Admin only.

    Returns safe config values excluding sensitive fields like passwords,
    secrets, keys, and tokens.
    """
    # List of sensitive field patterns to exclude
    sensitive_patterns = [
        "password", "secret", "key", "token", "private"
    ]

    # Explicitly sensitive fields (even if pattern doesn't match)
    explicitly_sensitive = {
        "DATABASE_URI",  # Contains password
        "SECRET_KEY",
        "POSTGRES_PASSWORD",
        "UPLOAD_S3_SECRET_KEY",
        "UPLOAD_MUX_TOKEN_SECRET",
        "MUX_PRIVATE_KEY",
    }

    # Get all settings fields
    environment_variables = {}
    sensitive_fields_excluded = []

    for field_name in dir(settings):
        # Skip private/magic methods and properties
        if field_name.startswith("_") or field_name in [
            "model_config", "model_fields", "model_computed_fields",
            "cors_origins_list", "get_upload_config"
        ]:
            continue

        # Get the value
        try:
            value = getattr(settings, field_name)
        except Exception:
            continue

        # Skip methods
        if callable(value):
            continue

        # Check if sensitive
        field_lower = field_name.lower()
        is_sensitive = (
            field_name in explicitly_sensitive or
            any(pattern in field_lower for pattern in sensitive_patterns)
        )

        if is_sensitive:
            sensitive_fields_excluded.append(field_name)
        else:
            # Convert to string for JSON serialization
            environment_variables[field_name] = str(value) if value is not None else None

    # Runtime health checks
    runtime_checks = {}

    # Database check
    try:
        db.execute(text("SELECT 1"))
        runtime_checks["database"] = {
            "status": "ok",
            "message": f"Connected to {settings.POSTGRES_SERVER or 'SQLite'}"
        }
    except Exception as e:
        runtime_checks["database"] = {
            "status": "error",
            "message": f"Database error: {str(e)}"
        }

    # S3 check
    if settings.UPLOAD_S3_BUCKET_NAME and settings.UPLOAD_S3_ACCESS_KEY:
        try:
            import boto3
            from botocore.config import Config

            s3_config = Config(
                connect_timeout=5,
                read_timeout=5,
                retries={'max_attempts': 1}
            )

            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.UPLOAD_S3_ACCESS_KEY,
                aws_secret_access_key=settings.UPLOAD_S3_SECRET_KEY,
                region_name=settings.UPLOAD_S3_REGION,
                endpoint_url=settings.UPLOAD_S3_ENDPOINT_URL,
                config=s3_config
            )

            s3_client.head_bucket(Bucket=settings.UPLOAD_S3_BUCKET_NAME)
            runtime_checks["s3"] = {
                "status": "ok",
                "message": f"Bucket '{settings.UPLOAD_S3_BUCKET_NAME}' accessible"
            }
        except Exception as e:
            runtime_checks["s3"] = {
                "status": "error",
                "message": f"S3 error: {str(e)}"
            }
    else:
        runtime_checks["s3"] = {
            "status": "not_configured",
            "message": "S3 credentials not configured"
        }

    # Mux check
    if settings.UPLOAD_MUX_TOKEN_ID and settings.UPLOAD_MUX_TOKEN_SECRET:
        try:
            import mux_python
            from mux_python.rest import ApiException

            # Configure Mux API
            configuration = mux_python.Configuration()
            configuration.username = settings.UPLOAD_MUX_TOKEN_ID
            configuration.password = settings.UPLOAD_MUX_TOKEN_SECRET

            # Create API instance with timeout
            videos_api = mux_python.VideosApi(mux_python.ApiClient(configuration))

            # Try to list videos (limit 1 for speed)
            videos_api.list_videos(limit=1)

            runtime_checks["mux"] = {
                "status": "ok",
                "message": "Mux API responding"
            }
        except ApiException as e:
            runtime_checks["mux"] = {
                "status": "error",
                "message": f"Mux API error: {e.status} - {e.reason}"
            }
        except Exception as e:
            runtime_checks["mux"] = {
                "status": "error",
                "message": f"Mux error: {str(e)}"
            }
    else:
        runtime_checks["mux"] = {
            "status": "not_configured",
            "message": "Mux credentials not configured"
        }

    return {
        "environment_variables": environment_variables,
        "runtime_checks": runtime_checks,
        "sensitive_fields_excluded": sorted(sensitive_fields_excluded)
    }
