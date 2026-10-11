# Reconstruction of the deleted deployment. See SETUP.md for staged creation.
# No imports: all AWS IDs and endpoints come from newly created resources.
data "aws_caller_identity" "current" {}

locals {
  database_uri = "postgresql://${replace(urlencode(var.db_master_username), "+", "%20")}:${replace(urlencode(var.db_master_password), "+", "%20")}@${module.database.db_endpoint}/${module.database.db_name}"
}

module "networking" {
  source      = "./modules/networking"
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}
module "storage" {
  source         = "./modules/storage"
  environment    = var.environment
  aws_account_id = data.aws_caller_identity.current.account_id
  bucket_names   = var.bucket_names
}
module "iam" {
  source              = "./modules/iam"
  environment         = var.environment
  aws_region          = var.aws_region
  aws_account_id      = data.aws_caller_identity.current.account_id
  storage_bucket_arns = [for key in ["media", "public_files", "public_pictures", "lambda_scratch", "temp_uploads"] : module.storage.buckets[key].arn]
}
module "secrets" {
  source         = "./modules/secrets"
  environment    = var.environment
  aws_region     = var.aws_region
  aws_account_id = data.aws_caller_identity.current.account_id
}
module "database" {
  source                 = "./modules/database"
  environment            = var.environment
  private_subnet_ids     = module.networking.private_subnet_ids
  rds_security_group_ids = [module.networking.rds_security_group_id]
  db_master_username     = var.db_master_username
  db_master_password     = var.db_master_password
  db_instance_class      = var.db_instance_class
  db_engine_version      = var.db_engine_version
}
module "compute" {
  source                    = "./modules/compute"
  environment               = var.environment
  aws_region                = var.aws_region
  aws_account_id            = data.aws_caller_identity.current.account_id
  lambda_role_arn           = module.iam.lambda_role_arn
  lambda_security_group_ids = [module.networking.lambda_security_group_id]
  private_subnet_ids        = module.networking.private_subnet_ids
  lambda_image_uri          = var.lambda_image_uri
  lambda_env_vars = merge(var.lambda_env_vars, {
    ENVIRONMENT           = var.environment
    API_HOST              = "0.0.0.0"
    API_PORT              = "8000"
    API_GATEWAY_BASE_PATH = "/${var.environment}"
    DATABASE_URI          = local.database_uri
    POSTGRES_SERVER       = module.database.db_address
    POSTGRES_USER         = var.db_master_username
    POSTGRES_PASSWORD     = var.db_master_password
    POSTGRES_DB           = module.database.db_name
  })
}
module "api_gateway" {
  source               = "./modules/api_gateway"
  environment          = var.environment
  aws_region           = var.aws_region
  aws_account_id       = data.aws_caller_identity.current.account_id
  lambda_function_arn  = module.compute.lambda_function_arn
  lambda_function_name = module.compute.lambda_function_name
  cors_origins         = concat([for domain in var.site_domains : "https://${domain}"], ["https://${module.cdn.backoffice_domain_name}"])
}
module "certificates" {
  source       = "./modules/certificates"
  site_domains = var.site_domains
  providers    = { aws = aws.global }
}
module "cdn" {
  source                = "./modules/cdn"
  environment           = var.environment
  buckets               = module.storage.buckets
  content_path_patterns = var.content_path_patterns
  site_domains          = var.site_domains
  acm_certificate_arn   = module.certificates.kyool_eu_certificate_arn
  providers             = { aws = aws.global }
}
module "dns" {
  source                 = "./modules/dns"
  site_domains           = var.site_domains
  cloudfront_domain_name = module.cdn.distribution_domain_name
}
module "observability" {
  source               = "./modules/observability"
  environment          = var.environment
  lambda_function_name = module.compute.lambda_function_name
}
