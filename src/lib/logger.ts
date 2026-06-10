type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  uid?: string;
  route?: string;
  [key: string]: unknown;
}

const isProd = process.env.NODE_ENV === "production";

/** Nunca logar tokens/PII (SPEC §6.5). Redigir chaves sensíveis por convenção de nome. */
const SENSITIVE_KEY_PATTERN = /token|secret|password|authorization|apikey|api_key|email|phone/i;

function redact(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (isProd && (level === "debug" || level === "info")) return;

  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? redact(context) : {}),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    // Logger central é a exceção sancionada à proibição de console.log (SPEC §2)
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, context?: LogContext): void => {
    emit("debug", message, context);
  },
  info: (message: string, context?: LogContext): void => {
    emit("info", message, context);
  },
  warn: (message: string, context?: LogContext): void => {
    emit("warn", message, context);
  },
  error: (message: string, context?: LogContext): void => {
    emit("error", message, context);
  },
};
