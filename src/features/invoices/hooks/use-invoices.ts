"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";

import {
  createInvoiceFromJob,
  deleteInvoice,
  fetchInvoicesPage,
  markInvoicePaid,
  markInvoiceSent,
  restoreInvoice,
  subscribeToInvoice,
  updateInvoice,
  voidInvoice,
  type ConvertibleJob,
  type InvoicesPage,
  type PageCursor,
} from "../api";
import type { Invoice } from "../schemas";

const KEY = "invoices";

export function useInvoices() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useInfiniteQuery({
    queryKey: [KEY, uid],
    enabled: Boolean(uid),
    initialPageParam: null as PageCursor | null,
    queryFn: ({ pageParam }): Promise<InvoicesPage> => {
      if (!uid) return Promise.resolve({ items: [], cursor: null });
      return fetchInvoicesPage(uid, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}

export function useInvoice(id: string): { invoice: Invoice | null; loading: boolean } {
  const [state, setState] = useState<{ invoice: Invoice | null; loading: boolean }>({
    invoice: null,
    loading: true,
  });

  useEffect(() => {
    setState({ invoice: null, loading: true });
    return subscribeToInvoice(id, (invoice) => {
      setState({ invoice, loading: false });
    });
  }, [id]);

  return state;
}

export function useInvoiceMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [KEY] });
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  const createFromJob = useMutation({
    mutationFn: ({
      job,
      taxPctDefault,
      invoicePrefix,
    }: {
      job: ConvertibleJob;
      taxPctDefault: number;
      invoicePrefix: string;
    }) => {
      if (!user) throw new Error("not authenticated");
      return createInvoiceFromJob(user.uid, job, taxPctDefault, invoicePrefix);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      current,
      values,
    }: {
      current: Invoice;
      values: Parameters<typeof updateInvoice>[1];
    }) => updateInvoice(current, values),
    onSuccess: invalidate,
  });

  const send = useMutation({ mutationFn: markInvoiceSent, onSuccess: invalidate });
  const markPaid = useMutation({ mutationFn: markInvoicePaid, onSuccess: invalidate });
  const voidIt = useMutation({ mutationFn: voidInvoice, onSuccess: invalidate });

  const remove = useMutation({
    mutationFn: (invoice: Invoice) => deleteInvoice(invoice.id),
    onSuccess: invalidate,
  });

  const undoRemove = useMutation({
    mutationFn: (invoice: Invoice) => restoreInvoice(invoice),
    onSuccess: invalidate,
  });

  return { createFromJob, update, send, markPaid, voidIt, remove, undoRemove };
}
