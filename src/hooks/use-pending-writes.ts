"use client";

import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";

/**
 * Indicador de writes pendentes via SnapshotMetadata.hasPendingWrites
 * (SPEC §7). Observa as coleções mais escritas no campo (jobs e timeLogs)
 * com includeMetadataChanges — cobre o fluxo crítico offline.
 */
export function usePendingWrites(): boolean {
  const { user } = useAuth();
  const uid = user?.uid;
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!uid) {
      setPending({});
      return;
    }
    const watched = [COLLECTIONS.jobs, COLLECTIONS.timeLogs];
    const unsubscribes = watched.map((collectionName) =>
      onSnapshot(
        query(collection(db, collectionName), where("ownerId", "==", uid), limit(50)),
        { includeMetadataChanges: true },
        (snapshot) => {
          setPending((previous) => ({
            ...previous,
            [collectionName]: snapshot.metadata.hasPendingWrites,
          }));
        },
        () => {
          setPending((previous) => ({ ...previous, [collectionName]: false }));
        },
      ),
    );
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [uid]);

  return Object.values(pending).some(Boolean);
}
