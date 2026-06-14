"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentList } from "@/features/equipment/components/equipment-list";
import { InventoryList } from "@/features/inventory/components/inventory-list";
import { useTranslation } from "@/hooks/use-translation";

/** Área de estoque: materiais (consumíveis) e equipamentos (máquinas/ativos). */
export default function InventoryPage() {
  const dict = useTranslation();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{dict.inventory.stockTitle}</h1>
      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">{dict.inventory.materialsTab}</TabsTrigger>
          <TabsTrigger value="equipment">{dict.inventory.equipmentTab}</TabsTrigger>
        </TabsList>
        <TabsContent value="materials" className="mt-4">
          <InventoryList />
        </TabsContent>
        <TabsContent value="equipment" className="mt-4">
          <EquipmentList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
