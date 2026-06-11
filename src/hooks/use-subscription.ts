"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { subscriptionSchema, type Subscription } from "@/features/billing/schemas";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { logger } from "@/lib/logger";

interface SubscriptionState {
  /** null = sem doc (nunca assinou) ou inválido */
  subscription: Subscription | null;
  loading: boolean;
}

/**
 * Tempo real via onSnapshot (SPEC §6.2). O doc é escrito SOMENTE pelo
 * servidor (webhook) — o client apenas observa.
 */
export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const uid = user?.uid;
  const [state, setState] = useState<SubscriptionState>({ subscription: null, loading: true });

  useEffect(() => {
    if (!uid) {
      setState({ subscription: null, loading: false });
      return;
    }
    setState({ subscription: null, loading: true });
    return onSnapshot(
      doc(db, COLLECTIONS.subscriptions, uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setState({ subscription: null, loading: false });
          return;
        }
        const parsed = subscriptionSchema.safeParse(snapshot.data());
        if (!parsed.success) {
          logger.error("subscription doc failed validation", { uid });
          setState({ subscription: null, loading: false });
          return;
        }
        setState({ subscription: parsed.data, loading: false });
      },
      (error) => {
        logger.error("subscription listener error", { uid, code: error.code });
        setState({ subscription: null, loading: false });
      },
    );
  }, [uid]);

  return state;
}
