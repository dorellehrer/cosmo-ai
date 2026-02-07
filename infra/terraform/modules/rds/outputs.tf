output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "address" {
  value = aws_db_instance.main.address
}

output "port" {
  value = aws_db_instance.main.port
}

output "connection_string" {
  value     = "postgresql://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive = true
}

output "db_password_secret_arn" {
  value = aws_secretsmanager_secret.db_password.arn
}
