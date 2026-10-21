import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { items, locations } from "@/lib/mock/data";
import { canReadInventory } from "@/lib/permissions";

export interface LocationLeaf {
  id: string;
  name: string;
  room: string | null;
  description: string | null;
  bmn: number;
  atk: number;
}

export interface FloorNode {
  key: string;
  label: string;
  locations: LocationLeaf[];
  total: number;
}

export interface BuildingNode {
  key: string;
  label: string;
  floors: FloorNode[];
  total: number;
}

const NO_BUILDING = "Tanpa gedung";
const NO_FLOOR = "Tanpa lantai";

/**
 * Locations grouped Gedung › Lantai, with the number of items in each.
 * The hierarchy comes from the building/floor/room columns; there is no parent id.
 */
export async function getLocationTree(actor: AuthContext) {
  if (!canReadInventory(actor.role)) throw new AuthorizationError();

  const sorted = [...locations].sort(
    (a, b) => (a.building ?? "￿").localeCompare(b.building ?? "￿") || (a.floor ?? "￿").localeCompare(b.floor ?? "￿") || a.name.localeCompare(b.name, "id"),
  );
  const countFor = (locationId: string, type: "BMN" | "ATK") => items.filter((i) => i.locationId === locationId && i.type === type).length;

  const buildings = new Map<string, BuildingNode>();
  for (const location of sorted) {
    const buildingLabel = location.building?.trim() || NO_BUILDING;
    const rawFloor = location.floor?.trim();
    const floorLabel = rawFloor ? (/^\d+$/.test(rawFloor) ? `Lantai ${rawFloor}` : rawFloor) : NO_FLOOR;
    let building = buildings.get(buildingLabel);
    if (!building) {
      building = { key: buildingLabel, label: buildingLabel, floors: [], total: 0 };
      buildings.set(buildingLabel, building);
    }
    let floor = building.floors.find((f) => f.label === floorLabel);
    if (!floor) {
      floor = { key: `${buildingLabel}/${floorLabel}`, label: floorLabel, locations: [], total: 0 };
      building.floors.push(floor);
    }
    const leaf: LocationLeaf = {
      id: location.id,
      name: location.name,
      room: location.room,
      description: location.description,
      bmn: countFor(location.id, "BMN"),
      atk: countFor(location.id, "ATK"),
    };
    floor.locations.push(leaf);
    floor.total += leaf.bmn + leaf.atk;
    building.total += leaf.bmn + leaf.atk;
  }

  return { buildings: [...buildings.values()], unplaced: items.filter((i) => i.locationId === null).length };
}

export type LocationTree = Awaited<ReturnType<typeof getLocationTree>>;
