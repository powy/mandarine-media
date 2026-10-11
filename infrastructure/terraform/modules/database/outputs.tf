output "db_endpoint" {
  description = "RDS instance endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "db_identifier" {
  description = "RDS instance identifier"
  value       = aws_db_instance.main.identifier
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "db_address" { value = aws_db_instance.main.address }
