terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary provider — eu-west-3 (Paris) for regional resources
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = "kyool-media"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Global provider alias — us-east-1 required for CloudFront, ACM certs used with CloudFront, Route53
provider "aws" {
  alias   = "global"
  region  = "us-east-1"
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = "kyool-media"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
