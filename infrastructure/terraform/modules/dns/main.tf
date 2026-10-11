# External DNS is intentional. No Route53 zones are created or migrated.
variable "site_domains" { type = list(string) }
variable "cloudfront_domain_name" { type = string }
