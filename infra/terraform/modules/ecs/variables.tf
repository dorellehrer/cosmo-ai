variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "app_sg_id" {
  type = string
}

variable "agent_sg_id" {
  type = string
}

variable "app_image" {
  type = string
}

variable "agent_image" {
  type = string
}

variable "app_execution_role" {
  type = string
}

variable "app_task_role" {
  type = string
}

variable "agent_execution_role" {
  type = string
}

variable "agent_task_role" {
  type = string
}

variable "log_group_name" {
  type = string
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "app_cpu" {
  type = number
}

variable "app_memory" {
  type = number
}

variable "agent_cpu" {
  type = number
}

variable "agent_memory" {
  type = number
}

variable "app_desired_count" {
  type = number
}
