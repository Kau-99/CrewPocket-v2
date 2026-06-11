"use client";

import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

/**
 * Render do PDF via import dinâmico — @react-pdf/renderer pesa centenas
 * de KB e só entra no bundle quando o usuário pede o documento.
 */
async function renderPdfBlob(element: ReactElement): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  // nosso element é sempre <DocumentPdf/> (que renderiza <Document/>)
  return pdf(element as ReactElement<DocumentProps>).toBlob();
}

export async function openPdfPreview(element: ReactElement): Promise<void> {
  const blob = await renderPdfBlob(element);
  window.open(URL.createObjectURL(blob), "_blank", "noopener");
}

export async function downloadPdf(element: ReactElement, filename: string): Promise<void> {
  const blob = await renderPdfBlob(element);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Send (SPEC §8): abre o cliente de e-mail; o PDF baixado vai anexado à mão. */
export function openMailto(to: string, subject: string, body: string): void {
  const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

/** Interpolação simples dos templates i18n ({chave} → valor). */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
