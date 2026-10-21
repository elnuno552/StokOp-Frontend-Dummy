import { panel } from "@/components/ui/styles";
import type { DashboardTransaction } from "@/lib/dashboard/service";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS } from "@/lib/inventory/labels";

// ATK rows show the stock movement; BMN rows show where the asset went.
function Movement({ tx }: { tx: DashboardTransaction }) {
  if (tx.item.type === "ATK") {
    return (
      <span className="whitespace-nowrap tabular-nums">
        {formatQuantity(tx.quantityBefore)} → <span className="font-semibold">{formatQuantity(tx.quantityAfter)}</span>{" "}
        <span className="text-muted">{tx.item.unit}</span>
      </span>
    );
  }

  const parts = [
    route(tx.fromLocation, tx.toLocation),
    tx.type === "BORROW" && tx.toPic ? `Peminjam ${tx.toPic}` : route(tx.fromPic, tx.toPic, "PIC "),
  ].filter(Boolean);
  return parts.length ? <span>{parts.join(" · ")}</span> : <span className="text-muted">—</span>;
}

function route(from: string | null, to: string | null, prefix = ""): string | null {
  if (from && to) return `${prefix}${from} → ${to}`;
  if (to) return `${prefix}ke ${to}`;
  if (from) return `${prefix}dari ${from}`;
  return null;
}

export function RecentTransactions({ transactions }: { transactions: DashboardTransaction[] }) {
  return (
    <section aria-labelledby="transaksi-terbaru" className={`${panel} overflow-hidden`}>
      <h2 id="transaksi-terbaru" className="border-b border-border px-5 py-4 text-base font-semibold text-fg">
        Transaksi terbaru
      </h2>

      {transactions.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">Belum ada transaksi inventaris.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{transactions.length} transaksi inventaris terakhir</caption>
          <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Barang</th>
              <th scope="col" className="hidden px-4 py-2.5 font-semibold sm:table-cell">Jenis</th>
              <th scope="col" className="hidden px-4 py-2.5 font-semibold md:table-cell">Perubahan</th>
              <th scope="col" className="hidden px-4 py-2.5 font-semibold lg:table-cell">Oleh</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-fg">{tx.item.name}</p>
                  <p className="font-mono text-xs text-muted">{tx.item.code}</p>
                  <p className="mt-0.5 text-xs text-muted sm:hidden">{TRANSACTION_TYPE_LABELS[tx.type]}</p>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 text-fg sm:table-cell">
                  {TRANSACTION_TYPE_LABELS[tx.type]}
                </td>
                <td className="hidden px-4 py-2.5 text-fg md:table-cell">
                  <Movement tx={tx} />
                </td>
                <td className="hidden px-4 py-2.5 text-muted lg:table-cell">{tx.performedBy}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted">
                  {formatDateTime(tx.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
