import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/env";
import { passwordResetHtml, resendConfigured, sendEmail } from "@/lib/email/resend";
import { getAdminAuth } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({ email: z.string().email() });

/**
 * Reset de senha via Resend (entrega confiável). Gera o link com o Admin SDK
 * e envia por e-mail. Sem Resend configurado → 501 e o client cai no envio
 * padrão do Firebase (fallback). Anti-enumeração: usuário inexistente → 200.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  const { email } = parsed.data;

  if (isRateLimited(`reset:${email.toLowerCase()}`, 5, 60_000)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  // sem Resend → o client usa o fallback do Firebase
  if (!resendConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 501 });
  }

  let link: string;
  try {
    link = await getAdminAuth().generatePasswordResetLink(email, {
      url: `${env.NEXT_PUBLIC_APP_URL}/login`,
    });
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    // usuário inexistente: responde igual (sem revelar) e não envia nada
    if (code === "auth/user-not-found" || code === "auth/email-not-found") {
      return NextResponse.json({ sent: true });
    }
    // erro de infra (ex.: service account ausente) → client cai no fallback
    logger.error("reset link generation failed", { route: "/api/auth/reset-password", code });
    return NextResponse.json({ error: "link-failed" }, { status: 500 });
  }

  try {
    await sendEmail({
      to: email,
      subject: "Reset your CrewPocket password",
      html: passwordResetHtml(link),
    });
  } catch (error) {
    logger.error("reset email send failed", {
      route: "/api/auth/reset-password",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "send-failed" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
