# ── Cosmo AI — Terraform Root Configuration ──────────
#
# Deploy: terraform init → terraform plan → terraform apply
# State is stored in S3 with DynamoDB locking.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "cosmo-terraform-state"
    key            = "infra/terraform.tfstate"
    region         = "eu-north-1"
    dynamodb_table = "cosmo-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "cosmo-ai"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

# ── Data Sources ──────────────────────────────────────

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── Modules ───────────────────────────────────────────

module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
  aws_region   = var.aws_region
}

module "iam" {
  source = "./modules/iam"

  project_name       = var.project_name
  environment        = var.environment
  aws_account_id     = data.aws_caller_identity.current.account_id
  aws_region         = var.aws_region
  github_org         = var.github_org
  github_repo        = var.github_repo
  log_group_name     = module.cloudwatch.log_group_name
  ecr_app_repo_arn   = module.ecr.app_repo_arn
  ecr_agent_repo_arn = module.ecr.agent_repo_arn
}

module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

module "cloudwatch" {
  source = "./modules/cloudwatch"

  project_name = var.project_name
  environment  = var.environment
  alb_arn_suffix = module.ecs.alb_arn_suffix
  gateway_ws_target_group_arn_suffix = module.ecs.gateway_ws_target_group_arn_suffix
}

module "rds" {
  source = "./modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  private_subnet_ids = module.vpc.private_subnet_ids
  rds_sg_id          = module.vpc.rds_sg_id
  db_instance_class  = var.db_instance_class
  db_name            = var.db_name
  db_username        = var.db_username
}

module "ecs" {
  source = "./modules/ecs"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  private_subnet_ids    = module.vpc.private_subnet_ids
  app_sg_id             = module.vpc.app_sg_id
  agent_sg_id           = module.vpc.agent_sg_id
  app_image             = "${module.ecr.app_repo_url}:latest"
  agent_image           = "${module.ecr.agent_repo_url}:latest"
  app_execution_role    = module.iam.ecs_execution_role_arn
  app_task_role         = module.iam.ecs_task_role_arn
  agent_execution_role  = module.iam.ecs_execution_role_arn
  agent_task_role       = module.iam.agent_task_role_arn
  log_group_name        = module.cloudwatch.log_group_name
  database_url          = module.rds.connection_string
  app_cpu               = var.app_cpu
  app_memory            = var.app_memory
  agent_cpu             = var.agent_cpu
  agent_memory          = var.agent_memory
  app_desired_count     = var.app_desired_count
  gateway_ws_port       = var.gateway_ws_port
  gateway_ws_health_path = var.gateway_ws_health_path
  https_listener_arn    = var.https_listener_arn
}

module "lambda" {
  source = "./modules/lambda"

  project_name       = var.project_name
  environment        = var.environment
  app_url            = var.app_url
  cron_secret        = var.cron_secret
  lambda_role_arn    = module.iam.lambda_role_arn
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  app_sg_id          = module.vpc.app_sg_id
}
