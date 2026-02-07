variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "app_url" {
  type = string
}

variable "cron_secret" {
  type      = string
  sensitive = true
}

variable "lambda_role_arn" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "app_sg_id" {
  type = string
}
