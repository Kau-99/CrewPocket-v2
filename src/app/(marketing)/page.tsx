import {
  BarChart3,
  Check,
  ClipboardList,
  Clock,
  FileText,
  Smartphone,
  Users,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: FileText,
    title: "Estimates to invoices",
    description:
      "Build estimates on site, convert won jobs in one tap and invoice the moment work is done.",
  },
  {
    icon: ClipboardList,
    title: "Job costing that's honest",
    description:
      "Track materials and labor per job and see the real margin — not the one you hoped for.",
  },
  {
    icon: Clock,
    title: "Time tracking with GPS",
    description: "Clock in from the truck. One running timer per crew member, location stamped.",
  },
  {
    icon: WifiOff,
    title: "Works without signal",
    description:
      "Basements, attics, job sites with no bars — everything keeps working and syncs later.",
  },
  {
    icon: Users,
    title: "Crew management",
    description: "Assign your crew to jobs, track their hours and run payroll-ready reports.",
  },
  {
    icon: BarChart3,
    title: "Know your numbers",
    description: "Revenue, P&L, tax summary and mileage deductions — ready when your CPA asks.",
  },
];

const PLANS = [
  {
    name: "Solo",
    highlight: false,
    description: "For owner-operators running their own jobs.",
    features: [
      "Jobs, clients, estimates & invoices",
      "Inventory, pricebook & mileage",
      "Time tracking for yourself",
      "Offline-first field mode",
    ],
  },
  {
    name: "Pro",
    highlight: true,
    description: "For contractors running a crew.",
    features: [
      "Everything in Solo",
      "Crew management & crew time tracking (up to 5)",
      "Advanced analytics (P&L, payroll)",
      "CSV export & backup",
    ],
  },
];

export default function MarketingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
            Crew<span className="text-primary">Pocket</span>
          </span>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="mx-auto w-full max-w-5xl px-4 py-16 text-center sm:py-24">
          <span className="mb-5 inline-block rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            Field service management for contractors
          </span>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Run your contracting business from your <span className="text-primary">pocket</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground sm:text-lg">
            Estimates, jobs, time tracking and invoices — built for contractors in the field, not
            for the office.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">Start your 14-day free trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" aria-hidden="true" />
              No credit card to sign up
            </span>
            <span className="flex items-center gap-1.5">
              <WifiOff className="size-3.5 text-primary" aria-hidden="true" />
              Works offline
            </span>
            <span className="flex items-center gap-1.5">
              <Smartphone className="size-3.5 text-primary" aria-hidden="true" />
              Installs on any phone
            </span>
          </div>
        </section>

        {/* features */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-5xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Everything the job needs. Nothing it doesn&apos;t.
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-lg border bg-background p-5">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* pricing */}
        <section className="mx-auto w-full max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Simple pricing, free to try
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            14-day free trial on every plan. Cancel anytime.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            {PLANS.map(({ name, highlight, description, features }) => (
              <Card key={name} className={cn(highlight && "border-primary")}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {name}
                    {highlight && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Most popular
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant={highlight ? "default" : "outline"}>
                    <Link href="/signup">Start free trial</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>
            Crew<span className="text-primary">Pocket</span> — field service management for small
            contractors.
          </span>
          <nav className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Sign up
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
