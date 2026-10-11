# Preserved sizing/storage: PostgreSQL 15, db.t4g.micro, 20 GiB gp2.
# Creates an empty database. Deleted data is not reconstructed.
variable "environment" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "rds_security_group_ids" { type = list(string) }
variable "db_master_username" { type = string }
variable "db_master_password" {
  type      = string
  sensitive = true
}
variable "db_instance_class" { type = string }
variable "db_engine_version" { type = string }
locals { identifier = "kyool-api-${var.environment}-db" }
resource "aws_db_subnet_group" "main" {
  name       = local.identifier
  subnet_ids = var.private_subnet_ids
}
resource "aws_db_instance" "main" {
  identifier                = local.identifier
  engine                    = "postgres"
  engine_version            = var.db_engine_version
  instance_class            = var.db_instance_class
  db_name                   = "kyool_media"
  username                  = var.db_master_username
  password                  = var.db_master_password
  allocated_storage         = 20
  storage_type              = "gp2"
  storage_encrypted         = true
  db_subnet_group_name      = aws_db_subnet_group.main.name
  vpc_security_group_ids    = var.rds_security_group_ids
  publicly_accessible       = false
  backup_retention_period   = 1
  backup_window             = "08:52-09:22"
  maintenance_window        = "thu:01:02-thu:01:32"
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.identifier}-final-snapshot"
  parameter_group_name      = "default.postgres15"
  tags                      = { Name = local.identifier }
  lifecycle { prevent_destroy = true }
}
