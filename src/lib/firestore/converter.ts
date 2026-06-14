import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import type { z } from "zod";

import { logger } from "@/lib/logger";

/** Cada doc inválido é logado UMA vez por sessão — sem inundar o console em
 * cada re-leitura/refetch do mesmo doc problemático. */
const loggedInvalid = new Set<string>();

/**
 * Converter genérico (SPEC §3.2.4): toda leitura passa por safeParse.
 * Documento inválido → log estruturado + `null` (o chamador filtra),
 * nunca exceção que derrube a UI inteira por 1 doc corrompido.
 *
 * Escrita NÃO passa por aqui: mutations fazem `schema.parse` explícito
 * antes do setDoc (SPEC §3.2.5).
 */
export function createConverter<Schema extends z.ZodTypeAny>(
  collectionName: string,
  schema: Schema,
): FirestoreDataConverter<z.infer<Schema> | null> {
  return {
    toFirestore(model: z.infer<Schema>): DocumentData {
      return schema.parse(model) as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): z.infer<Schema> | null {
      const parsed = schema.safeParse(snapshot.data());
      if (!parsed.success) {
        const key = `${collectionName}/${snapshot.id}`;
        if (!loggedInvalid.has(key)) {
          loggedInvalid.add(key);
          logger.error("invalid firestore document, excluded from result", {
            collection: collectionName,
            docId: snapshot.id,
            issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.code}`),
          });
        }
        return null;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- parsed.data tem o shape garantido pelo safeParse; z.infer<Schema> só não é estreitável com Schema genérico
      return parsed.data as z.infer<Schema>;
    },
  };
}

/** Type guard para filtrar os nulls que o converter produz. */
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}
