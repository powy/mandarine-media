# =============================================================================
# Compute module — ECR repository + Lambda function
# =============================================================================
#
# Division of responsibility:
#   - Terraform owns: Lambda config (memory, timeout, VPC, env vars, IAM role)
#   - boto3 scripts own: Docker build, ECR push, Lambda image updates
#   - `lifecycle { ignore_changes = [image_uri] }` ensures Terraform never
#     rolls back an image update made by the CI/CD deploy scripts.

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

variable "lambda_role_arn" {
  description = "ARN of the IAM role for Lambda execution"
  type        = string
}

variable "lambda_security_group_ids" {
  description = "Security group IDs for Lambda VPC config"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for Lambda VPC config"
  type        = list(string)
}

variable "lambda_image_uri" {
  type = string
}

variable "lambda_env_vars" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  sensitive   = true
  default     = {}
}

locals {
  function_name = "kyool-api-${var.environment}"
  ecr_repo_name = "kyool-api-${var.environment}"
}

# ---------------------------------------------------------------------------
# ECR repository
# ---------------------------------------------------------------------------

resource "aws_ecr_repository" "main" {
  name                 = local.ecr_repo_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = local.ecr_repo_name
  }
}

# Lifecycle policy — keep only the last 10 images to control storage costs
resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.main.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# Lambda function
# ---------------------------------------------------------------------------

resource "aws_lambda_function" "main" {
  function_name = local.function_name
  role          = var.lambda_role_arn
  description   = "KYOOL Media Platform API - ${var.environment}"

  # Container image deployment
  package_type = "Image"
  image_uri    = var.lambda_image_uri

  # Runtime configuration — matches config.py values
  memory_size   = 2048
  timeout       = 30
  architectures = ["x86_64"]

  # VPC configuration — Lambda must reach RDS in private subnets
  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = var.lambda_security_group_ids
  }

  # Environment variables — sensitive values passed via var.lambda_env_vars
  environment {
    variables = var.lambda_env_vars
  }

  tags = {
    Name = local.function_name
  }

  lifecycle {
    # image_uri is managed by boto3 deploy scripts (04_update_lambda.py).
    # Terraform must NOT revert image updates made by the CI/CD pipeline.
    ignore_changes = [image_uri]
  }
}

# ---------------------------------------------------------------------------
# CloudWatch log group — pre-create with retention so Lambda doesn't auto-create it
# without a retention policy. Managed by observability module, referenced here.
# ---------------------------------------------------------------------------
