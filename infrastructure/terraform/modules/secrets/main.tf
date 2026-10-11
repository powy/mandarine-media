# =============================================================================
# Secrets module — Secrets Manager, SSM Parameter Store, KMS
# =============================================================================
#
# This module documents the secret structure used by the kyool-api Lambda.
# Actual secret VALUES are never stored in Terraform state here.
#
# Secret values are managed out-of-band (AWS console or CLI).
# Terraform only manages the secret/parameter metadata (name, description, KMS key).

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

# ---------------------------------------------------------------------------
# KMS key — used to encrypt Secrets Manager secrets and SSM parameters
# ---------------------------------------------------------------------------

resource "aws_kms_key" "kyool_media" {
  description             = "KMS key for kyool-media secrets encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "kyool-media-${var.environment}-key"
  }
}

resource "aws_kms_alias" "kyool_media" {
  name          = "alias/kyool-media-${var.environment}"
  target_key_id = aws_kms_key.kyool_media.key_id
}

# ---------------------------------------------------------------------------
# Secrets Manager — document the secret paths used by the application
# Values are NOT set by Terraform; manage via console or AWS CLI.
# ---------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "kyool-media/${var.environment}/db-credentials"
  description = "PostgreSQL master credentials for kyool-api-${var.environment}-db"
  kms_key_id  = aws_kms_key.kyool_media.arn

  recovery_window_in_days = 30

  tags = {
    Name = "kyool-media/${var.environment}/db-credentials"
  }
}

resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "kyool-media/${var.environment}/app-secrets"
  description = "Application secrets for kyool-api Lambda (SECRET_KEY, MUX keys, SMTP)"
  kms_key_id  = aws_kms_key.kyool_media.arn

  recovery_window_in_days = 30

  tags = {
    Name = "kyool-media/${var.environment}/app-secrets"
  }
}

# ---------------------------------------------------------------------------
# SSM Parameter Store — non-secret configuration values
# ---------------------------------------------------------------------------

resource "aws_ssm_parameter" "api_gateway_base_path" {
  name        = "/kyool-media/${var.environment}/api_gateway_base_path"
  description = "API Gateway base path prefix for Lambda handler"
  type        = "String"
  value       = "/${var.environment}"

  tags = {
    Name = "/kyool-media/${var.environment}/api_gateway_base_path"
  }
}
