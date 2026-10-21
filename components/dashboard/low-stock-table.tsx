import Link from "next/link";
import { panel } from "@/components/ui/styles";
import type { DashboardSummary } from "@/lib/dashboard/service";
import { formatQuantity } from "@/lib/format";

export function LowStockTable({ lowStock }: { lowStock: DashboardSummary["atk"]["lowStock"] }) {
  const remaining = lowStock.total - lowStock.rows.length;

  return (
    <section aria-labelledby="stok-rendah" className={`${panel} overflow-hidden`}>
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-4">
        <h2 id="stok-rendah" className="text-base font-semibold text-fg">
          Stok ATK perlu diisi ulang
        </h2>
        {lowStock.total > 0 && <span className="text-sm tabular-nums text-muted">{lowStock.total} barang</span>}
      </div>

      {lowStock.rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">Semua stok ATK di atas batas minimum.</p>
      ) : (
        <>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Barang ATK dengan stok di bawah atau sama dengan batas minimum</caption>
            <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">Barang</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Stok</th>
                <th scope="col" className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Minimum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lowStock.rows.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5">
                    <Link href={`/inventory/${item.id}`} className="font-medium text-fg hover:underline">
                      {item.name}
                    </Link>
                    <p className="font-mono text-xs text-muted">{item.code}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                    {item.quantity === 0 ? (
                      <span className="font-semibold text-danger">Habis</span>
                    ) : (
                      <span className="font-semibold text-fg">
                        {formatQuantity(item.quantity)} <span className="font-normal text-muted">{item.unit}</span>
                      </span>
                    )}
                    <p className="text-xs text-muted sm:hidden">
                      {item.minimumStock === null ? "Tanpa minimum" : `min. ${formatQuantity(item.minimumStock)}`}
                    </p>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted sm:table-cell">
                    {item.minimumStock === null ? "—" : formatQuantity(item.minimumStock)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {remaining > 0 && (
            <p className="border-t border-border px-5 py-3 text-sm tabular-nums text-muted">
              dan {remaining} barang lainnya
            </p>
          )}
        </>
      )}
    </section>
  );
}
