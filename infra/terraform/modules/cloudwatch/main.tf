# ── CloudWatch Module ─────────────────────────────────
# Log group for ECS containers and basic alarms.

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}-${var.environment}"
  retention_in_days = 30

  tags = { Name = "${var.project_name}-${var.environment}-log-group" }
}

# ── Alarms ────────────────────────────────────────────

# High CPU on app service
resource "aws_cloudwatch_metric_alarm" "app_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-app-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "App CPU utilization > 80% for 15 minutes"

  dimensions = {
    ClusterName = "${var.project_name}-agents"
    ServiceName = "${var.project_name}-app-service"
  }

  tags = { Name = "${var.project_name}-${var.environment}-app-cpu-alarm" }
}

# High memory on app service
resource "aws_cloudwatch_metric_alarm" "app_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-app-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "App memory utilization > 85% for 15 minutes"

  dimensions = {
    ClusterName = "${var.project_name}-agents"
    ServiceName = "${var.project_name}-app-service"
  }

  tags = { Name = "${var.project_name}-${var.environment}-app-memory-alarm" }
}
