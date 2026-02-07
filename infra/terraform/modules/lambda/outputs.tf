output "function_arn" {
  value = aws_lambda_function.idle_shutdown.arn
}

output "function_name" {
  value = aws_lambda_function.idle_shutdown.function_name
}
