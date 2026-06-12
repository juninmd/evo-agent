import { describe, expect, it, vi } from "vitest";
import {
  type PendingNotification,
  nextRetryAt,
  processNotificationOutbox,
} from "../notifier/outbox.js";

function item(attempts = 0): PendingNotification {
  return {
    url: "https://example.com/article",
    title: "Artigo",
    summary: "Resumo",
    kind: "article",
    notification_attempts: attempts,
  };
}

describe("notification outbox", () => {
  it("marks a successfully delivered notification", async () => {
    const store = {
      getPendingNotifications: vi.fn().mockReturnValue([item()]),
      markNotificationDelivered: vi.fn(),
      markNotificationFailed: vi.fn(),
    };
    const sender = vi.fn().mockResolvedValue(true);

    const result = await processNotificationOutbox(store, sender);

    expect(result).toEqual({ delivered: 1, retried: 0, deadLetter: 0 });
    expect(store.markNotificationDelivered).toHaveBeenCalledWith(
      "https://example.com/article",
    );
    expect(store.markNotificationFailed).not.toHaveBeenCalled();
  });

  it("schedules exponential retry when delivery fails", async () => {
    const store = {
      getPendingNotifications: vi.fn().mockReturnValue([item(1)]),
      markNotificationDelivered: vi.fn(),
      markNotificationFailed: vi.fn(),
    };
    const now = new Date("2026-06-12T12:00:00Z");

    const result = await processNotificationOutbox(
      store,
      vi.fn().mockResolvedValue(false),
      { now, maxAttempts: 5 },
    );

    expect(result.retried).toBe(1);
    expect(store.markNotificationFailed).toHaveBeenCalledWith(
      "https://example.com/article",
      "delivery returned false",
      nextRetryAt(now, 2),
      false,
    );
  });

  it("moves exhausted notifications to dead-letter", async () => {
    const store = {
      getPendingNotifications: vi.fn().mockReturnValue([item(4)]),
      markNotificationDelivered: vi.fn(),
      markNotificationFailed: vi.fn(),
    };

    const result = await processNotificationOutbox(
      store,
      vi.fn().mockRejectedValue(new Error("Telegram timeout")),
      { maxAttempts: 5 },
    );

    expect(result.deadLetter).toBe(1);
    expect(store.markNotificationFailed).toHaveBeenCalledWith(
      "https://example.com/article",
      "Telegram timeout",
      expect.any(String),
      true,
    );
  });

  it("caps retry delay at six hours", () => {
    const now = new Date("2026-06-12T12:00:00Z");
    expect(nextRetryAt(now, 20)).toBe("2026-06-12T18:00:00.000Z");
  });
});
