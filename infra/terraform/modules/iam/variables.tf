variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_account_id" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "log_group_name" {
  type = string
}

variable "ecr_app_repo_arn" {
  type = string
}

variable "ecr_agent_repo_arn" {
  type = string
}
