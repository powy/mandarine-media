output "distribution_id" {
  description = "CloudFront main site distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_domain_name" {
  description = "CloudFront main site domain name (e.g. d222222abcdef8.cloudfront.net)"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "distribution_hosted_zone_id" {
  description = "Hosted zone ID for CloudFront (used in Route53 alias records)"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "distribution_arn" {
  description = "ARN of the main site CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "backoffice_distribution_id" {
  description = "CloudFront backoffice distribution ID"
  value       = aws_cloudfront_distribution.backoffice.id
}

output "backoffice_domain_name" {
  description = "CloudFront backoffice domain name (d111111abcdef8.cloudfront.net)"
  value       = aws_cloudfront_distribution.backoffice.domain_name
}

output "backoffice_distribution_arn" { value = aws_cloudfront_distribution.backoffice.arn }
