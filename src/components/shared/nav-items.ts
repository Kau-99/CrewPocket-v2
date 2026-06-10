import {
  BarChart3,
  BookOpen,
  Briefcase,
  Calculator,
  CalendarDays,
  Car,
  CreditCard,
  FileText,
  HardHat,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { Dictionary } from "@/i18n";

export interface NavItem {
  key: keyof Dictionary["nav"];
  href: string;
  icon: LucideIcon;
}

/** Ordem da sidebar desktop. */
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "jobs", href: "/jobs", icon: Briefcase },
  { key: "clients", href: "/clients", icon: Users },
  { key: "estimates", href: "/estimates", icon: FileText },
  { key: "invoices", href: "/invoices", icon: Receipt },
  { key: "calendar", href: "/calendar", icon: CalendarDays },
  { key: "field", href: "/field", icon: HardHat },
  { key: "crew", href: "/crew", icon: UsersRound },
  { key: "inventory", href: "/inventory", icon: Package },
  { key: "pricebook", href: "/pricebook", icon: BookOpen },
  { key: "mileage", href: "/mileage", icon: Car },
  { key: "analytics", href: "/analytics", icon: BarChart3 },
  { key: "atticEstimator", href: "/tools/attic-estimator", icon: Calculator },
  { key: "settings", href: "/settings", icon: Settings },
  { key: "billing", href: "/billing", icon: CreditCard },
];

/** Bottom tab bar mobile (SPEC §8): Dashboard, Jobs, Field, More. */
export const TAB_ITEMS: NavItem[] = NAV_ITEMS.filter((item) =>
  ["dashboard", "jobs", "field"].includes(item.key),
);

export const MORE_ITEMS: NavItem[] = NAV_ITEMS.filter(
  (item) => !["dashboard", "jobs", "field"].includes(item.key),
);

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
