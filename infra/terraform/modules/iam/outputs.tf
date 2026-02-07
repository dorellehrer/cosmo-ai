output "ecs_execution_role_arn" {
  value = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task.arn
}

output "agent_task_role_arn" {
  value = aws_iam_role.agent_task.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda.arn
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
