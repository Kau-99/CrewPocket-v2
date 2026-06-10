"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientFormDialog } from "@/features/clients/components/client-form-dialog";
import { useClient } from "@/features/clients/hooks/use-clients";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { useJobsByClient } from "@/features/jobs/hooks/use-jobs";
import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

// Página = camada de composição: cliente + jobs do cliente (SPEC §3.2.1)
export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const dict = useTranslation();
  const { data: client, isLoading } = useClient(params.id);
  const { data: jobs } = useJobsByClient(params.id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!client) {
    return <p className="p-6 text-center text-muted-foreground">{dict.clients.notFound}</p>;
  }

  const fields = dict.clients.fields;
  const lifetimeValueCents = (jobs ?? []).reduce((sum, job) => sum + job.valueCents, 0);
  const info: [string, string][] = [
    [fields.email, client.email],
    [fields.phone, client.phone],
    [
      fields.address,
      [client.address, client.city, client.state, client.zip].filter(Boolean).join(", "),
    ],
    [fields.notes, client.notes],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        {client.isArchived && <Badge variant="secondary">{dict.clients.archivedBadge}</Badge>}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => {
            setEditOpen(true);
          }}
        >
          <Pencil className="mr-1 size-4" aria-hidden="true" />
          {dict.common.edit}
        </Button>
      </div>

      <section className="rounded-lg border p-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {info
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          <div>
            <dt className="text-xs text-muted-foreground">{dict.clients.lifetimeValue}</dt>
            <dd className="text-sm font-medium tabular-nums">{formatCents(lifetimeValueCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{dict.clients.clientJobs}</h2>
        {!jobs || jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.clients.noJobs}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                    {job.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {job.date.toDate().toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm tabular-nums">{formatCents(job.valueCents)}</span>
                <JobStatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
    </div>
  );
}
