# ── ECS Module ────────────────────────────────────────
# ECS cluster, ALB, app service + task definition,
# and agent task definition (launched dynamically).

# ── Cluster ───────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-agents"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${var.project_name}-${var.environment}-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

# ── ALB ───────────────────────────────────────────────

resource "aws_lb" "app" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.app_sg_id]
  subnets            = var.public_subnet_ids

  tags = { Name = "${var.project_name}-${var.environment}-alb" }
}

resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-${var.environment}-app-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "${var.project_name}-${var.environment}-app-tg" }
}

resource "aws_lb_target_group" "gateway_ws" {
  name        = "${var.project_name}-${var.environment}-ws-tg"
  port        = var.gateway_ws_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = var.gateway_ws_health_path
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "${var.project_name}-${var.environment}-ws-tg" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Note: HTTPS listener requires an ACM certificate.
# Uncomment and set certificate_arn after provisioning your cert.
#
# resource "aws_lb_listener" "https" {
#   load_balancer_arn = aws_lb.app.arn
#   port              = 443
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
#   certificate_arn   = var.acm_certificate_arn
#
#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.app.arn
#   }
# }

resource "aws_lb_listener_rule" "gateway_ws" {
  count        = var.https_listener_arn != "" ? 1 : 0
  listener_arn = var.https_listener_arn
  priority     = var.gateway_ws_listener_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gateway_ws.arn
  }

  condition {
    path_pattern {
      values = ["/ws", "/ws/*", "/api/gateway/ws", "/api/gateway/ws/*"]
    }
  }
}

# ── App Task Definition ──────────────────────────────

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.app_cpu
  memory                   = var.app_memory
  execution_role_arn       = var.app_execution_role
  task_role_arn            = var.app_task_role

  container_definitions = jsonencode([{
    name      = "${var.project_name}-app"
    image     = var.app_image
    essential = true

    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
      protocol      = "tcp"
    }, {
      containerPort = var.gateway_ws_port
      hostPort      = var.gateway_ws_port
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "GATEWAY_WS_PORT", value = tostring(var.gateway_ws_port) },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "app"
      }
    }

    command = ["sh", "-c", "npx prisma migrate deploy || echo 'Migration skipped' && node server.js"]
  }])

  tags = { Name = "${var.project_name}-${var.environment}-app-task" }
}

# ── App Service ──────────────────────────────────────

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.app_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "${var.project_name}-app"
    container_port   = 3000
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway_ws.arn
    container_name   = "${var.project_name}-app"
    container_port   = var.gateway_ws_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = { Name = "${var.project_name}-${var.environment}-app-service" }

  depends_on = [aws_lb_listener.http]
}

# ── Agent Task Definition (launched dynamically per user) ──

resource "aws_ecs_task_definition" "agent" {
  family                   = "${var.project_name}-agent"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.agent_cpu
  memory                   = var.agent_memory
  execution_role_arn       = var.agent_execution_role
  task_role_arn            = var.agent_task_role

  container_definitions = jsonencode([{
    name      = "${var.project_name}-agent"
    image     = var.agent_image
    essential = true

    portMappings = [
      {
        containerPort = 18789
        hostPort      = 18789
        protocol      = "tcp"
      },
      {
        containerPort = 18790
        hostPort      = 18790
        protocol      = "tcp"
      }
    ]

    environment = [
      { name = "NODE_ENV", value = "production" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "agent"
      }
    }
  }])

  tags = { Name = "${var.project_name}-${var.environment}-agent-task" }
}
