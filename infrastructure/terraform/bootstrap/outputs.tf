output "state_bucket_name" {
  description = "Name of the S3 bucket used for Terraform remote state"
  value       = aws_s3_bucket.terraform_state.bucket
}

output "state_bucket_arn" {
  description = "ARN of the Terraform state S3 bucket"
  value       = aws_s3_bucket.terraform_state.arn
}

output "dynamodb_lock_table_name" {
  description = "Name of the DynamoDB lock table"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "next_step_instruction" {
  description = "What to do after bootstrap"
  value       = "Set production.backend.hcl bucket = '${aws_s3_bucket.terraform_state.bucket}', then run: terraform init -reconfigure -backend-config=production.backend.hcl"
}
