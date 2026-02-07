output "cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "app_service_name" {
  value = aws_ecs_service.app.name
}

output "app_task_definition_arn" {
  value = aws_ecs_task_definition.app.arn
}

output "agent_task_definition_arn" {
  value = aws_ecs_task_definition.agent.arn
}

output "alb_dns_name" {
  value = aws_lb.app.dns_name
}
