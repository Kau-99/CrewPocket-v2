"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

import { useInvoices } from "../hooks/use-invoices";
import { computeInvoiceTotals } from "../utils";
import { InvoiceStatusBadge } from "./invoice-status-badge";

export function InvoicesList() {
  const dict = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInvoices();

  const all = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const visible = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return all.filter(
      (invoice) =>
        term === "" ||
        invoice.number.toLowerCase().includes(term) ||
        invoice.clientName.toLowerCase().includes(term),
    );
  }, [all, debouncedSearch]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{dict.invoices.title}</h1>

      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
        }}
        placeholder={dict.invoices.search}
        className="max-w-xs"
        aria-label={dict.invoices.search}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <Receipt className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{dict.invoices.empty}</p>
          <p className="text-sm text-muted-foreground">{dict.invoices.emptyCta}</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{dict.common.noResults}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visible.map((invoice) => (
            <li key={invoice.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                  {invoice.number}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {[invoice.clientName, invoice.dueDate.toDate().toLocaleDateString()]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="text-sm tabular-nums">
                {formatCents(computeInvoiceTotals(invoice).totalCents)}
              </span>
              <InvoiceStatusBadge status={invoice.status} />
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? dict.common.loading : dict.common.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}
