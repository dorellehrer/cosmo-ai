output "log_group_name" {
  value = aws_cloudwatch_log_group.ecs.name
}

output "log_group_arn" {
  value = aws_cloudwatch_log_group.ecs.arn
}

output "alarm_topic_arn" {
  value = aws_sns_topic.alarms.arn
}
