output "lambda_role_arn" {
  description = "ARN of the Lambda execution IAM role"
  value       = aws_iam_role.lambda_exec.arn
  depends_on  = [aws_iam_role_policy.lambda_inline, aws_iam_role_policy_attachment.basic_execution, aws_iam_role_policy_attachment.vpc_access]
}

output "lambda_role_name" {
  description = "Name of the Lambda execution IAM role"
  value       = aws_iam_role.lambda_exec.name
}
