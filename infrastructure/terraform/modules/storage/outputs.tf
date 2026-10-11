output "buckets" {
  value = { for role, bucket in aws_s3_bucket.main : role => {
    name            = bucket.bucket
    arn             = bucket.arn
    regional_domain = bucket.bucket_regional_domain_name
  } }
}
output "media_bucket_name" { value = aws_s3_bucket.main["media"].bucket }
output "backoffice_bucket_name" { value = aws_s3_bucket.main["backoffice"].bucket }
