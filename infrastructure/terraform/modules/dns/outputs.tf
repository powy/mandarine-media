output "site_records" {
  description = "Use CNAME for subdomains; apex domains need provider-specific ALIAS/ANAME or flattening."
  value       = { for domain in var.site_domains : domain => var.cloudfront_domain_name }
}
