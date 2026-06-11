"use client";

import { UpgradeGate } from "@/components/shared/upgrade-gate";
import { CrewList } from "@/features/crew/components/crew-list";
import { useEntitlements } from "@/hooks/use-entitlements";

// Crew management é Pro (SPEC §6.2) — bloqueado com blur + CTA, nunca escondido
export default function CrewPage() {
  const entitlements = useEntitlements();

  return (
    <UpgradeGate allowed={entitlements.crewManagement}>
      <CrewList />
    </UpgradeGate>
  );
}
