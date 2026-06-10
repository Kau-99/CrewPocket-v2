/**
 * Códigos de erro tipados (SPEC §9). O mapa código → mensagem i18n
 * vive em `src/i18n` e é indexado por estes códigos.
 */
export type AppErrorCode =
  | "auth/expired"
  | "auth/unauthorized"
  | "firestore/permission-denied"
  | "firestore/not-found"
  | "stripe/checkout-failed"
  | "stripe/portal-failed"
  | "offline"
  | "validation"
  | "unknown";

export class AppError extends Error {
  readonly code: AppErrorCode;
  override readonly cause: unknown;

  constructor(code: AppErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code);
    this.name = "AppError";
    this.code = code;
    this.cause = options?.cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Normaliza qualquer erro desconhecido para AppError na borda das mutations. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    return new AppError("unknown", error.message, { cause: error });
  }
  return new AppError("unknown", String(error), { cause: error });
}
