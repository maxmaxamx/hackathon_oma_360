import { ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/format";

export function EscrowCard({
  total,
  funded,
  released,
  status,
}: {
  total: number;
  funded: number;
  released: number;
  status: string;
}) {
  const held = Math.max(0, funded - released);
  return (
    <div className="card border-royal/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={17} className="text-success" /> Безопасный Escrow
        </div>
        <span className="badge bg-success-soft text-success">
          {status === "RELEASED"
            ? "Выплачено"
            : status === "FUNDED"
              ? "Застраховано OMA"
              : "Ожидает оплаты"}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Деньги хранятся в банке-партнёре и переводятся мастеру только после
        подписания акта приёмки этапа технадзором OMA.
      </p>

      <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-muted">Общая сумма договора</dt>
          <dd className="font-semibold">{formatMoney(total)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Оплачено и подтверждено</dt>
          <dd className="font-semibold text-success">{formatMoney(funded)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Удерживается на счёте</dt>
          <dd className="text-base font-extrabold text-royal">
            {formatMoney(held)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-royal"
          style={{ width: `${funded ? Math.round((released / funded) * 100) : 0}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted">
        <span>Выплачено мастеру</span>
        <span>{funded ? Math.round((released / funded) * 100) : 0}%</span>
      </div>
    </div>
  );
}
