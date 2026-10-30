const STEPS = [
  { n: 1, label: "Параметры помещения" },
  { n: 2, label: "Вопросы" },
  { n: 3, label: "Выбор сметы" },
  { n: 4, label: "Финальное согласование" },
];

export function Stepper({
  active,
  projectLabel,
}: {
  active: number;
  projectLabel?: string;
}) {
  return (
    <div className="border-b border-line bg-white">
      <div className="container-page py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-royal">
            Этап {active} из 4
          </span>
          <span className="hidden h-4 w-px bg-line sm:block" />
          <span className="text-sm font-semibold">{STEPS[active - 1].label}</span>
          {projectLabel ? (
            <span className="ml-auto text-xs text-muted">{projectLabel}</span>
          ) : null}
        </div>
        <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="animate-progress h-full rounded-full bg-royal transition-all"
            style={{ width: `${(active / 4) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
