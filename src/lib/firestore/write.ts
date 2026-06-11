import { logger } from "@/lib/logger";

/**
 * Offline-first (SPEC §7, ADR-016): escritas do Firestore commitam no cache
 * local imediatamente e sincronizam em background — aguardar o ack do
 * servidor travaria toda mutation sem sinal. O catch captura rejeições
 * reais (rules); como as rules espelham os Zod schemas já validados no
 * client, rejeição aqui indica bug ou adulteração — log, não toast.
 */
export function commitWrite(
  write: Promise<void>,
  context: { collection: string; docId: string; op: "set" | "delete" },
): void {
  write.catch((error: unknown) => {
    logger.error("firestore write rejected after local commit", {
      ...context,
      message: error instanceof Error ? error.message : String(error),
    });
  });
}
