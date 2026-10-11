terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Bootstrap uses LOCAL state — intentionally no S3 backend here.
  # This module creates the S3 bucket + DynamoDB table used by all other modules.
  # Run it exactly once.
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}
