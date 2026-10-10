import "server-only";

import { Resend } from "resend";

const DEFAULT_RESEND_API_BASE_URL = "https://api.resend.com";

type SendTransactionalEmailParams = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
};

let resendClient: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey?.trim()) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey.trim());
  }

  return resendClient;
}

export async function sendTransactionalEmail({
  to,
  from,
  subject,
  text,
  html,
}: SendTransactionalEmailParams) {
  const client = getResendClient();
  if (!client) {
    return {
      ok: true as const,
      mode: "noop" as const,
      reason: "RESEND_API_KEY missing",
    };
  }

  const { data, error } = await client.emails.send({
    from,
    to: [to],
    subject,
    text,
    html,
  });

  if (error) {
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message
        : "Unknown Resend delivery error.";
    throw new Error(message);
  }

  return {
    ok: true as const,
    mode: "provider" as const,
    provider: "resend" as const,
    messageId: data?.id ?? null,
    apiBaseUrl: process.env.RESEND_API_BASE_URL ?? DEFAULT_RESEND_API_BASE_URL,
  };
}

