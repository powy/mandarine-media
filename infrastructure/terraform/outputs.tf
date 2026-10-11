# ============================================================================
# KEY OUTPUTS — printed after terraform apply, useful for CI and debugging
# ============================================================================

output "api_gateway_url" {
  description = "API Gateway invoke URL (production stage)"
  value       = module.api_gateway.invoke_url
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = module.compute.lambda_function_arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = module.compute.lambda_function_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing images"
  value       = module.compute.ecr_repository_url
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.db_endpoint
  sensitive   = true
}

output "media_bucket_name" {
  description = "S3 bucket name for media storage"
  value       = module.storage.media_bucket_name
}

output "backoffice_bucket_name" {
  description = "S3 bucket name for static backoffice hosting"
  value       = module.storage.backoffice_bucket_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = module.cdn.distribution_domain_name
}

output "iam_lambda_role_arn" {
  description = "ARN of the Lambda execution IAM role"
  value       = module.iam.lambda_role_arn
}

output "bucket_names" { value = { for role, bucket in module.storage.buckets : role => bucket.name } }
output "certificate_dns_records" { value = module.certificates.dns_validation_records }
output "site_dns_records" { value = module.dns.site_records }
output "backoffice_cloudfront_domain" { value = module.cdn.backoffice_domain_name }
