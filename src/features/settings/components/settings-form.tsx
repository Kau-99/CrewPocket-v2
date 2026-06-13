"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { useUiStore } from "@/hooks/use-ui-store";
import { storage } from "@/lib/firebase/client";
import { exportAllData, downloadBlob } from "@/lib/export-data";
import { compressToWebP } from "@/lib/image";
import { centsToDollarsString, dollarsToCents } from "@/lib/utils";

import { updateSettings } from "../api";
import type { Settings } from "../schemas";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ id, label, children }: { id?: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** Tela de Settings (SPEC §8): empresa, preferências, invoice config, rates. */
export function SettingsForm({ settings }: { settings: Settings }) {
  const dict = useTranslation();
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const setLanguage = useUiStore((store) => store.setLanguage);

  const [draft, setDraft] = useState({
    companyName: settings.companyName,
    companyAddress: settings.companyAddress,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    timezone: settings.timezone,
    invoicePrefix: settings.invoicePrefix,
    invoiceCounter: String(settings.invoiceCounter),
    estimateCounter: String(settings.estimateCounter),
    taxPctDefault: String(settings.taxPctDefault),
    laborRate: centsToDollarsString(settings.defaultLaborRateCents),
    mileageRate: String(settings.mileageRateCents),
    minMarginPct: String(settings.minMarginPct),
    taxId: settings.taxId,
    licenseNumber: settings.licenseNumber,
    website: settings.website,
    defaultEstimateTerms: settings.defaultEstimateTerms,
    paymentInstructions: settings.paymentInstructions,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // realinha quando o doc muda por fora (outra aba)
    setDraft((previous) => ({ ...previous, companyName: settings.companyName }));
  }, [settings.companyName]);

  function patch(partial: Partial<typeof draft>) {
    setDraft((previous) => ({ ...previous, ...partial }));
  }

  function applyImmediate(partial: Partial<Settings>) {
    if (!user) return;
    updateSettings(user.uid, settings, partial).catch(() => toast.error(dict.errors.unknown));
  }

  async function handleLogoUpload(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const blob = await compressToWebP(file, 512);
      const fileRef = ref(storage, `users/${user.uid}/logo/logo.webp`);
      await uploadBytes(fileRef, blob, { contentType: "image/webp" });
      const url = await getDownloadURL(fileRef);
      applyImmediate({ logoUrl: url });
      toast.success(dict.settings.savedToast);
    } catch {
      toast.error(dict.errors.unknown);
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    if (!user) return;
    const laborRateCents = dollarsToCents(draft.laborRate);
    const invoiceCounter = Number(draft.invoiceCounter);
    const estimateCounter = Number(draft.estimateCounter);
    const taxPctDefault = Number(draft.taxPctDefault);
    const mileageRateCents = Number(draft.mileageRate);
    const minMarginPct = Number(draft.minMarginPct);
    if (
      !draft.companyName.trim() ||
      laborRateCents === null ||
      !Number.isInteger(invoiceCounter) ||
      invoiceCounter < 1 ||
      !Number.isInteger(estimateCounter) ||
      estimateCounter < 1 ||
      !Number.isFinite(taxPctDefault) ||
      taxPctDefault < 0 ||
      taxPctDefault > 30 ||
      !Number.isInteger(mileageRateCents) ||
      mileageRateCents < 0 ||
      !Number.isFinite(minMarginPct) ||
      minMarginPct < 0 ||
      minMarginPct > 100
    ) {
      toast.error(dict.errors.validation);
      return;
    }
    setSaving(true);
    updateSettings(user.uid, settings, {
      companyName: draft.companyName.trim(),
      companyAddress: draft.companyAddress,
      companyPhone: draft.companyPhone,
      companyEmail: draft.companyEmail,
      timezone: draft.timezone,
      invoicePrefix: draft.invoicePrefix,
      invoiceCounter,
      estimateCounter,
      taxPctDefault,
      defaultLaborRateCents: laborRateCents,
      mileageRateCents,
      minMarginPct,
      taxId: draft.taxId.trim(),
      licenseNumber: draft.licenseNumber.trim(),
      website: draft.website.trim(),
      defaultEstimateTerms: draft.defaultEstimateTerms,
      paymentInstructions: draft.paymentInstructions,
    })
      .then(() => toast.success(dict.settings.savedToast))
      .catch(() => toast.error(dict.errors.validation))
      .finally(() => {
        setSaving(false);
      });
  }

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    try {
      const blob = await exportAllData(user.uid);
      downloadBlob(blob, `crewpocket-export-${new Date().toISOString().slice(0, 10)}.json`);
    } catch {
      toast.error(dict.errors.unknown);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Section title={dict.settings.companySection}>
        <p className="text-xs text-muted-foreground">{dict.settings.companyHint}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="set-name" label={dict.clients.fields.name}>
            <Input
              id="set-name"
              value={draft.companyName}
              onChange={(event) => {
                patch({ companyName: event.target.value });
              }}
            />
          </Field>
          <Field id="set-email" label={dict.clients.fields.email}>
            <Input
              id="set-email"
              type="email"
              value={draft.companyEmail}
              onChange={(event) => {
                patch({ companyEmail: event.target.value });
              }}
            />
          </Field>
          <Field id="set-address" label={dict.clients.fields.address}>
            <Input
              id="set-address"
              value={draft.companyAddress}
              onChange={(event) => {
                patch({ companyAddress: event.target.value });
              }}
            />
          </Field>
          <Field id="set-phone" label={dict.clients.fields.phone}>
            <Input
              id="set-phone"
              type="tel"
              value={draft.companyPhone}
              onChange={(event) => {
                patch({ companyPhone: event.target.value });
              }}
            />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          {settings.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL do Storage, next/image exige domínio configurado
            <img
              src={settings.logoUrl}
              alt={dict.settings.logo}
              className="size-12 rounded border"
            />
          )}
          <Button variant="outline" size="sm" disabled={uploading} asChild>
            <label className="cursor-pointer">
              {uploading ? dict.common.loading : dict.settings.uploadLogo}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleLogoUpload(file);
                }}
              />
            </label>
          </Button>
          {settings.logoUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                applyImmediate({ logoUrl: null });
              }}
            >
              {dict.settings.removeLogo}
            </Button>
          )}
        </div>
      </Section>

      <Section title={dict.settings.preferencesSection}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={dict.settings.language}>
            <Select
              value={settings.language}
              onValueChange={(value) => {
                const language = value as Settings["language"];
                setLanguage(language);
                applyImmediate({ language });
              }}
            >
              <SelectTrigger aria-label={dict.settings.language}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={dict.settings.theme}>
            <Select
              value={settings.theme}
              onValueChange={(value) => {
                const theme = value as Settings["theme"];
                setTheme(theme);
                applyImmediate({ theme });
              }}
            >
              <SelectTrigger aria-label={dict.settings.theme}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["dark", "light", "system"] as const).map((theme) => (
                  <SelectItem key={theme} value={theme}>
                    {dict.settings.themes[theme]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="set-tz" label={dict.settings.timezone}>
            <Input
              id="set-tz"
              value={draft.timezone}
              onChange={(event) => {
                patch({ timezone: event.target.value });
              }}
            />
          </Field>
        </div>
      </Section>

      <Section title={dict.settings.businessSection}>
        <p className="text-xs text-muted-foreground">{dict.settings.businessHint}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field id="set-taxid" label={dict.settings.taxId}>
            <Input
              id="set-taxid"
              value={draft.taxId}
              onChange={(event) => {
                patch({ taxId: event.target.value });
              }}
            />
          </Field>
          <Field id="set-license" label={dict.settings.licenseNumber}>
            <Input
              id="set-license"
              value={draft.licenseNumber}
              onChange={(event) => {
                patch({ licenseNumber: event.target.value });
              }}
            />
          </Field>
          <Field id="set-website" label={dict.settings.website}>
            <Input
              id="set-website"
              type="url"
              placeholder="https://"
              value={draft.website}
              onChange={(event) => {
                patch({ website: event.target.value });
              }}
            />
          </Field>
        </div>
      </Section>

      <Section title={dict.settings.documentDefaultsSection}>
        <p className="text-xs text-muted-foreground">{dict.settings.documentDefaultsHint}</p>
        <Field id="set-terms" label={dict.settings.defaultEstimateTerms}>
          <Textarea
            id="set-terms"
            rows={3}
            value={draft.defaultEstimateTerms}
            placeholder={dict.documents.termsPlaceholder}
            onChange={(event) => {
              patch({ defaultEstimateTerms: event.target.value });
            }}
          />
        </Field>
        <Field id="set-payinfo" label={dict.settings.paymentInstructions}>
          <Textarea
            id="set-payinfo"
            rows={2}
            value={draft.paymentInstructions}
            placeholder={dict.settings.paymentInstructionsPlaceholder}
            onChange={(event) => {
              patch({ paymentInstructions: event.target.value });
            }}
          />
        </Field>
      </Section>

      <Section title={dict.settings.invoiceSection}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field id="set-prefix" label={dict.settings.invoicePrefix}>
            <Input
              id="set-prefix"
              value={draft.invoicePrefix}
              onChange={(event) => {
                patch({ invoicePrefix: event.target.value });
              }}
            />
          </Field>
          <Field id="set-invcounter" label={dict.settings.invoiceCounter}>
            <Input
              id="set-invcounter"
              inputMode="numeric"
              value={draft.invoiceCounter}
              onChange={(event) => {
                patch({ invoiceCounter: event.target.value });
              }}
            />
          </Field>
          <Field id="set-estcounter" label={dict.settings.estimateCounter}>
            <Input
              id="set-estcounter"
              inputMode="numeric"
              value={draft.estimateCounter}
              onChange={(event) => {
                patch({ estimateCounter: event.target.value });
              }}
            />
          </Field>
          <Field id="set-tax" label={dict.settings.taxDefault}>
            <Input
              id="set-tax"
              inputMode="decimal"
              value={draft.taxPctDefault}
              onChange={(event) => {
                patch({ taxPctDefault: event.target.value });
              }}
            />
          </Field>
        </div>
      </Section>

      <Section title={dict.settings.ratesSection}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field id="set-labor" label={dict.settings.laborRate}>
            <Input
              id="set-labor"
              inputMode="decimal"
              value={draft.laborRate}
              onChange={(event) => {
                patch({ laborRate: event.target.value });
              }}
            />
          </Field>
          <Field id="set-mileage" label={dict.settings.mileageRate}>
            <Input
              id="set-mileage"
              inputMode="numeric"
              value={draft.mileageRate}
              onChange={(event) => {
                patch({ mileageRate: event.target.value });
              }}
            />
          </Field>
          <Field id="set-margin" label={dict.settings.minMargin}>
            <Input
              id="set-margin"
              inputMode="decimal"
              value={draft.minMarginPct}
              onChange={(event) => {
                patch({ minMarginPct: event.target.value });
              }}
            />
          </Field>
        </div>
      </Section>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? dict.common.loading : dict.common.save}
      </Button>

      <Section title={dict.settings.dataSection}>
        <p className="text-xs text-muted-foreground">{dict.settings.dataHint}</p>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          <Download className="mr-1 size-4" aria-hidden="true" />
          {exporting ? dict.common.loading : dict.settings.exportData}
        </Button>
      </Section>
    </div>
  );
}
