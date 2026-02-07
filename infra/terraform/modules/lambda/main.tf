# ── Lambda Module ─────────────────────────────────────
# Idle-shutdown Lambda triggered by EventBridge every 5 minutes.

data "archive_file" "idle_shutdown" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda/idle-shutdown"
  output_path = "${path.module}/builds/idle-shutdown.zip"
}

resource "aws_lambda_function" "idle_shutdown" {
  function_name    = "${var.project_name}-${var.environment}-idle-shutdown"
  filename         = data.archive_file.idle_shutdown.output_path
  source_code_hash = data.archive_file.idle_shutdown.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  timeout          = 60
  memory_size      = 128
  role             = var.lambda_role_arn

  environment {
    variables = {
      APP_URL     = var.app_url
      CRON_SECRET = var.cron_secret
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.app_sg_id]
  }

  tags = { Name = "${var.project_name}-${var.environment}-idle-shutdown" }
}

# EventBridge rule — every 5 minutes
resource "aws_cloudwatch_event_rule" "idle_shutdown" {
  name                = "${var.project_name}-${var.environment}-idle-shutdown"
  description         = "Trigger idle agent shutdown every 5 minutes"
  schedule_expression = "rate(5 minutes)"

  tags = { Name = "${var.project_name}-${var.environment}-idle-shutdown-rule" }
}

resource "aws_cloudwatch_event_target" "idle_shutdown" {
  rule      = aws_cloudwatch_event_rule.idle_shutdown.name
  target_id = "idle-shutdown-lambda"
  arn       = aws_lambda_function.idle_shutdown.arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.idle_shutdown.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.idle_shutdown.arn
}
