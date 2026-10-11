# DNS remains external, as in the original architecture.
# Request first, publish the output CNAMEs externally, then apply validation.
terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}
variable "site_domains" { type = list(string) }
resource "aws_acm_certificate" "kyool_eu" {
  domain_name               = var.site_domains[0]
  subject_alternative_names = slice(var.site_domains, 1, length(var.site_domains))
  validation_method         = "DNS"
  lifecycle { create_before_destroy = true }
}
resource "aws_acm_certificate_validation" "kyool_eu" {
  certificate_arn         = aws_acm_certificate.kyool_eu.arn
  validation_record_fqdns = distinct([for option in aws_acm_certificate.kyool_eu.domain_validation_options : option.resource_record_name])
}
