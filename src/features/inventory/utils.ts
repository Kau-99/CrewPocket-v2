import type { InventoryItem } from "./schemas";

/** SPEC §4.5/§5: quantity ≤ minStock → alerta de estoque baixo. */
export function isLowStock(item: Pick<InventoryItem, "quantity" | "minStock">): boolean {
  return item.quantity <= item.minStock;
}
