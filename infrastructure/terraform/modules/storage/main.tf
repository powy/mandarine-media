# Bucket roles preserved from March 2026 inventory. Contents are not restored.
variable "environment" { type = string }
variable "aws_account_id" { type = string }
variable "bucket_names" { type = map(string) }
locals {
  roles = toset(["site", "public_files", "public_pictures", "backoffice", "backoffice_legacy", "lambda_scratch", "temp_uploads", "media"])
  names = { for role in local.roles : role => lookup(var.bucket_names, role, "kyool-${replace(role, "_", "-")}-${var.environment}-${var.aws_account_id}") }
}
resource "aws_s3_bucket" "main" {
  for_each = local.names
  bucket   = each.value
  tags     = { Name = each.value, Role = each.key }
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_versioning" "main" {
  for_each = local.names
  bucket   = aws_s3_bucket.main[each.key].id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  for_each = local.names
  bucket   = aws_s3_bucket.main[each.key].id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_public_access_block" "main" {
  for_each                = local.names
  bucket                  = aws_s3_bucket.main[each.key].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
# Distribution-specific bucket policies are in CDN, avoiding dependency cycles.
# Upload tools must use credentials/presigned URLs; public ACLs are disabled.
