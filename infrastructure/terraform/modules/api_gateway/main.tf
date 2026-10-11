variable "cors_origins" { type = list(string) }

# =============================================================================
# API Gateway module — HTTP API v2
# =============================================================================
#
# Exact config mirrors 05_setup_api_gateway.py:
#   - ProtocolType: HTTP
#   - PayloadFormatVersion: 2.0
#   - CORS: AllowCredentials=True, MaxAge=300
#   - Routes: $default + ANY /{proxy+}
#   - Stage: production (auto-deploy)

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

variable "lambda_function_arn" {
  description = "ARN of the Lambda function to integrate with"
  type        = string
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
}

locals {
  api_name = "kyool-api-${var.environment}-gateway"
}

# ---------------------------------------------------------------------------
# HTTP API — matches create_http_api() in 05_setup_api_gateway.py
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "main" {
  name          = local.api_name
  protocol_type = "HTTP"
  description   = "KYOOL Media Platform API Gateway - ${var.environment}"

  cors_configuration {
    allow_origins     = var.cors_origins
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allow_headers     = ["*"]
    max_age           = 300
    allow_credentials = true
  }

  tags = {
    Name = local.api_name
  }
}

# ---------------------------------------------------------------------------
# Lambda integration — matches create_lambda_integration() in 05_setup_api_gateway.py
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_integration" "lambda" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_uri    = var.lambda_function_arn
  integration_method = "POST"

  # PayloadFormatVersion=2.0 is required for the Lambda handler
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

# ---------------------------------------------------------------------------
# Routes — $default + ANY /{proxy+}
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# ---------------------------------------------------------------------------
# Stage — production, auto-deploy
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_stage" "production" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.environment
  description = "${title(var.environment)} stage"
  auto_deploy = true

  tags = {
    Name = "${local.api_name}-${var.environment}"
  }
}

# ---------------------------------------------------------------------------
# Lambda permission — allow API Gateway to invoke Lambda
# ---------------------------------------------------------------------------

resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "apigateway-${var.environment}-invoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*"
}
