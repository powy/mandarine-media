mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
}
run "state_storage" {
  command = apply
  assert {
    condition     = output.state_bucket_name == "kyool-terraform-state-123456789012"
    error_message = "State bucket must use the destination account."
  }
  assert {
    condition     = aws_s3_bucket_versioning.terraform_state.versioning_configuration[0].status == "Enabled" && aws_s3_bucket_public_access_block.terraform_state.block_public_policy && aws_s3_bucket_public_access_block.terraform_state.restrict_public_buckets
    error_message = "Terraform state must be versioned and private."
  }
  assert {
    condition     = one(aws_s3_bucket_server_side_encryption_configuration.terraform_state.rule).apply_server_side_encryption_by_default[0].sse_algorithm == "AES256" && aws_dynamodb_table.terraform_locks.hash_key == "LockID"
    error_message = "Remote state needs encryption and a usable lock table."
  }
}
