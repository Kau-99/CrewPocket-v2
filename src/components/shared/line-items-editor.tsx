"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";

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
  unit: string;
  note: string;
}

export interface ParsedLineItem {
  id: string;
  description: string;
  qty: number;
  unitPriceCents: number;
  unit: string;
  note: string;
}

export function toLineItemDrafts(
  items: {
    id: string;
    description: string;
    qty: number;
    unitPriceCents: number;
    unit?: string;
    note?: string;
  }[],
): LineItemDraft[] {
  return items.map((item) => ({
    id: item.id,
    description: item.description,
    qty: String(item.qty),
    unitPrice: centsToDollarsString(item.unitPriceCents),
    unit: item.unit ?? "",
    note: item.note ?? "",
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
    parsed.push({
      id: draft.id,
      description: draft.description.trim(),
      qty,
      unitPriceCents,
      unit: draft.unit.trim().slice(0, 20),
      note: draft.note.trim().slice(0, 300),
    });
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
      return {
        id: draft.id,
        description: draft.description,
        qty,
        unitPriceCents,
        unit: draft.unit,
        note: draft.note,
      };
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

  function duplicate(index: number) {
    const source = items[index];
    if (!source) return;
    const copy: LineItemDraft = { ...source, id: crypto.randomUUID() };
    const next = [...items];
    next.splice(index + 1, 0, copy);
    onChange(next);
  }

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{labels.lineItems}</h2>
      <ul className="space-y-3">
        {items.map((item, index) => {
          const qty = Number(item.qty);
          const cents = dollarsToCents(item.unitPrice);
          const lineTotal =
            Number.isFinite(qty) && qty >= 0 && cents !== null ? Math.round(qty * cents) : null;
          return (
            <li key={item.id} className="space-y-1.5 rounded-lg border p-2">
              <div className="grid grid-cols-[1fr_3.5rem_3.5rem_5.5rem_auto] items-center gap-2">
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
                  value={item.unit}
                  placeholder={labels.unitCol}
                  aria-label={labels.unitCol}
                  onChange={(event) => {
                    patch(item.id, { unit: event.target.value });
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
                <span className="w-20 text-right text-sm tabular-nums text-muted-foreground">
                  {lineTotal === null ? "—" : formatCents(lineTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={item.note}
                  placeholder={labels.noteCol}
                  aria-label={labels.noteCol}
                  className="h-8 flex-1 text-sm"
                  onChange={(event) => {
                    patch(item.id, { note: event.target.value });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
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
                  className="size-8"
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
                  className="size-8"
                  aria-label={labels.duplicate}
                  onClick={() => {
                    duplicate(index);
                  }}
                >
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
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
            {
              id: crypto.randomUUID(),
              description: "",
              qty: "1",
              unitPrice: "0.00",
              unit: "",
              note: "",
            },
          ]);
        }}
      >
        <Plus className="mr-1 size-4" aria-hidden="true" />
        {labels.addItem}
      </Button>
    </section>
  );
}
