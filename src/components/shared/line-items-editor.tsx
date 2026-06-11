"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { centsToDollarsString, dollarsToCents, formatCents } from "@/lib/utils";

/** Linha em edição (strings) — parse para centavos só no save. */
export interface LineItemDraft {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
}

export interface ParsedLineItem {
  id: string;
  description: string;
  qty: number;
  unitPriceCents: number;
}

export function toLineItemDrafts(
  items: { id: string; description: string; qty: number; unitPriceCents: number }[],
): LineItemDraft[] {
  return items.map((item) => ({
    id: item.id,
    description: item.description,
    qty: String(item.qty),
    unitPrice: centsToDollarsString(item.unitPriceCents),
  }));
}

/** null = alguma linha inválida. */
export function parseLineItemDrafts(drafts: LineItemDraft[]): ParsedLineItem[] | null {
  const parsed: ParsedLineItem[] = [];
  for (const draft of drafts) {
    const qty = Number(draft.qty);
    const unitPriceCents = dollarsToCents(draft.unitPrice);
    if (!draft.description.trim() || !Number.isFinite(qty) || qty < 0 || unitPriceCents === null) {
      return null;
    }
    parsed.push({ id: draft.id, description: draft.description.trim(), qty, unitPriceCents });
  }
  return parsed.length > 0 ? parsed : null;
}

/** Linhas parseáveis (para totais ao vivo enquanto edita). */
export function parseableLines(drafts: LineItemDraft[]): ParsedLineItem[] {
  return drafts
    .map((draft) => {
      const qty = Number(draft.qty);
      const unitPriceCents = dollarsToCents(draft.unitPrice);
      if (!Number.isFinite(qty) || qty < 0 || unitPriceCents === null) return null;
      return { id: draft.id, description: draft.description, qty, unitPriceCents };
    })
    .filter((item): item is ParsedLineItem => item !== null);
}

interface LineItemsEditorProps {
  items: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
}

/** Editor de line items: add/remove/reorder (SPEC §8). */
export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
  const dict = useTranslation();
  const labels = dict.documents;

  function patch(id: string, partial: Partial<LineItemDraft>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...partial } : item)));
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (moved) next.splice(target, 0, moved);
    onChange(next);
  }

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{labels.lineItems}</h2>
      <ul className="space-y-2">
        {items.map((item, index) => {
          const qty = Number(item.qty);
          const cents = dollarsToCents(item.unitPrice);
          const lineTotal =
            Number.isFinite(qty) && qty >= 0 && cents !== null ? Math.round(qty * cents) : null;
          return (
            <li
              key={item.id}
              className="grid grid-cols-[1fr_4rem_6rem_auto] items-center gap-2 sm:grid-cols-[1fr_4.5rem_6.5rem_6rem_auto]"
            >
              <Input
                value={item.description}
                placeholder={labels.descriptionCol}
                aria-label={labels.descriptionCol}
                onChange={(event) => {
                  patch(item.id, { description: event.target.value });
                }}
              />
              <Input
                value={item.qty}
                inputMode="decimal"
                aria-label={labels.qtyCol}
                onChange={(event) => {
                  patch(item.id, { qty: event.target.value });
                }}
              />
              <Input
                value={item.unitPrice}
                inputMode="decimal"
                aria-label={labels.priceCol}
                onChange={(event) => {
                  patch(item.id, { unitPrice: event.target.value });
                }}
              />
              <span className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">
                {lineTotal === null ? "—" : formatCents(lineTotal)}
              </span>
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={labels.moveUp}
                  disabled={index === 0}
                  onClick={() => {
                    move(index, -1);
                  }}
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={labels.moveDown}
                  disabled={index === items.length - 1}
                  onClick={() => {
                    move(index, 1);
                  }}
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={labels.removeItem}
                  disabled={items.length === 1}
                  onClick={() => {
                    onChange(items.filter((other) => other.id !== item.id));
                  }}
                >
                  <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onChange([
            ...items,
            { id: crypto.randomUUID(), description: "", qty: "1", unitPrice: "0.00" },
          ]);
        }}
      >
        <Plus className="mr-1 size-4" aria-hidden="true" />
        {labels.addItem}
      </Button>
    </section>
  );
}
