"""
Centralized configuration for AWS Lambda deployment scripts.

This module contains all configuration settings for deploying the KYOOL Media
Platform API to AWS Lambda. Modify these settings for your environment.

For staging environment (future):
- Change ENVIRONMENT to 'staging'
- All resource names will automatically include 'staging' suffix
"""

import os
from pathlib import Path
from typing import Dict

# ============================================================================
# HELPER FUNCTIONS (defined early for use in configuration)
# ============================================================================


def load_env_file(env_file_path: Path) -> Dict[str, str]:
    """
    Load environment variables from a .env file.
    Handles both standard format and files with unusual spacing/formatting.

    Args:
        env_file_path: Path to the .env file

    Returns:
        Dictionary of environment variable key-value pairs
    """
    import re
    env_vars = {}

    if not env_file_path.exists():
        print(f"Warning: Environment file not found: {env_file_path}")
        return env_vars

    try:
        with open(env_file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pattern to match KEY=value, handling various formats
        # Matches: KEY=value where KEY is uppercase letters/underscores
        # and value can contain anything until the next KEY= or end of string
        pattern = r'([A-Z_][A-Z0-9_]*)\s*=\s*([^\n]*?)(?=\s+[A-Z_][A-Z0-9_]*\s*=|$)'

        matches = re.findall(pattern, content, re.MULTILINE | re.DOTALL)

        for key, value in matches:
            key = key.strip()
            value = value.strip()

            # Skip if empty
            if not key or not value:
                continue

            # Remove quotes if present
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1]

            # Clean up any trailing comments or whitespace
            # Stop at # unless it's within a value that was quoted
            if '#' in value and not (value.count('"') >= 2 or value.count("'") >= 2):
                value = value.split('#')[0].strip()

            env_vars[key] = value

    except Exception as e:
        print(f"Error loading environment file {env_file_path}: {e}")
        import traceback
        traceback.print_exc()

    return env_vars


# ============================================================================
# ENVIRONMENT CONFIGURATION
# ============================================================================

# Environment name: 'production' or 'staging'
ENVIRONMENT = os.getenv("DEPLOY_ENV", "production")

# AWS Region where resources will be deployed
AWS_REGION = os.getenv("AWS_REGION", "eu-west-3")

# AWS Account ID (optional - will be auto-detected if not provided)
AWS_ACCOUNT_ID = os.getenv("AWS_ACCOUNT_ID", None)

# ============================================================================
# RESOURCE NAMING
# ============================================================================

# Base name for all resources (will be suffixed with environment)
PROJECT_NAME = "kyool-api"

# Full resource name with environment suffix
RESOURCE_NAME = f"{PROJECT_NAME}-{ENVIRONMENT}"

# Specific resource names
ECR_REPOSITORY_NAME = RESOURCE_NAME
LAMBDA_FUNCTION_NAME = RESOURCE_NAME
API_GATEWAY_NAME = f"{RESOURCE_NAME}-gateway"
IAM_ROLE_NAME = f"{RESOURCE_NAME}-lambda-role"

# ============================================================================
# DOCKER CONFIGURATION
# ============================================================================

# Path to Dockerfile for Lambda
DOCKERFILE_NAME = "Dockerfile.lambda"

# Docker image tag
IMAGE_TAG = "latest"

# Full image name (ECR URI will be constructed in scripts)
IMAGE_NAME = f"{ECR_REPOSITORY_NAME}:{IMAGE_TAG}"

# ============================================================================
# PATH CONFIGURATION
# ============================================================================

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent.absolute()

# Deploy directory
DEPLOY_DIR = Path(__file__).parent.absolute()

# Backend directory
BACKEND_DIR = PROJECT_ROOT

# Environment file paths
ENV_PRODUCTION_TEMPLATE = DEPLOY_DIR / ".env.production.template"
ENV_PRODUCTION_FILE = BACKEND_DIR / ".env.production"

# ============================================================================
# LAMBDA CONFIGURATION
# ============================================================================

# Lambda function settings
LAMBDA_MEMORY_SIZE = 2048  # MB (FastAPI benefits from more memory)
LAMBDA_TIMEOUT = 30  # seconds (API Gateway max is 30s)
LAMBDA_ARCHITECTURE = "x86_64"  # or "arm64" for Graviton2

# Lambda handler path in the container
LAMBDA_HANDLER = "app.lambda_handler.lambda_handler"

# Lambda environment variables
# Load essential variables from .env.production file
# Note: Lambda has a 4KB limit for environment variables, so we filter out large values
# Large/sensitive values (like private keys) are loaded from .env file in the container
_env_file_vars = load_env_file(ENV_PRODUCTION_FILE)

# List of essential variables to include (others are loaded from .env file in container)
# Only include variables that:
# 1. Are needed before app initialization (DATABASE_URI, ENVIRONMENT, etc.)
# 2. Override defaults (API_GATEWAY_BASE_PATH)
# 3. Are small in size
_essential_vars = {
    "DATABASE_URI",
    "ENVIRONMENT",
    "POSTGRES_SERVER",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "SECRET_KEY",
    "API_HOST",
    "API_PORT",
}

# Filter environment file variables to only essential ones
_filtered_env_vars = {k: v for k, v in _env_file_vars.items() if k in _essential_vars}

# Base Lambda configuration (these override .env file if present)
_lambda_base_config = {
    "ENVIRONMENT": ENVIRONMENT,
    "API_HOST": "0.0.0.0",
    "API_PORT": "8000",
    # Set to "/production" to strip the stage prefix from incoming paths
    # This is needed because API Gateway is passing /production/api/v1/... to Lambda
    "API_GATEWAY_BASE_PATH": "/production",
}

# Merge: filtered .env.production variables first, then override with Lambda-specific config
LAMBDA_ENVIRONMENT_VARS = {**_filtered_env_vars, **_lambda_base_config}

# VPC Configuration (set these if Lambda needs to access RDS in VPC)
LAMBDA_VPC_SUBNET_IDS = (
    os.getenv("VPC_SUBNET_IDS", "").split(",") if os.getenv("VPC_SUBNET_IDS") else None
)
LAMBDA_VPC_SECURITY_GROUP_IDS = (
    os.getenv("VPC_SECURITY_GROUP_IDS", "").split(",")
    if os.getenv("VPC_SECURITY_GROUP_IDS")
    else None
)

# ============================================================================
# API GATEWAY CONFIGURATION
# ============================================================================

# API Gateway type: 'HTTP' (simpler, cheaper) or 'REST' (more features)
API_GATEWAY_TYPE = "HTTP"

# API Gateway stage name
API_STAGE_NAME = ENVIRONMENT

# CORS configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Local development
    "http://localhost:3001",  # Local development
    "http://localhost:3002",  # Local development
    "http://127.0.0.1:3002",  # Local dev alternative
    "http://localhost:4173",  # Vite dev server
    "http://localhost:5173",  # Vite dev server
    "http://localhost:19006",  # React Native local
    "http://localhost:8081",  # Metro bundler
    "http://10.0.2.2:19006",  # Android emulator
    "http://203.0.113.10:3002",  # Remote dev
    "http://203.0.113.10:8000",  # Remote API
    "https://kyool.eu",  # Production
    "https://www.kyool.eu",  # Production alias
    "https://kyool.fr",  # French domain
    "https://www.kyool.fr",  # French alias
    "https://backoffice.kyool.eu",  # Backoffice EU
    "https://backoffice.kyool.fr",  # Backoffice FR
    "https://stage.kyool.eu",  # Staging EU
    "https://stage.kyool.fr",  # Staging FR
    "https://dev.kyool.eu",  # Dev EU
    "https://dev.kyool.fr",  # Dev FR
    "https://d111111abcdef8.cloudfront.net",  # CloudFront CDN
    "https://example-backoffice.s3.eu-west-3.amazonaws.com",  # S3 static backoffice
    # API itself (safe to include)
    "https://api.kyool.eu",
]

CORS_ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
# Use wildcard to allow all headers (matches FastAPI CORS middleware)
# This prevents API Gateway from blocking requests with cache-control, pragma, etc.
CORS_ALLOWED_HEADERS = ["*"]

# ============================================================================
# IAM POLICY CONFIGURATION
# ============================================================================

# Path to IAM policy JSON template
IAM_POLICY_TEMPLATE_PATH = Path(__file__).parent / "iam-lambda-policy.json"

# Managed policies to attach to Lambda role
MANAGED_POLICY_ARNS = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",  # CloudWatch Logs
    "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",  # VPC access (if needed)
]

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# RDS instance identifier (if using RDS)
RDS_INSTANCE_ID = os.getenv("RDS_INSTANCE_ID", f"{RESOURCE_NAME}-db")

# Database connection will be configured via environment variables or Secrets Manager

# ============================================================================
# SCRIPT CONFIGURATION
# ============================================================================

# Enable verbose logging
VERBOSE = os.getenv("VERBOSE", "false").lower() == "true"

# Dry run mode (show what would be done without executing)
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"

# ============================================================================
# ADDITIONAL HELPER FUNCTIONS
# ============================================================================


def get_ecr_uri(account_id: str = None, region: str = None) -> str:
    """
    Construct the ECR repository URI.

    Args:
        account_id: AWS account ID (auto-detected if not provided)
        region: AWS region (uses AWS_REGION if not provided)

    Returns:
        Full ECR repository URI
    """
    region = region or AWS_REGION
    if not account_id:
        # Will need to be detected at runtime
        raise ValueError("AWS Account ID required to construct ECR URI")
    return f"{account_id}.dkr.ecr.{region}.amazonaws.com/{ECR_REPOSITORY_NAME}"


def get_full_image_name(account_id: str, region: str = None) -> str:
    """
    Get the full Docker image name with ECR URI.

    Args:
        account_id: AWS account ID
        region: AWS region (uses AWS_REGION if not provided)

    Returns:
        Full image name with tag
    """
    ecr_uri = get_ecr_uri(account_id, region)
    return f"{ecr_uri}:{IMAGE_TAG}"


def print_config():
    """Print current configuration (for debugging)."""
    print("=" * 70)
    print("DEPLOYMENT CONFIGURATION")
    print("=" * 70)
    print(f"Environment:           {ENVIRONMENT}")
    print(f"AWS Region:            {AWS_REGION}")
    print(f"Project Name:          {PROJECT_NAME}")
    print(f"Resource Name:         {RESOURCE_NAME}")
    print(f"ECR Repository:        {ECR_REPOSITORY_NAME}")
    print(f"Lambda Function:       {LAMBDA_FUNCTION_NAME}")
    print(f"API Gateway:           {API_GATEWAY_NAME}")
    print(f"Lambda Memory:         {LAMBDA_MEMORY_SIZE} MB")
    print(f"Lambda Timeout:        {LAMBDA_TIMEOUT} seconds")
    print(f"VPC Enabled:           {'Yes' if LAMBDA_VPC_SUBNET_IDS else 'No'}")
    print("=" * 70)


if __name__ == "__main__":
    # Print configuration when run directly
    print_config()
