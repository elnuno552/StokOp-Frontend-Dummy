import { EmptyState } from "@/components/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { panel } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { getLocationTree } from "@/lib/locations/tree";

export const metadata: Metadata = { title: "Lokasi" };

export default async function LocationsPage() {
  const user = await requirePageAuth();
  const { buildings, unplaced } = await getLocationTree(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lokasi"
        description="Gedung, lantai, dan ruang beserta jumlah barang aktif di dalamnya. Pilih lokasi untuk melihat barangnya."
      />

      {buildings.length === 0 ? (
        <EmptyState title="Belum ada lokasi" description="Lokasi ditambahkan di Data master › Lokasi, lalu barang dapat ditempatkan di sana." />
      ) : (
        <div className="flex flex-col gap-4">
          {buildings.map((building) => (
            <section key={building.key} className={panel} aria-labelledby={`b-${building.key}`}>
              <h2 id={`b-${building.key}`} className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3 text-base font-semibold text-fg">
                {building.label}
                <span className="text-sm font-normal tabular-nums text-muted">{building.total} barang</span>
              </h2>
              <div className="divide-y divide-border">
                {building.floors.map((floor) => (
                  <div key={floor.key} className="px-5 py-3">
                    <h3 className="flex items-baseline justify-between gap-4 text-sm font-semibold text-muted">
                      {floor.label}
                      <span className="font-normal tabular-nums">{floor.total} barang</span>
                    </h3>
                    <ul className="mt-2 flex flex-col">
                      {floor.locations.map((location) => (
                        <li key={location.id}>
                          <Link
                            href={`/inventory?location=${location.id}`}
                            className="flex min-h-11 items-center justify-between gap-4 rounded-md px-2 hover:bg-surface-sunken"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-fg">{location.name}</span>
                              {(location.room || location.description) && (
                                <span className="block truncate text-xs text-muted">
                                  {[location.room && `Ruang ${location.room}`, location.description].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-muted">
                              {location.bmn} BMN · {location.atk} ATK
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {unplaced > 0 && (
        <p className="text-sm text-muted">
          <span className="tabular-nums font-semibold text-fg">{unplaced}</span> barang aktif belum memiliki lokasi.
        </p>
      )}
    </div>
  );
}
