import {
  onSnapshot,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreError,
  type Query,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { logger } from "@/lib/logger";

/**
 * Re-assinatura com backoff para onSnapshot (padrão da Fase 7): um erro de
 * watch ENCERRA o listener do SDK — sem isto, a UI congela no último estado
 * ou, pior, interpreta o erro como "documento não existe". O erro nunca é
 * propagado como dado; apenas re-assina.
 */
function withRetry<SnapshotType>(
  subscribe: (
    onNext: (snapshot: SnapshotType) => void,
    onError: (error: FirestoreError) => void,
  ) => Unsubscribe,
  onNext: (snapshot: SnapshotType) => void,
  context: string,
): Unsubscribe {
  let cancelled = false;
  let unsubscribe: Unsubscribe = () => undefined;
  let attempt = 0;

  const start = () => {
    unsubscribe = subscribe(
      (snapshot) => {
        attempt = 0;
        onNext(snapshot);
      },
      (error) => {
        logger.error("firestore listener error, resubscribing", {
          context,
          code: error.code,
          attempt,
        });
        if (cancelled) return;
        attempt += 1;
        setTimeout(
          () => {
            if (!cancelled) start();
          },
          Math.min(8_000, 1_000 * attempt),
        );
      },
    );
  };
  start();

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export function subscribeDocWithRetry<T>(
  ref: DocumentReference<T>,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  context: string,
): Unsubscribe {
  return withRetry<DocumentSnapshot<T>>(
    (next, error) => onSnapshot(ref, next, error),
    onNext,
    context,
  );
}

export function subscribeQueryWithRetry<T>(
  queryRef: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  context: string,
): Unsubscribe {
  return withRetry<QuerySnapshot<T>>(
    (next, error) => onSnapshot(queryRef, next, error),
    onNext,
    context,
  );
}
