import { Timestamp } from "firebase/firestore";

/**
 * Fixtures válidas (passam nos Zod schemas e nas Firestore Rules).
 * Usadas pelos testes de schema e pela matriz de rules tests.
 */
export function makeBase(ownerId = "user-a") {
  return {
    id: crypto.randomUUID(),
    ownerId,
    createdAt: Timestamp.fromDate(new Date("2026-01-01T12:00:00Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-01-02T12:00:00Z")),
    schemaVersion: 2 as const,
  };
}

export function makeClient(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    name: "John Doe",
    email: "john@example.com",
    phone: "555-0100",
    address: "123 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    notes: "",
    isArchived: false,
  };
}

export function makeCostItem() {
  return {
    id: crypto.randomUUID(),
    name: "Cellulose bags",
    category: "material" as const,
    qty: 22,
    unitCostCents: 45_00,
  };
}

export function makeJob(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    name: "Attic insulation — Main St",
    clientId: null,
    clientName: "John Doe",
    status: "lead" as const,
    priority: "normal" as const,
    paymentStatus: "unpaid" as const,
    date: Timestamp.fromDate(new Date("2026-02-01T09:00:00Z")),
    deadline: null,
    address: "123 Main St",
    zip: "78701",
    description: "",
    notes: "",
    tags: ["insulation"],
    costs: [makeCostItem()],
    valueCents: 250_000,
    depositCents: 0,
    paidCents: 0,
    paidAt: null,
    photoUrls: [],
    estimateId: null,
    invoiceId: null,
    serviceType: "Insulation",
    city: "Austin",
    state: "TX",
    areaSqft: 1200,
    scheduledTime: "8–10 AM",
    siteContactName: "Jane Site",
    siteContactPhone: "555-0100",
    referralSource: "Google",
    crewIds: [],
    checklist: [],
  };
}

export function makeLineItem() {
  return {
    id: crypto.randomUUID(),
    description: "R-38 blow-in, 1200 sqft",
    qty: 1,
    unitPriceCents: 185_000,
    unit: "sqft",
    note: "",
  };
}

export function makeEstimate(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    number: "EST-0001",
    clientId: null,
    clientName: "John Doe",
    title: "Attic insulation",
    status: "draft" as const,
    lineItems: [makeLineItem()],
    discountPct: 0,
    taxPct: 8.25,
    notes: "",
    validUntil: Timestamp.fromDate(new Date("2026-03-01T00:00:00Z")),
    sentAt: null,
    acceptedAt: null,
    declinedAt: null,
    convertedJobId: null,
    terms: "Net 30. 1-year workmanship warranty.",
    depositType: "percent" as const,
    depositValue: 25,
    signatureDataUrl: "",
    signedName: "",
    signedAt: null,
  };
}

export function makeEstimateTemplate(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    name: "Attic package",
    title: "Attic insulation",
    lineItems: [makeLineItem()],
    discountPct: 0,
    taxPct: 8.25,
    notes: "",
    terms: "Net 30.",
  };
}

export function makeInvoice(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    number: "INV-0001",
    jobId: crypto.randomUUID(),
    clientId: null,
    clientName: "John Doe",
    lineItems: [makeLineItem()],
    discountPct: 0,
    taxPct: 8.25,
    notes: "",
    status: "draft" as const,
    dueDate: Timestamp.fromDate(new Date("2026-03-15T00:00:00Z")),
    paidAt: null,
    paidCents: 0,
  };
}

export function makeCrewMember(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    name: "Mike Worker",
    role: "Installer",
    phone: "555-0101",
    email: "",
    hourlyRateCents: 25_00,
    certifications: "",
    status: "active" as const,
  };
}

export function makeTimeLog(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    jobId: crypto.randomUUID(),
    crewMemberId: null,
    crewName: "Owner",
    clockIn: Timestamp.fromDate(new Date("2026-02-01T13:00:00Z")),
    clockOut: Timestamp.fromDate(new Date("2026-02-01T17:30:00Z")),
    breakMinutes: 30,
    note: "",
    gps: { lat: 30.2672, lng: -97.7431, accuracy: 12 },
  };
}

export function makeMileageLog(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    jobId: null,
    date: Timestamp.fromDate(new Date("2026-02-01T00:00:00Z")),
    miles: 24.6,
    purpose: "Supply run",
  };
}

export function makeInventoryItem(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    name: "Cellulose bag",
    category: "Insulation",
    quantity: 40,
    unit: "bag",
    unitCostCents: 45_00,
    supplier: "Home Depot",
    minStock: 10,
  };
}

export function makeEquipmentItem(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    name: "Graco spray rig",
    category: "Spray rig",
    status: "available" as const,
    serialNumber: "SN-12345",
    location: "Truck 2",
    purchaseCostCents: 12_000_00,
    notes: "",
  };
}

export function makePricebookItem(ownerId?: string) {
  return {
    ...makeBase(ownerId),
    name: "R-38 blow-in per sqft",
    category: "Insulation",
    unit: "sqft",
    unitPriceCents: 1_54,
    unitCostCents: 80,
    description: "",
  };
}

export function makeSubscription() {
  return {
    status: "active" as const,
    plan: "pro" as const,
    interval: "monthly" as const,
    stripeCustomerId: "cus_123",
    stripeSubscriptionId: "sub_123",
    currentPeriodEnd: Timestamp.fromDate(new Date("2026-07-01T00:00:00Z")),
    cancelAtPeriodEnd: false,
    updatedAt: Timestamp.fromDate(new Date("2026-06-01T00:00:00Z")),
  };
}
