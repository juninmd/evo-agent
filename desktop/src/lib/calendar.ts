import type { Calendar, CalendarDay } from "./types";

export type CalendarLevel = 0 | 1 | 2 | 3;

export type CalendarCell = CalendarDay & {
  /** 0 = nada publicado ... 3 = meta do dia batida. */
  level: CalendarLevel;
  future: boolean;
  today: boolean;
  /** 0 = domingo. */
  weekday: number;
};

/** O dia da semana de uma data `YYYY-MM-DD`, sem passar por fuso nenhum. */
export function weekdayOf(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).getUTCDay();
}

export function levelFor(published: number, target: number): CalendarLevel {
  if (published <= 0) return 0;
  if (target <= 0 || published >= target) return 3;
  return published / target > 0.5 ? 2 : 1;
}

/**
 * Semanas (colunas) de domingo a sabado. A primeira semana comeca com `null`
 * ate o dia da semana do primeiro item, como num calendario de parede.
 */
export function calendarWeeks(calendar: Calendar): (CalendarCell | null)[][] {
  const cells: (CalendarCell | null)[] = [];
  const first = calendar.days[0];
  if (!first) return [];
  for (let pad = 0; pad < weekdayOf(first.date); pad++) cells.push(null);
  for (const day of calendar.days) {
    cells.push({
      ...day,
      level: levelFor(day.published, calendar.target),
      future: day.date > calendar.today,
      today: day.date === calendar.today,
      weekday: weekdayOf(day.date),
    });
  }
  const weeks: (CalendarCell | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    const week = cells.slice(index, index + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export type CalendarSummary = {
  days: number;
  /** Dias com a meta batida. */
  complete: number;
  /** Dias sem nenhuma edicao (hoje nao conta: ainda esta em andamento). */
  empty: number;
  published: number;
  failedNotifications: number;
};

export function summarizeCalendar(calendar: Calendar): CalendarSummary {
  const past = calendar.days.filter((day) => day.date <= calendar.today);
  return {
    days: past.length,
    complete: past.filter((day) => day.published >= calendar.target).length,
    empty: past.filter(
      (day) => day.published === 0 && day.date !== calendar.today,
    ).length,
    published: past.reduce((total, day) => total + day.published, 0),
    failedNotifications: past.reduce(
      (total, day) => total + day.failedNotifications,
      0,
    ),
  };
}
