output "vpc_id" { value = aws_vpc.main.id }
output "vpc_cidr" { value = aws_vpc.main.cidr_block }
output "private_subnet_ids" {
  value      = aws_subnet.private[*].id
  depends_on = [aws_route.private_internet, aws_route_table_association.private]
}
output "lambda_security_group_id" { value = aws_security_group.lambda.id }
output "rds_security_group_id" { value = aws_security_group.rds.id }
