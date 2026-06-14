import { sendPasswordResetEmail } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

/**
 * Reset de senha com entrega confiável: tenta a rota do Resend; se não estiver
 * configurada (501) ou falhar, cai no envio padrão do Firebase. Assim funciona
 * antes e depois de o Resend ser configurado, sem quebrar nada.
 */
export async function requestPasswordResetEmail(email: string): Promise<void> {
  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (response.ok) return;
  } catch {
    // rede falhou → fallback Firebase
  }
  await sendPasswordResetEmail(auth, email);
}
