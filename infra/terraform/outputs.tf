# ── Cosmo AI — Terraform Outputs ──────────────────────
# These values feed into .env and CI/CD configuration.

# ── VPC ───────────────────────────────────────────────

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (for ALB)"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs (for ECS tasks, RDS)"
  value       = module.vpc.private_subnet_ids
}

output "app_security_group_id" {
  description = "Security group for the Next.js app"
  value       = module.vpc.app_sg_id
}

output "agent_security_group_id" {
  description = "Security group for agent containers"
  value       = module.vpc.agent_sg_id
}

# ── ECS ───────────────────────────────────────────────

output "ecs_cluster_arn" {
  description = "ECS cluster ARN (for .env AWS_ECS_CLUSTER_ARN)"
  value       = module.ecs.cluster_arn
}

output "app_service_name" {
  description = "ECS service name for the app"
  value       = module.ecs.app_service_name
}

output "gateway_ws_target_group_arn" {
  description = "ALB target group ARN for gateway WebSocket traffic"
  value       = module.ecs.gateway_ws_target_group_arn
}

# ── ECR ───────────────────────────────────────────────

output "ecr_app_repo_url" {
  description = "ECR repository URL for cosmo-app"
  value       = module.ecr.app_repo_url
}

output "ecr_agent_repo_url" {
  description = "ECR repository URL for cosmo-agent"
  value       = module.ecr.agent_repo_url
}

# ── IAM ───────────────────────────────────────────────

output "ecs_execution_role_arn" {
  description = "ECS execution role ARN (for .env AWS_EXECUTION_ROLE_ARN)"
  value       = module.iam.ecs_execution_role_arn
}

output "ecs_task_role_arn" {
  description = "ECS app task role ARN"
  value       = module.iam.ecs_task_role_arn
}

output "agent_task_role_arn" {
  description = "Agent task role ARN (for .env AWS_TASK_ROLE_ARN)"
  value       = module.iam.agent_task_role_arn
}

output "github_deploy_role_arn" {
  description = "GitHub Actions OIDC deploy role ARN"
  value       = module.iam.github_deploy_role_arn
}

# ── RDS ───────────────────────────────────────────────

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
}

output "rds_connection_string" {
  description = "PostgreSQL connection string (for .env DATABASE_URL)"
  value       = module.rds.connection_string
  sensitive   = true
}

# ── CloudWatch ────────────────────────────────────────

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = module.cloudwatch.log_group_name
}
