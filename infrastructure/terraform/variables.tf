variable "aws_region" {
  type    = string
  default = "eu-west-3"
}
variable "aws_profile" {
  type    = string
  default = "kyool"
}
variable "environment" {
  type    = string
  default = "production"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,19}$", var.environment))
    error_message = "Use a lowercase environment name of at most 20 characters."
  }
}
variable "vpc_cidr" {
  type    = string
  default = "172.31.0.0/16"
}
variable "db_master_username" {
  type    = string
  default = "postgres"
}
variable "db_master_password" {
  type      = string
  sensitive = true
}
variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}
variable "db_engine_version" {
  description = "Use a PostgreSQL 15 version currently supported by RDS in the target region. Use major version 15 to select an available minor version."
  type        = string
  default     = "15"
}
variable "lambda_image_uri" {
  description = "Existing x86_64 Lambda-compatible image in regional ECR; push it before creating Lambda."
  type        = string
  validation {
    condition     = can(regex("^[0-9]{12}\\.dkr\\.ecr\\.[a-z0-9-]+\\.amazonaws\\.com/.+(:[^:]+|@sha256:[a-f0-9]{64})$", var.lambda_image_uri))
    error_message = "Provide a tagged or digest-pinned ECR image URI."
  }
}
variable "lambda_env_vars" {
  description = "App settings/secrets. Database connection values are generated from RDS and cannot be overridden here. Sensitive values are stored in Terraform state."
  type        = map(string)
  sensitive   = true
  default     = {}
}
variable "bucket_names" {
  description = "Optional overrides keyed by site, public_files, public_pictures, backoffice, backoffice_legacy, lambda_scratch, temp_uploads, media. Defaults are account/environment-specific."
  type        = map(string)
  default     = {}
  validation {
    condition     = alltrue([for key in keys(var.bucket_names) : contains(["site", "public_files", "public_pictures", "backoffice", "backoffice_legacy", "lambda_scratch", "temp_uploads", "media"], key)])
    error_message = "Unknown bucket role in bucket_names."
  }
}
variable "site_domains" {
  description = "CloudFront aliases validated through external DNS."
  type        = list(string)
  default     = ["kyool.eu", "www.kyool.eu", "kyool.fr", "www.kyool.fr"]
  validation {
    condition     = length(var.site_domains) > 0 && length(distinct(var.site_domains)) == length(var.site_domains)
    error_message = "Provide at least one distinct site domain."
  }
}
variable "content_path_patterns" {
  description = "Reconstructed CDN routing; confirm against object keys/client URLs before deployment. Prefixes are retained in S3 object keys."
  type        = map(string)
  default     = { public_files = "files/*", public_pictures = "pictures/*" }
  validation {
    condition     = toset(keys(var.content_path_patterns)) == toset(["public_files", "public_pictures"]) && length(distinct(values(var.content_path_patterns))) == 2
    error_message = "Provide distinct patterns for public_files and public_pictures."
  }
}
