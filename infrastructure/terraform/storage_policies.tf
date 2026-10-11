# Regional S3 policies refer to the generated global CloudFront distributions.
resource "aws_s3_bucket_policy" "site_origins" {
  for_each = toset(["site", "public_files", "public_pictures"])
  bucket   = module.storage.buckets[each.key].name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${module.storage.buckets[each.key].arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = module.cdn.distribution_arn } }
    }]
  })
}
resource "aws_s3_bucket_policy" "backoffice" {
  bucket = module.storage.buckets["backoffice"].name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${module.storage.buckets["backoffice"].arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = module.cdn.backoffice_distribution_arn } }
    }]
  })
}
