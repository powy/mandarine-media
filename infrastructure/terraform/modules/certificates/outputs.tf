output "kyool_eu_certificate_arn" {
  value = aws_acm_certificate_validation.kyool_eu.certificate_arn
}
output "dns_validation_records" {
  description = "Publish these CNAMEs at the existing external DNS provider."
  value = distinct([for option in aws_acm_certificate.kyool_eu.domain_validation_options : {
    name  = option.resource_record_name
    type  = option.resource_record_type
    value = option.resource_record_value
  }])
}
