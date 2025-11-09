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
# LAMBDA CONFIGURATION
# ============================================================================

# Lambda function settings
LAMBDA_MEMORY_SIZE = 2048  # MB (FastAPI benefits from more memory)
LAMBDA_TIMEOUT = 30  # seconds (API Gateway max is 30s)
LAMBDA_ARCHITECTURE = "x86_64"  # or "arm64" for Graviton2

# Lambda handler path in the container
LAMBDA_HANDLER = "app.lambda_handler.lambda_handler"

# Lambda environment variables (non-sensitive)
# Sensitive values should be stored in AWS Secrets Manager
LAMBDA_ENVIRONMENT_VARS = {
    "ENVIRONMENT": ENVIRONMENT,
    "API_HOST": "0.0.0.0",
    "API_PORT": "8000",
    # For custom domain (api.kyool.eu): no stage prefix, use empty string
    # For direct API Gateway URL: set to "/production" to strip stage from path
    "API_GATEWAY_BASE_PATH": "",  # Empty for custom domain usage
}

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
# SCRIPT CONFIGURATION
# ============================================================================

# Enable verbose logging
VERBOSE = os.getenv("VERBOSE", "false").lower() == "true"

# Dry run mode (show what would be done without executing)
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"

# ============================================================================
# HELPER FUNCTIONS
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
