import { useMemo } from "react";
import {
  type CalendarCell,
  calendarWeeks,
  summarizeCalendar,
} from "../../lib/calendar";
import { formatCount } from "../../lib/format";
import { t } from "../../lib/i18n";
import type { Calendar } from "../../lib/types";
import { useChartCursor } from "./useChartCursor";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** `2026-10-17` -> `17/10`, sem passar por `Date` (e por fuso). */
function shortDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function describe(cell: CalendarCell, target: number): string {
  const base = t("calendar.day", {
    date: shortDay(cell.date),
    count: cell.published,
    target,
  });
  return cell.failedNotifications > 0
    ? `${base} · ${t("calendar.failed", { count: cell.failedNotifications })}`
    : base;
}

/**
 * Calendario de parede das ultimas semanas: cada dia pintado pela fracao da
 * meta diaria de edicoes. Um dia sem edicao e o sinal que a lista nao mostra.
 */
export default function PublicationCalendar({
  calendar,
}: {
  calendar: Calendar;
}) {
  const weeks = useMemo(() => calendarWeeks(calendar), [calendar]);
  const summary = useMemo(() => summarizeCalendar(calendar), [calendar]);
  const cells = useMemo(
    () => weeks.flat().filter((cell): cell is CalendarCell => cell !== null),
    [weeks],
  );
  const cursor = useChartCursor(cells.length, 7);
  const active = cursor.active !== null ? cells[cursor.active] : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted">
        {t("calendar.summary", {
          complete: formatCount(summary.complete),
          days: formatCount(summary.days),
          target: calendar.target,
        })}
        {summary.empty > 0 && (
          <>
            {" · "}
            <span className="text-warn">
              {t("calendar.empty", { count: summary.empty })}
            </span>
          </>
        )}
      </p>
      <div
        role="application"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a grade e o Tab stop; as setas percorrem os dias.
        tabIndex={0}
        aria-label={t("chart.keyboardHint", { name: t("calendar.title") })}
        onKeyDown={cursor.onKeyDown}
        onBlur={cursor.clear}
        className="grid w-full max-w-[17rem] grid-cols-7 gap-1 rounded-lg"
      >
        {WEEKDAYS.map((weekday, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: os dias da semana sao fixos e ha letras repetidas.
            key={index}
            aria-hidden="true"
            className="text-center text-[10px] font-medium text-faint"
          >
            {weekday}
          </span>
        ))}
        {weeks.flat().map((cell, index) =>
          cell === null ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: celulas vazias nao tem identidade alem da posicao.
            <span key={`vazio-${index}`} aria-hidden="true" />
          ) : (
            <span
              key={cell.date}
              role="img"
              aria-label={describe(cell, calendar.target)}
              title={describe(cell, calendar.target)}
              data-level={cell.level}
              data-future={cell.future}
              data-today={cell.today}
              data-active={active?.date === cell.date}
              className="evo-cal"
              onPointerEnter={() => cursor.hover(cells.indexOf(cell))}
              onPointerLeave={() => cursor.hover(null)}
            >
              {Number(cell.date.slice(8))}
              {cell.failedNotifications > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-danger ring-1 ring-panel"
                />
              )}
            </span>
          ),
        )}
      </div>

      <div className="flex min-h-4 max-w-[17rem] items-center justify-between gap-2 text-[11px]">
        <span className="text-fg" aria-live="polite">
          {active ? describe(active, calendar.target) : ""}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-faint">
          {t("calendar.less")}
          {[0, 1, 2, 3].map((level) => (
            <span
              key={level}
              aria-hidden="true"
              data-level={level}
              className="evo-cal size-2.5 rounded-sm"
            />
          ))}
          {t("calendar.more")}
        </span>
      </div>
    </div>
  );
}
