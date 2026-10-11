# =============================================================================
# Observability module — CloudWatch log groups and retention policies
# =============================================================================
#
# Pre-creating log groups ensures they have:
#   - Retention policies (Lambda auto-creates without retention = logs never expire)
#   - KMS encryption (optional, add kms_key_id if desired)
#   - Consistent tags

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "lambda_function_name" {
  description = "Name of the Lambda function (log group path: /aws/lambda/<name>)"
  type        = string
}

# ---------------------------------------------------------------------------
# Lambda log group
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = 30

  tags = {
    Name = "/aws/lambda/${var.lambda_function_name}"
  }
}

# ---------------------------------------------------------------------------
# API Gateway log group (optional — enable access logging in stage if needed)
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigatewayv2/kyool-api-${var.environment}"
  retention_in_days = 14

  tags = {
    Name = "/aws/apigatewayv2/kyool-api-${var.environment}"
  }
}
