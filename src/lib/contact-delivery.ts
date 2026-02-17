import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';

export interface ContactSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ContactDeliveryResult {
  method: 'ses' | 'webhook';
  reference?: string;
}

const region = process.env.AWS_REGION || 'eu-north-1';
const sesClient = new SESClient({ region });

const SUBJECT_LABELS: Record<string, string> = {
  general: 'General Inquiry',
  support: 'Support Request',
  billing: 'Billing Question',
  feedback: 'Feedback',
  partnership: 'Partnership Inquiry',
  press: 'Press & Media',
  privacy: 'Privacy Request',
};

function getSubjectLabel(subject: string): string {
  return SUBJECT_LABELS[subject] || subject || 'General Inquiry';
}

function buildEmailBody(payload: ContactSubmission): string {
  const subjectLabel = getSubjectLabel(payload.subject);
  return [
    'New contact form submission',
    '',
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Subject: ${subjectLabel}`,
    '',
    'Message:',
    payload.message,
    '',
    `Received at: ${new Date().toISOString()}`,
  ].join('\n');
}

async function sendViaWebhook(payload: ContactSubmission): Promise<ContactDeliveryResult | null> {
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  if (!webhookUrl) return null;

  const subjectLabel = getSubjectLabel(payload.subject);
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'nova-contact-form',
      timestamp: new Date().toISOString(),
      submission: {
        name: payload.name,
        email: payload.email,
        subject: subjectLabel,
        message: payload.message,
      },
      text: `New contact submission (${subjectLabel}) from ${payload.name} <${payload.email}>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Contact webhook delivery failed (${response.status}): ${body || response.statusText}`);
  }

  return { method: 'webhook' };
}

async function sendViaSes(payload: ContactSubmission): Promise<ContactDeliveryResult | null> {
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  if (!fromEmail || !toEmail) return null;

  const subjectLabel = getSubjectLabel(payload.subject);
  const body = buildEmailBody(payload);

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    ReplyToAddresses: [payload.email],
    Message: {
      Subject: {
        Data: `[Nova Contact] ${subjectLabel} from ${payload.name}`,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: body,
          Charset: 'UTF-8',
        },
      },
    },
  });

  const result = await sesClient.send(command);
  return {
    method: 'ses',
    reference: result.MessageId,
  };
}

export async function deliverContactSubmission(payload: ContactSubmission): Promise<ContactDeliveryResult> {
  const webhookResult = await sendViaWebhook(payload);
  if (webhookResult) return webhookResult;

  const sesResult = await sendViaSes(payload);
  if (sesResult) return sesResult;

  throw new Error(
    'Contact delivery is not configured. Set CONTACT_WEBHOOK_URL or CONTACT_FROM_EMAIL + CONTACT_TO_EMAIL.'
  );
}
