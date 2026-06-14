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
import type { Trade } from "@/features/settings/schemas";

export interface NavItem {
  key: keyof Dictionary["nav"];
  href: string;
  icon: LucideIcon;
  /** Visível só nestes nichos (ausente = todos). */
  trades?: Trade[];
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
  // ferramenta específica de isolamento — escondida nos outros nichos
  {
    key: "atticEstimator",
    href: "/tools/attic-estimator",
    icon: Calculator,
    trades: ["insulation"],
  },
  { key: "settings", href: "/settings", icon: Settings },
  { key: "billing", href: "/billing", icon: CreditCard },
];

const CORE_TABS = ["dashboard", "jobs", "field"];

/** Itens visíveis para um nicho (filtra ferramentas específicas). */
export function navItemsFor(trade: Trade): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.trades || item.trades.includes(trade));
}

/** Bottom tab bar mobile (SPEC §8): Dashboard, Jobs, Field, More. */
export const TAB_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => CORE_TABS.includes(item.key));

export function moreItemsFor(trade: Trade): NavItem[] {
  return navItemsFor(trade).filter((item) => !CORE_TABS.includes(item.key));
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
