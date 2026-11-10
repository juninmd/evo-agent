import { describe, expect, it } from "vitest";
import {
  calendarWeeks,
  levelFor,
  summarizeCalendar,
  weekdayOf,
} from "./calendar";
import type { Calendar } from "./types";

const calendar: Calendar = {
  target: 3,
  today: "2026-10-17",
  days: [
    { date: "2026-10-13", published: 3, failedNotifications: 0 },
    { date: "2026-10-14", published: 0, failedNotifications: 0 },
    { date: "2026-10-15", published: 1, failedNotifications: 1 },
    { date: "2026-10-16", published: 2, failedNotifications: 0 },
    { date: "2026-10-17", published: 0, failedNotifications: 0 },
  ],
};

describe("weekdayOf", () => {
  // O fuso do teste e America/Sao_Paulo: `new Date("2026-10-17")` cairia na
  // sexta, e o calendario inteiro andaria uma coluna.
  it("reads the weekday without a timezone shift", () => {
    expect(weekdayOf("2026-10-17")).toBe(6);
    expect(weekdayOf("2026-10-11")).toBe(0);
  });
});

describe("levelFor", () => {
  it("grades a day against the daily target", () => {
    expect(levelFor(0, 3)).toBe(0);
    expect(levelFor(1, 3)).toBe(1);
    expect(levelFor(2, 3)).toBe(2);
    expect(levelFor(3, 3)).toBe(3);
    expect(levelFor(5, 3)).toBe(3);
    expect(levelFor(1, 0)).toBe(3);
  });
});

describe("calendarWeeks", () => {
  it("lays the days out in Sunday-first columns", () => {
    const weeks = calendarWeeks(calendar);
    expect(weeks).toHaveLength(1);
    // 13/10/2026 e uma terca: domingo e segunda ficam vazios.
    expect(weeks[0].map((cell) => cell?.date ?? null)).toEqual([
      null,
      null,
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
    ]);
    expect(weeks[0][6]).toMatchObject({ today: true, future: false, level: 0 });
    expect(weeks[0][2]).toMatchObject({ level: 3, weekday: 2 });
    expect(calendarWeeks({ ...calendar, days: [] })).toEqual([]);
  });
});

describe("summarizeCalendar", () => {
  it("does not count today as an empty day while it is still running", () => {
    expect(summarizeCalendar(calendar)).toEqual({
      days: 5,
      complete: 1,
      empty: 1,
      published: 6,
      failedNotifications: 1,
    });
  });
});
