# ── Cosmo AI — Terraform Variables ────────────────────

# ── General ───────────────────────────────────────────

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "cosmo"
}

variable "environment" {
  description = "Deployment environment (production, staging)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-north-1"
}

# ── Networking ────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ── Database ──────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "cosmo"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "cosmo_admin"
  sensitive   = true
}

# ── ECS — App ─────────────────────────────────────────

variable "app_cpu" {
  description = "CPU units for the Next.js app task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "app_memory" {
  description = "Memory (MiB) for the Next.js app task"
  type        = number
  default     = 1024
}

variable "app_desired_count" {
  description = "Number of app task instances"
  type        = number
  default     = 1
}

variable "gateway_ws_port" {
  description = "Gateway WebSocket server port exposed by the app task"
  type        = number
  default     = 3001
}

variable "gateway_ws_health_path" {
  description = "Health endpoint path served by the standalone gateway WS server"
  type        = string
  default     = "/health"
}

variable "https_listener_arn" {
  description = "Optional existing HTTPS ALB listener ARN for routing gateway WS paths"
  type        = string
  default     = ""
}

# ── ECS — Agent ───────────────────────────────────────

variable "agent_cpu" {
  description = "CPU units per agent container (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "agent_memory" {
  description = "Memory (MiB) per agent container"
  type        = number
  default     = 512
}

# ── GitHub OIDC ───────────────────────────────────────

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
  default     = "dorel"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "cosmo-ai"
}

# ── Application ──────────────────────────────────────

variable "app_url" {
  description = "Public URL of the Next.js application"
  type        = string
  default     = "https://www.heynova.se"
}

variable "cron_secret" {
  description = "Secret for authenticating cron/Lambda requests"
  type        = string
  sensitive   = true
}

variable "alarm_email_endpoint" {
  description = "Optional email endpoint for CloudWatch alarm notifications"
  type        = string
  default     = ""
}
