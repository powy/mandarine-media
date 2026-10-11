# Reconstructed main site and backoffice CDN. Old IDs are historical only.
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "buckets" {
  type = map(object({ name = string, arn = string, regional_domain = string }))
}
variable "site_domains" { type = list(string) }
variable "content_path_patterns" { type = map(string) }

variable "acm_certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1 for CloudFront)"
  type        = string
}

# ---------------------------------------------------------------------------
# Origin Access Control — secures S3 bucket access via CloudFront
# ---------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "kyool-${var.environment}-main-oac"
  description                       = "OAC for kyool main site S3 buckets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "backoffice" {
  name                              = "kyool-${var.environment}-backoffice-oac"
  description                       = "OAC for kyool backoffice S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ---------------------------------------------------------------------------
# CloudFront Function — SPA router (rewrites non-file paths to /index.html)
# ---------------------------------------------------------------------------

resource "aws_cloudfront_function" "spa_router" {
  name    = "kyool-${var.environment}-spa-router"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite requests without file extension to /index.html for SPA routing"
  publish = true

  code = <<-EOT
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // Forward requests with a file extension as-is
      if (uri.match(/\.[a-zA-Z0-9]+$/)) {
        return request;
      }

      // Rewrite SPA routes to index.html
      request.uri = '/index.html';
      return request;
    }
  EOT
}

# ---------------------------------------------------------------------------
# Main site distribution — EXAMPLEWEBDIST (d222222abcdef8.cloudfront.net)
# Aliases: kyool.eu, www.kyool.eu, kyool.fr, www.kyool.fr
# Origins: kyool-prod-site (main), kyool-public-files, kyool-public-pictures
# ---------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "main" {
  comment             = "kyool-prod-site-distrib"
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = var.site_domains

  # Primary origin: main website static files
  origin {
    domain_name              = var.buckets["site"].regional_domain
    origin_id                = "site"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # All content origins use private S3 REST endpoints and OAC.
  dynamic "origin" {
    for_each = toset(["public_files", "public_pictures"])
    content {
      domain_name              = var.buckets[origin.value].regional_domain
      origin_id                = origin.value
      origin_access_control_id = aws_cloudfront_origin_access_control.main.id
    }
  }

  # Historical path patterns were not captured. Confirm these before deployment.
  dynamic "ordered_cache_behavior" {
    for_each = var.content_path_patterns
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = ordered_cache_behavior.key
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      compress               = true
      forwarded_values {
        query_string = false
        cookies { forward = "none" }
      }
      min_ttl     = 0
      default_ttl = 86400
      max_ttl     = 31536000
    }
  }

  # Default cache behavior — serves the main site SPA
  default_cache_behavior {
    target_origin_id       = "site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # SPA routing — serve index.html for all 404s
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Custom error responses — SPA routing support
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "kyool-prod-site-distrib"
  }

}

# ---------------------------------------------------------------------------
# Backoffice distribution — EXAMPLEAPIDIST (d111111abcdef8.cloudfront.net)
# No custom alias — accessed via CF URL directly.
# Origin: kyool-backoffice S3 bucket
# ---------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "backoffice" {
  default_root_object = "index.html"
  comment             = "admin backoffice for ${var.environment}"
  enabled             = true
  is_ipv6_enabled     = true

  origin {
    domain_name              = var.buckets["backoffice"].regional_domain
    origin_id                = "backoffice"
    origin_access_control_id = aws_cloudfront_origin_access_control.backoffice.id
  }

  default_cache_behavior {
    target_origin_id       = "backoffice"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # No custom aliases — uses default CloudFront certificate
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "admin-backoffice-prod"
  }

}
