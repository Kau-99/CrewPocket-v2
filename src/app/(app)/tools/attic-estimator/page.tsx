"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AtticCalculator,
  type AtticResult,
} from "@/features/attic-estimator/components/attic-calculator";
import { useEstimateMutations } from "@/features/estimates/hooks/use-estimates";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useTranslation } from "@/hooks/use-translation";
import { fillTemplate } from "@/lib/pdf-actions";

// Attic → Estimate: a criação cruza features, então vive na página (SPEC §3.2.1)
export default function AtticEstimatorPage() {
  const dict = useTranslation();
  const router = useRouter();
  const { settings } = useSettings();
  const { create } = useEstimateMutations({
    onCreated: (estimate) => {
      toast.success(dict.attic.estimateCreated);
      router.push(`/estimates/${estimate.id}`);
    },
  });

  function handleCreate(result: AtticResult) {
    create.mutate(
      {
        title: fillTemplate(dict.attic.estimateTitle, {
          rValue: result.rValue,
          sqft: String(result.sqft),
        }),
        clientId: null,
        clientName: "",
        taxPct: settings?.taxPctDefault ?? 0,
        lineItems: [
          {
            id: crypto.randomUUID(),
            description: fillTemplate(dict.attic.lineMaterial, {
              rValue: result.rValue,
              bags: String(result.bags),
            }),
            qty: result.bags,
            unitPriceCents: result.bagCostCents,
          },
          {
            id: crypto.randomUUID(),
            description: fillTemplate(dict.attic.lineLabor, {
              hours: result.laborHours.toFixed(1),
            }),
            qty: 1,
            unitPriceCents: result.laborCents,
          },
        ],
      },
      {
        // contador transacional exige rede (ADR-018)
        onError: () => toast.error(dict.errors.offline),
      },
    );
  }

  return (
    <AtticCalculator
      defaultLaborRateCents={settings?.defaultLaborRateCents ?? 65_00}
      onCreateEstimate={handleCreate}
      creating={create.isPending}
    />
  );
}
