import { Resend } from "resend";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

function getResendConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    console.warn(
      "[notifications] RESEND_API_KEY or RESEND_FROM_EMAIL missing; skipping email.",
    );
    return null;
  }

  return { apiKey, from };
}

let resendClient: Resend | null = null;

function getClient(apiKey: string): Resend {
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const config = getResendConfig();
  if (!config) return;

  const { error } = await getClient(config.apiKey).emails.send({
    from: config.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.warn("[notifications] Resend send failed:", error.message);
  }
}
