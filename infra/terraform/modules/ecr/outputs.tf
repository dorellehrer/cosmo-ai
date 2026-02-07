output "app_repo_url" {
  value = aws_ecr_repository.app.repository_url
}

output "agent_repo_url" {
  value = aws_ecr_repository.agent.repository_url
}

output "app_repo_arn" {
  value = aws_ecr_repository.app.arn
}

output "agent_repo_arn" {
  value = aws_ecr_repository.agent.arn
}
