"use client";

import { useCallback, useState } from "react";
import { MOVEMENT_TITLES, MovementDialog } from "@/components/inventory/movement-dialog";
import { buttonSecondary } from "@/components/ui/styles";
import type { InventoryFilterOptions } from "@/lib/inventory/list";
import type { MovementKind } from "@/validations/movement";

const KINDS: Record<"ATK" | "BMN", MovementKind[]> = {
  ATK: ["IN", "OUT", "ADJUSTMENT"],
  BMN: ["TRANSFER"],
};

/** Movement buttons for one item. Only rendered for users allowed to change this item type. */
export function ItemActions({
  itemId,
  itemName,
  type,
  quantityLabel,
  unit,
  options,
}: {
  itemId: string;
  itemName: string;
  type: "ATK" | "BMN";
  quantityLabel: string;
  unit: string | null;
  options: Pick<InventoryFilterOptions, "locations" | "pics">;
}) {
  const [kind, setKind] = useState<MovementKind | null>(null);
  const close = useCallback(() => setKind(null), []);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {KINDS[type].map((k) => (
          <button key={k} type="button" className={buttonSecondary} onClick={() => setKind(k)}>
            {MOVEMENT_TITLES[k]}
          </button>
        ))}
      </div>
      {kind && (
        <MovementDialog
          kind={kind}
          itemIds={[itemId]}
          itemLabel={itemName}
          currentQuantity={quantityLabel}
          unit={unit}
          options={options}
          onClose={close}
        />
      )}
    </>
  );
}
