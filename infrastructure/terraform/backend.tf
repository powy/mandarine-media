# Partial configuration: supply the destination account's state bucket at init.
# Bootstrap creates it. Do not reuse the deleted account's backend IDs.
terraform {
  backend "s3" {
    key     = "production/terraform.tfstate"
    encrypt = true
  }
}
