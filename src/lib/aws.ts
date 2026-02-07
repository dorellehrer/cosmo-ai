import {
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
  DescribeTasksCommand,
  RegisterTaskDefinitionCommand,
  type KeyValuePair,
} from '@aws-sdk/client-ecs';
import {
  SecretsManagerClient,
  CreateSecretCommand,
  DeleteSecretCommand,
  PutSecretValueCommand,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import type { AwsAgentConfig } from '@/types/agent';

// ──────────────────────────────────────────────
// AWS Clients (singleton pattern)
// ──────────────────────────────────────────────

const region = process.env.AWS_REGION || 'eu-north-1';

const ecsClient = new ECSClient({ region });
const secretsClient = new SecretsManagerClient({ region });
const logsClient = new CloudWatchLogsClient({ region });

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

export function getAwsConfig(): AwsAgentConfig {
  return {
    region,
    clusterArn: process.env.AWS_ECS_CLUSTER_ARN || '',
    taskDefinition: process.env.AWS_ECS_TASK_DEFINITION || 'cosmo-agent',
    subnets: (process.env.AWS_SUBNETS || '').split(',').filter(Boolean),
    securityGroups: (process.env.AWS_SECURITY_GROUPS || '').split(',').filter(Boolean),
    containerImage: process.env.AWS_CONTAINER_IMAGE || '',
    cpu: process.env.AWS_AGENT_CPU || '256',     // 0.25 vCPU
    memory: process.env.AWS_AGENT_MEMORY || '512', // 512 MB
    executionRoleArn: process.env.AWS_EXECUTION_ROLE_ARN || '',
    taskRoleArn: process.env.AWS_TASK_ROLE_ARN || '',
    logGroupName: process.env.AWS_LOG_GROUP || '/ecs/cosmo-agents',
  };
}

// ──────────────────────────────────────────────
// Secrets Manager — secure API key storage
// ──────────────────────────────────────────────

/**
 * Store a user's AI provider API key in AWS Secrets Manager.
 * Returns the secret ARN for referencing in ECS task environment.
 */
export async function storeApiKeySecret(
  userId: string,
  provider: string,
  apiKey: string
): Promise<string> {
  const secretName = `cosmo/agent/${userId}/${provider}-api-key`;

  try {
    const result = await secretsClient.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: JSON.stringify({ apiKey, provider }),
        Description: `Nova AI agent API key for user ${userId} (${provider})`,
        Tags: [
          { Key: 'cosmo:userId', Value: userId },
          { Key: 'cosmo:provider', Value: provider },
        ],
      })
    );
    return result.ARN!;
  } catch (error: unknown) {
    // If secret already exists, update it
    if (error instanceof Error && error.name === 'ResourceExistsException') {
      await secretsClient.send(
        new PutSecretValueCommand({
          SecretId: secretName,
          SecretString: JSON.stringify({ apiKey, provider }),
        })
      );
      // Return the existing ARN format
      return `arn:aws:secretsmanager:${region}:${process.env.AWS_ACCOUNT_ID}:secret:${secretName}`;
    }
    throw error;
  }
}

/**
 * Delete a user's stored API key from Secrets Manager.
 */
export async function deleteApiKeySecret(userId: string, provider: string): Promise<void> {
  const secretName = `cosmo/agent/${userId}/${provider}-api-key`;
  try {
    await secretsClient.send(
      new DeleteSecretCommand({
        SecretId: secretName,
        ForceDeleteWithoutRecovery: true,
      })
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ResourceNotFoundException') {
      return; // Already deleted
    }
    throw error;
  }
}

// ──────────────────────────────────────────────
// ECS Fargate — container lifecycle
// ──────────────────────────────────────────────

/**
 * Register a task definition for the agent container.
 * Called once during setup or when container version changes.
 */
export async function registerAgentTaskDefinition(
  agentInstanceId: string,
  config: AwsAgentConfig
): Promise<string> {
  // Ensure DATABASE_URL is stored in Secrets Manager for ECS to inject
  const dbSecretArn = await ensureDatabaseSecret();

  const result = await ecsClient.send(
    new RegisterTaskDefinitionCommand({
      family: `cosmo-agent-${agentInstanceId}`,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      cpu: config.cpu,
      memory: config.memory,
      executionRoleArn: config.executionRoleArn,
      taskRoleArn: config.taskRoleArn,
      containerDefinitions: [
        {
          name: 'cosmo-agent',
          image: config.containerImage,
          essential: true,
          portMappings: [
            { containerPort: 18789, protocol: 'tcp' }, // WebSocket control plane
            { containerPort: 18790, protocol: 'tcp' }, // HTTP health check
          ],
          // Sensitive env vars injected from Secrets Manager (never in plain text)
          secrets: [
            {
              name: 'DATABASE_URL',
              valueFrom: dbSecretArn,
            },
          ],
          logConfiguration: {
            logDriver: 'awslogs',
            options: {
              'awslogs-group': config.logGroupName,
              'awslogs-region': config.region,
              'awslogs-stream-prefix': `agent-${agentInstanceId}`,
            },
          },
          healthCheck: {
            command: ['CMD-SHELL', 'curl -f http://localhost:18790/health || exit 1'],
            interval: 30,
            timeout: 5,
            retries: 3,
            startPeriod: 60,
          },
        },
      ],
    })
  );

  return result.taskDefinition?.taskDefinitionArn || '';
}

/**
 * Launch a new Fargate task for a user's agent.
 * Each user gets their own isolated container.
 * Sensitive values (DATABASE_URL) are passed via Secrets Manager.
 */
export async function launchAgentTask(
  agentInstanceId: string,
  userId: string,
  environment: Record<string, string>,
  config: AwsAgentConfig
): Promise<{ taskArn: string; publicIp?: string }> {
  // Build environment variables for the container
  const envVars: KeyValuePair[] = [
    { name: 'NOVA_AGENT_ID', value: agentInstanceId },
    { name: 'NOVA_USER_ID', value: userId },
    ...Object.entries(environment).map(([name, value]) => ({ name, value })),
  ];

  const result = await ecsClient.send(
    new RunTaskCommand({
      cluster: config.clusterArn,
      taskDefinition: `cosmo-agent-${agentInstanceId}`,
      launchType: 'FARGATE',
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: config.subnets,
          securityGroups: config.securityGroups,
          assignPublicIp: 'ENABLED',
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: 'cosmo-agent',
            environment: envVars,
          },
        ],
      },
      tags: [
        { key: 'cosmo:userId', value: userId },
        { key: 'cosmo:agentId', value: agentInstanceId },
      ],
    })
  );

  const task = result.tasks?.[0];
  if (!task?.taskArn) {
    throw new Error('Failed to launch agent task — no task ARN returned');
  }

  return {
    taskArn: task.taskArn,
    publicIp: undefined, // IP assigned after task reaches RUNNING state
  };
}

/**
 * Stop a running agent task.
 */
export async function stopAgentTask(
  clusterArn: string,
  taskArn: string,
  reason: string = 'User requested stop'
): Promise<void> {
  await ecsClient.send(
    new StopTaskCommand({
      cluster: clusterArn,
      task: taskArn,
      reason,
    })
  );
}

/**
 * Get the current status and public IP of a running task.
 */
export async function describeAgentTask(
  clusterArn: string,
  taskArn: string
): Promise<{
  status: string;
  publicIp?: string;
  stoppedReason?: string;
}> {
  const result = await ecsClient.send(
    new DescribeTasksCommand({
      cluster: clusterArn,
      tasks: [taskArn],
    })
  );

  const task = result.tasks?.[0];
  if (!task) {
    return { status: 'NOT_FOUND' };
  }

  // Extract public IP from network interface attachment
  const eni = task.attachments?.find(a => a.type === 'ElasticNetworkInterface');
  const publicIp = eni?.details?.find(d => d.name === 'publicIPv4Address')?.value;

  return {
    status: task.lastStatus || 'UNKNOWN',
    publicIp,
    stoppedReason: task.stoppedReason,
  };
}

// ──────────────────────────────────────────────
// Secrets Manager — database connection
// ──────────────────────────────────────────────

/**
 * Ensure DATABASE_URL is stored in Secrets Manager for ECS task injection.
 * Returns the secret ARN. Idempotent — creates or updates.
 */
async function ensureDatabaseSecret(): Promise<string> {
  const secretName = 'cosmo/database-url';
  const databaseUrl = process.env.DATABASE_URL || '';

  try {
    const result = await secretsClient.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: databaseUrl,
        Description: 'Nova AI — PostgreSQL connection string for agent containers',
      })
    );
    return result.ARN!;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ResourceExistsException') {
      await secretsClient.send(
        new PutSecretValueCommand({
          SecretId: secretName,
          SecretString: databaseUrl,
        })
      );
      return `arn:aws:secretsmanager:${region}:${process.env.AWS_ACCOUNT_ID}:secret:${secretName}`;
    }
    throw error;
  }
}

/**
 * Fetch a secret value from AWS Secrets Manager.
 * Used by the agent container at startup to retrieve API keys.
 */
export async function getSecretValue(secretArn: string): Promise<string> {
  const result = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretArn })
  );
  return result.SecretString || '';
}

// ──────────────────────────────────────────────
// CloudWatch Logs — agent log retrieval
// ──────────────────────────────────────────────

/**
 * Get recent log entries from the agent container.
 */
export async function getAgentLogs(
  agentInstanceId: string,
  limit: number = 100
): Promise<string[]> {
  const config = getAwsConfig();
  const logStreamName = `agent-${agentInstanceId}/cosmo-agent`;

  try {
    const result = await logsClient.send(
      new GetLogEventsCommand({
        logGroupName: config.logGroupName,
        logStreamName,
        limit,
        startFromHead: false,
      })
    );

    return result.events?.map(e => e.message || '').filter(Boolean) || [];
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ResourceNotFoundException') {
      return [];
    }
    throw error;
  }
}
