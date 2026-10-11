# =============================================================================
# IAM module — Lambda execution role, inline policy, managed policy attachments
# =============================================================================

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region (used in KMS condition to avoid hardcoded us-east-1 bug)"
  type        = string
}

variable "storage_bucket_arns" {
  type = list(string)
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

locals {
  role_name = "kyool-api-${var.environment}-lambda-role"
}

# ---------------------------------------------------------------------------
# Trust policy — allows Lambda service to assume this role
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# ---------------------------------------------------------------------------
# IAM role
# ---------------------------------------------------------------------------

resource "aws_iam_role" "lambda_exec" {
  name               = local.role_name
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
  description        = "Lambda execution role for kyool-api-${var.environment}"

  tags = {
    Name = local.role_name
  }
}

# ---------------------------------------------------------------------------
# Inline policy — mirrors iam-lambda-policy.json with KMS region bug fixed:
#   Original had "secretsmanager.us-east-1.amazonaws.com" hardcoded.
#   Fixed to use var.aws_region (eu-west-3 for production).
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_inline" {
  # CloudWatch Logs
  statement {
    sid    = "CloudWatchLogsAccess"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }

  # S3 media storage
  statement {
    sid    = "S3MediaStorageAccess"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = concat(var.storage_bucket_arns, [for arn in var.storage_bucket_arns : "${arn}/*"])
  }

  # Secrets Manager
  statement {
    sid    = "SecretsManagerAccess"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = ["arn:aws:secretsmanager:*:*:secret:kyool-media/*"]
  }

  # RDS describe (Lambda does not need DML access — that's via DATABASE_URI)
  statement {
    sid    = "RDSAccess"
    effect = "Allow"
    actions = [
      "rds:DescribeDBInstances",
      "rds:DescribeDBClusters",
    ]
    resources = ["*"]
  }

  # VPC network interface management (required for Lambda in VPC)
  statement {
    sid    = "VPCNetworkAccess"
    effect = "Allow"
    actions = [
      "ec2:CreateNetworkInterface",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DeleteNetworkInterface",
      "ec2:AssignPrivateIpAddresses",
      "ec2:UnassignPrivateIpAddresses",
    ]
    resources = ["*"]
  }

  # SSM Parameter Store
  statement {
    sid    = "SSMParameterStoreAccess"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = ["arn:aws:ssm:*:*:parameter/kyool-media/*"]
  }

  # KMS decryption — BUG FIX: use var.aws_region instead of hardcoded "us-east-1"
  # The original iam-lambda-policy.json had us-east-1 here but resources are in eu-west-3.
  statement {
    sid    = "KMSDecryptionAccess"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values = [
        "secretsmanager.${var.aws_region}.amazonaws.com",
        "ssm.${var.aws_region}.amazonaws.com",
      ]
    }
  }
}

resource "aws_iam_role_policy" "lambda_inline" {
  name   = "${local.role_name}-inline"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.lambda_inline.json
}

# ---------------------------------------------------------------------------
# Managed policy attachments
# ---------------------------------------------------------------------------

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
