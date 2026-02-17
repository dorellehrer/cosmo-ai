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

# Trust blocked sender events observed in app/agent logs
resource "aws_cloudwatch_log_metric_filter" "trust_blocked_sender" {
  name           = "${var.project_name}-${var.environment}-trust-blocked-sender"
  log_group_name = aws_cloudwatch_log_group.ecs.name
  pattern        = "\"[Trust] Blocked sender\""

  metric_transformation {
    name      = "TrustBlockedSenderCount"
    namespace = "${var.project_name}/${var.environment}"
    value     = "1"
  }
}

# Failed runtime config reload calls from trust updates
resource "aws_cloudwatch_log_metric_filter" "trust_config_reload_failed" {
  name           = "${var.project_name}-${var.environment}-trust-config-reload-failed"
  log_group_name = aws_cloudwatch_log_group.ecs.name
  pattern        = "\"config.reload failed\""

  metric_transformation {
    name      = "TrustConfigReloadFailedCount"
    namespace = "${var.project_name}/${var.environment}"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "trust_blocked_sender_spike" {
  alarm_name          = "${var.project_name}-${var.environment}-trust-blocked-sender-spike"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "TrustBlockedSenderCount"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 25
  alarm_description   = "Blocked sender events spiked to >=25 over 15 minutes"
  treat_missing_data  = "notBreaching"

  tags = { Name = "${var.project_name}-${var.environment}-trust-blocked-sender-spike" }
}

resource "aws_cloudwatch_metric_alarm" "trust_config_reload_failed" {
  alarm_name          = "${var.project_name}-${var.environment}-trust-config-reload-failed"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "TrustConfigReloadFailedCount"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "At least one trust config reload failure in the last 5 minutes"
  treat_missing_data  = "notBreaching"

  tags = { Name = "${var.project_name}-${var.environment}-trust-config-reload-failed" }
}

# WebSocket target group health and connection errors
resource "aws_cloudwatch_metric_alarm" "gateway_ws_unhealthy_hosts" {
