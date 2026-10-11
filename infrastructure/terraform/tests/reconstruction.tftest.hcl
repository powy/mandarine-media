# All providers are mocked. These tests never contact or create resources in AWS.
mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_availability_zones" {
    defaults = { names = ["eu-west-3a", "eu-west-3b", "eu-west-3c"] }
  }
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}" }
  }
  mock_resource "aws_kms_key" {
    defaults = { arn = "arn:aws:kms:eu-west-3:123456789012:key/11111111-1111-1111-1111-111111111111" }
  }
  mock_resource "aws_apigatewayv2_api" {
    defaults = { execution_arn = "arn:aws:execute-api:eu-west-3:123456789012:rebuilt", api_endpoint = "https://rebuilt.execute-api.eu-west-3.amazonaws.com" }
  }
  mock_resource "aws_db_instance" {
    defaults = { address = "new-db.example.internal", endpoint = "new-db.example.internal:5432" }
  }
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/kyool-api-production-lambda-role" }
  }
  mock_resource "aws_lambda_function" {
    defaults = { arn = "arn:aws:lambda:eu-west-3:123456789012:function:kyool-api-production" }
  }
}
mock_provider "aws" {
  alias = "global"
  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/11111111-1111-1111-1111-111111111111"
      domain_validation_options = [{
        domain_name           = "kyool.eu"
        resource_record_name  = "_validation.kyool.eu."
        resource_record_type  = "CNAME"
        resource_record_value = "_validation.acm-validations.aws."
      }]
    }
  }
  mock_resource "aws_cloudfront_function" {
    defaults = { arn = "arn:aws:cloudfront::123456789012:function/kyool-production-spa-router" }
  }
  mock_resource "aws_cloudfront_distribution" {
    defaults = { domain_name = "rebuilt.cloudfront.net", arn = "arn:aws:cloudfront::123456789012:distribution/REBUILT" }
  }
}

run "certificate_and_image_prerequisites" {
  command = plan
  variables {
    db_master_password = "test only@/:"
    lambda_image_uri   = "123456789012.dkr.ecr.eu-west-3.amazonaws.com/kyool-api-production:rebuild"
  }
  plan_options {
    target = [module.certificates.aws_acm_certificate.kyool_eu, module.compute.aws_ecr_repository.main]
  }
}

run "fresh_deployment" {
  command = apply
  variables {
    db_master_password = "test only@/:"
    lambda_image_uri   = "123456789012.dkr.ecr.eu-west-3.amazonaws.com/kyool-api-production:rebuild"
  }
  assert {
    condition     = local.database_uri == "postgresql://postgres:test%20only%40%2F%3A@new-db.example.internal:5432/kyool_media"
    error_message = "Generated database URL must use the new endpoint and encode special password characters."
  }
  assert {
    condition     = module.compute.database_host == "new-db.example.internal"
    error_message = "Lambda must receive the new database host, not a deleted endpoint."
  }
  assert {
    condition     = output.rds_endpoint == "new-db.example.internal:5432"
    error_message = "Database endpoint must come from the recreated instance."
  }
  assert {
    condition     = length(output.bucket_names) == 8 && output.bucket_names.site == "kyool-site-production-123456789012" && output.bucket_names.backoffice != output.bucket_names.backoffice_legacy
    error_message = "Preserve all bucket roles with generated names, including distinct backoffice buckets."
  }
  assert {
    condition     = output.site_dns_records["www.kyool.fr"] == output.cloudfront_domain
    error_message = "External DNS instructions must point at the recreated CDN."
  }
  assert {
    condition     = output.certificate_dns_records[0].type == "CNAME" && output.certificate_dns_records[0].name == "_validation.kyool.eu."
    error_message = "Expose ACM validation records for the external DNS provider."
  }
  assert {
    condition     = alltrue([for role, policy in aws_s3_bucket_policy.site_origins : jsondecode(policy.policy).Statement[0].Resource == "${module.storage.buckets[role].arn}/*" && jsondecode(policy.policy).Statement[0].Condition.StringEquals["AWS:SourceArn"] == module.cdn.distribution_arn])
    error_message = "OAC policies must grant the reconstructed distribution access to its buckets."
  }
  assert {
    condition     = jsondecode(aws_s3_bucket_policy.backoffice.policy).Statement[0].Resource == "${module.storage.buckets.backoffice.arn}/*" && jsondecode(aws_s3_bucket_policy.backoffice.policy).Statement[0].Condition.StringEquals["AWS:SourceArn"] == module.cdn.backoffice_distribution_arn
    error_message = "Backoffice policy must allow only its reconstructed distribution."
  }

}

run "networking" {
  command = apply
  module { source = "./modules/networking" }
  variables {
    environment = "production"
    vpc_cidr    = "172.31.0.0/16"
  }
  assert {
    condition     = length(aws_subnet.private) == 3 && length(aws_subnet.public) == 3 && length(distinct(concat(aws_subnet.private[*].cidr_block, aws_subnet.public[*].cidr_block))) == 6
    error_message = "Reconstruction needs distinct public/private subnets in three AZs."
  }
  assert {
    condition     = aws_route.private_internet.destination_cidr_block == "0.0.0.0/0" && aws_route.private_internet.nat_gateway_id == aws_nat_gateway.main.id
    error_message = "Lambda's private subnets need outbound internet access through NAT."
  }
  assert {
    condition     = one(aws_security_group.rds.ingress).from_port == 5432 && one(aws_security_group.rds.ingress).to_port == 5432 && one(aws_security_group.rds.ingress).security_groups == toset([aws_security_group.lambda.id]) && try(length(one(aws_security_group.rds.ingress).cidr_blocks), 0) == 0
    error_message = "RDS ingress must allow PostgreSQL from Lambda only."
  }
}

run "cdn_origins_and_access" {
  command = apply
  module { source = "./modules/cdn" }
  providers = { aws = aws.global }
  variables {
    environment           = "production"
    site_domains          = ["kyool.eu", "www.kyool.eu", "kyool.fr", "www.kyool.fr"]
    acm_certificate_arn   = "arn:aws:acm:us-east-1:123456789012:certificate/11111111-1111-1111-1111-111111111111"
    content_path_patterns = { public_files = "files/*", public_pictures = "pictures/*" }
    buckets = {
      site            = { name = "new-site", arn = "arn:aws:s3:::new-site", regional_domain = "new-site.s3.eu-west-3.amazonaws.com" }
      public_files    = { name = "new-files", arn = "arn:aws:s3:::new-files", regional_domain = "new-files.s3.eu-west-3.amazonaws.com" }
      public_pictures = { name = "new-pictures", arn = "arn:aws:s3:::new-pictures", regional_domain = "new-pictures.s3.eu-west-3.amazonaws.com" }
      backoffice      = { name = "new-backoffice", arn = "arn:aws:s3:::new-backoffice", regional_domain = "new-backoffice.s3.eu-west-3.amazonaws.com" }
    }
  }
  assert {
    condition     = length(aws_cloudfront_distribution.main.origin) == 3 && alltrue([for origin in aws_cloudfront_distribution.main.origin : origin.domain_name == var.buckets[origin.origin_id].regional_domain])
    error_message = "Every main origin must use a generated bucket REST endpoint."
  }
  assert {
    condition     = length(aws_cloudfront_distribution.main.ordered_cache_behavior) == 2 && alltrue([for behavior in aws_cloudfront_distribution.main.ordered_cache_behavior : behavior.path_pattern == var.content_path_patterns[behavior.target_origin_id] && length(behavior.function_association) == 0])
    error_message = "Content paths must route to the right buckets without SPA rewriting."
  }

  assert {
    condition     = one(aws_cloudfront_distribution.backoffice.origin).domain_name == var.buckets.backoffice.regional_domain
    error_message = "Backoffice must use its generated bucket endpoint."
  }
}
