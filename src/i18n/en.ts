/**
 * Dicionário-fonte. `Dictionary = typeof en` — chave faltando em es.ts
 * vira erro de compilação (SPEC §8 i18n).
 */
export const en = {
  appName: "CrewPocket",
  common: {
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    undo: "Undo",
    retry: "Try again",
    offlineBadge: "Offline — changes will sync",
  },
  errors: {
    "auth/expired": "Your session expired. Please log in again.",
    "auth/unauthorized": "You don't have permission to do that.",
    "firestore/permission-denied": "You don't have permission to do that.",
    "firestore/not-found": "This item no longer exists.",
    "stripe/checkout-failed": "We couldn't start checkout. Please try again.",
    "stripe/portal-failed": "We couldn't open the billing portal. Please try again.",
    offline: "You're offline. This action will complete when you're back online.",
    validation: "Some fields are invalid. Please review and try again.",
    unknown: "Something went wrong. Please try again.",
  },
};

export type Dictionary = typeof en;
