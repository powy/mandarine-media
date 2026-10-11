output "api_id" {
  description = "ID of the API Gateway HTTP API"
  value       = aws_apigatewayv2_api.main.id
}

output "invoke_url" {
  description = "Full invoke URL for the production stage"
  value       = aws_apigatewayv2_stage.production.invoke_url
}

output "api_endpoint" {
  description = "Base API endpoint (without stage)"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_endpoint_domain" {
  description = "API endpoint hostname (for Route53 CNAME)"
  value       = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
}

output "execution_arn" {
  description = "Execution ARN used in Lambda permission source_arn"
  value       = aws_apigatewayv2_api.main.execution_arn
}
