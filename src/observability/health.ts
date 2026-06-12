export interface OperationalStats {
  pendingNotifications: number;
  deadLetterNotifications: number;
  failedCycles24h: number;
  successfulCycles24h: number;
  recentArticles: number;
  recentPrimarySources: number;
}

export interface HealthResult {
  status: "healthy" | "degraded" | "critical";
  reasons: string[];
}

export function evaluateHealth(stats: OperationalStats): HealthResult {
  const reasons: string[] = [];
  let status: HealthResult["status"] = "healthy";

  if (stats.deadLetterNotifications > 0) {
    status = "critical";
    reasons.push("notifications in dead-letter");
  }
  if (stats.successfulCycles24h === 0) {
    status = "critical";
    reasons.push("no successful cycle in 24h");
  }
  if (stats.failedCycles24h > 0) {
    if (status === "healthy") status = "degraded";
    reasons.push("failed cycles in 24h");
  }
  if (stats.pendingNotifications > 5) {
    if (status === "healthy") status = "degraded";
    reasons.push("notification backlog above limit");
  }
  if (stats.recentArticles === 0) {
    if (status === "healthy") status = "degraded";
    reasons.push("no articles collected in 48h");
  }
  if (stats.recentPrimarySources === 0) {
    if (status === "healthy") status = "degraded";
    reasons.push("no recent primary sources");
  }

  return { status, reasons };
}
