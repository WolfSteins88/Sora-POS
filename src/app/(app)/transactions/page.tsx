import Link from "next/link";
import { cancelTransactionAction } from "@/app/actions/ops";
import { Card, PageHeader, inputClass } from "@/components/ui";
import { money, num } from "@/lib/format";
import { listTransactions } from "@/server/queries";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const rows = await listTransactions({
    search: params.q,
    dateFrom: params.from,
    dateTo: params.to,
  });
  return (
    <div>
      <PageHeader title="Transaksi" description="Batalkan mengembalikan stok barang atau bahan sesuai jenis." />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={params.q} placeholder="Nomor" className={`${inputClass} max-w-xs`} />
        <input name="from" type="date" defaultValue={params.from} className={inputClass} />
        <input name="to" type="date" defaultValue={params.to} className={inputClass} />
        <button className="btn rounded-lg border border-line px-4 text-sm">Filter</button>
      </form>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2">Nomor</th>
                <th>Kasir</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-2">
                    <Link className="underline" href={`/transactions/${row.id}`}>
                      {row.transaction_number}
                    </Link>
                  </td>
                  <td>{row.cashier_name}</td>
                  <td>{money(num(row.total))}</td>
                  <td>{row.status}</td>
                  <td className="text-right">
                    {row.status === "completed" ? (
                      <form action={cancelTransactionAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <button className="text-danger">Batalkan</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
