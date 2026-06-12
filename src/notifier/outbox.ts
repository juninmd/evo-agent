export interface PendingNotification {
  url: string;
  title: string;
  summary: string;
  kind: "article" | "report";
  notification_attempts: number;
}

export interface NotificationOutboxStore {
  getPendingNotifications(now?: string, limit?: number): PendingNotification[];
  markNotificationDelivered(url: string): void;
  markNotificationFailed(
    url: string,
    error: string,
    nextAttemptAt: string,
    deadLetter: boolean,
  ): void;
}

export type NotificationSender = (
  notification: PendingNotification,
) => Promise<boolean>;

export function nextRetryAt(now: Date, attempt: number): string {
  const delayMs = Math.min(
    6 * 60 * 60 * 1000,
    5 * 60 * 1000 * 2 ** Math.max(0, attempt - 1),
  );
  return new Date(now.getTime() + delayMs).toISOString();
}

export async function processNotification(
  store: NotificationOutboxStore,
  sender: NotificationSender,
  notification: PendingNotification,
  options: { now?: Date; maxAttempts?: number } = {},
): Promise<"delivered" | "retry" | "dead_letter"> {
  const now = options.now ?? new Date();
  const maxAttempts = options.maxAttempts ?? 5;
  let delivered = false;
  let error = "delivery returned false";
  try {
    delivered = await sender(notification);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }

  if (delivered) {
    store.markNotificationDelivered(notification.url);
    return "delivered";
  }

  const attempt = notification.notification_attempts + 1;
  const deadLetter = attempt >= maxAttempts;
  store.markNotificationFailed(
    notification.url,
    error,
    nextRetryAt(now, attempt),
    deadLetter,
  );
  return deadLetter ? "dead_letter" : "retry";
}

export async function processNotificationOutbox(
  store: NotificationOutboxStore,
  sender: NotificationSender,
  options: { now?: Date; maxAttempts?: number; limit?: number } = {},
): Promise<{ delivered: number; retried: number; deadLetter: number }> {
  const now = options.now ?? new Date();
  const pending = store.getPendingNotifications(
    now.toISOString(),
    options.limit ?? 20,
  );
  const result = { delivered: 0, retried: 0, deadLetter: 0 };

  for (const notification of pending) {
    const status = await processNotification(store, sender, notification, {
      now,
      maxAttempts: options.maxAttempts,
    });
    if (status === "delivered") result.delivered++;
    else if (status === "dead_letter") result.deadLetter++;
    else result.retried++;
  }

  return result;
}
