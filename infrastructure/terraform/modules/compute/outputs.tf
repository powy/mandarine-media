output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.main.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.main.function_name
}

output "ecr_repository_url" {
  description = "ECR repository URL (use for docker push)"
  value       = aws_ecr_repository.main.repository_url
}

output "ecr_repository_name" {
  description = "ECR repository name"
  value       = aws_ecr_repository.main.name
}

output "database_host" {
  description = "Database hostname configured on Lambda (no credentials)."
  value       = aws_lambda_function.main.environment[0].variables["POSTGRES_SERVER"]
  sensitive   = true
}
