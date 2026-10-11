output "kms_key_arn" {
  description = "ARN of the KMS key used for secrets encryption"
  value       = aws_kms_key.kyool_media.arn
}

output "kms_key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.kyool_media.key_id
}

output "db_credentials_secret_arn" {
  description = "ARN of the DB credentials Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "app_secrets_arn" {
  description = "ARN of the application secrets Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
}
