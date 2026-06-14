import "server-only";

import { env } from "@/env";

/** Resend configurado? (API key + remetente). */
export function resendConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM);
}

/** Envia um e-mail transacional via Resend (REST direto, sem SDK). */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!response.ok) {
    throw new Error(`resend ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
}

/** E-mail de redefinição de senha — HTML simples e à prova de clientes de e-mail. */
export function passwordResetHtml(link: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <tr><td style="padding:28px 32px 8px">
          <div style="font-size:20px;font-weight:bold;color:#111827">Crew<span style="color:#2563eb">Pocket</span></div>
        </td></tr>
        <tr><td style="padding:8px 32px 0">
          <h1 style="font-size:18px;color:#111827;margin:8px 0">Reset your password</h1>
          <p style="font-size:14px;color:#4b5563;line-height:1.6">
            We got a request to reset your CrewPocket password. Click the button below to choose a new one. This link expires in 1 hour.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px">
          <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:8px">Reset password</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px">
          <p style="font-size:12px;color:#9ca3af;line-height:1.6">
            If you didn't ask for this, you can safely ignore this email — your password won't change.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
