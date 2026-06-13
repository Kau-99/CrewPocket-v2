import { FirebaseError } from "firebase/app";

/** Chaves de `dict.auth.errors`, ou null quando o erro deve ser silencioso. */
export type AuthErrorKey =
  | "invalidCredentials"
  | "emailInUse"
  | "weakPassword"
  | "tooManyRequests"
  | "networkOrConfig"
  | "unknown";

/**
 * Firebase Auth code → chave i18n. Popup fechado pelo usuário não é erro:
 * retorna null e a UI não mostra nada.
 */
/** Só aceita paths internos — evita open redirect via ?returnTo=https://evil. */
export function safeReturnTo(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export function mapAuthError(error: unknown): AuthErrorKey | null {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
      case "auth/invalid-email":
        return "invalidCredentials";
      case "auth/email-already-in-use":
        return "emailInUse";
      case "auth/weak-password":
        return "weakPassword";
      case "auth/too-many-requests":
        return "tooManyRequests";
      // domínio não autorizado (ex.: URL de deploy específico da Vercel em vez
      // do domínio canônico) ou rede bloqueada — mensagem acionável, não genérica
      case "auth/unauthorized-domain":
      case "auth/network-request-failed":
        return "networkOrConfig";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return null;
      default:
        return "unknown";
    }
  }
  return "unknown";
}
