/**
 * Fonte única dos nomes de coleção do Firestore.
 * `subscriptions`, `customers` e `processedEvents` são escritos SOMENTE
 * pelo Admin SDK (SPEC §6.3) — nunca importar estes paths em mutations client.
 */
export const COLLECTIONS = {
  settings: "settings",
  subscriptions: "subscriptions",
  customers: "customers",
  processedEvents: "processedEvents",
  clients: "clients",
  jobs: "jobs",
  estimates: "estimates",
  estimateTemplates: "estimateTemplates",
  invoices: "invoices",
  crewMembers: "crewMembers",
  timeLogs: "timeLogs",
  mileageLogs: "mileageLogs",
  inventoryItems: "inventoryItems",
  pricebookItems: "pricebookItems",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
