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

output "gateway_ws_target_group_arn" {
  value = aws_lb_target_group.gateway_ws.arn
}

output "alb_arn_suffix" {
  value = aws_lb.app.arn_suffix
}

output "gateway_ws_target_group_arn_suffix" {
  value = aws_lb_target_group.gateway_ws.arn_suffix
}
