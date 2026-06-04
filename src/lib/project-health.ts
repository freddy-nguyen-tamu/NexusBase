import type { ProjectRisk, RiskSeverity, RiskStatus, TaskStatus } from "@prisma/client";

type HealthTask = {
  status: TaskStatus;
  dueDate: Date | null;
  completedAt: Date | null;
};

type HealthRisk = Pick<ProjectRisk, "severity" | "status" | "dueDate">;

function isPastDue(date: Date | null | undefined) {
  if (!date) return false;
  return date.getTime() < Date.now();
}

function severityPenalty(severity: RiskSeverity) {
  switch (severity) {
    case "LOW":
      return 3;
    case "MEDIUM":
      return 7;
    case "HIGH":
      return 14;
    case "CRITICAL":
      return 24;
  }
}

function isActiveRisk(status: RiskStatus) {
  return status === "OPEN" || status === "WATCHING";
}

export function calculateProjectHealthScore(input: {
  tasks: HealthTask[];
  risks: HealthRisk[];
}) {
  const totalTasks = input.tasks.length;
  const completedTasks = input.tasks.filter((task) => task.status === "DONE").length;
  const overdueTasks = input.tasks.filter(
    (task) => task.status !== "DONE" && isPastDue(task.dueDate),
  ).length;

  const activeRisks = input.risks.filter((risk) => isActiveRisk(risk.status));
  const overdueRisks = activeRisks.filter((risk) => isPastDue(risk.dueDate));

  let score = 100;

  if (totalTasks > 0) {
    const completionRate = completedTasks / totalTasks;
    score -= Math.round((1 - completionRate) * 18);
  }

  score -= overdueTasks * 5;
  score -= overdueRisks.length * 8;

  for (const risk of activeRisks) {
    score -= severityPenalty(risk.severity);
  }

  const boundedScore = Math.max(0, Math.min(100, score));

  let label: "Healthy" | "Watch" | "At risk" | "Critical";

  if (boundedScore >= 80) {
    label = "Healthy";
  } else if (boundedScore >= 60) {
    label = "Watch";
  } else if (boundedScore >= 35) {
    label = "At risk";
  } else {
    label = "Critical";
  }

  return {
    score: boundedScore,
    label,
    totalTasks,
    completedTasks,
    overdueTasks,
    activeRisks: activeRisks.length,
    overdueRisks: overdueRisks.length,
  };
}

export function getHealthBadgeClass(label: string) {
  switch (label) {
    case "Healthy":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "Watch":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "At risk":
      return "bg-orange-50 text-orange-700 ring-orange-100";
    case "Critical":
      return "bg-red-50 text-red-700 ring-red-100";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-100";
  }
}

export function getRiskSeverityClass(severity: RiskSeverity | string) {
  switch (severity) {
    case "LOW":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "MEDIUM":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "HIGH":
      return "bg-orange-50 text-orange-700 ring-orange-100";
    case "CRITICAL":
      return "bg-red-50 text-red-700 ring-red-100";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-100";
  }
}

export function getRiskStatusClass(status: RiskStatus | string) {
  switch (status) {
    case "OPEN":
      return "bg-red-50 text-red-700 ring-red-100";
    case "WATCHING":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "MITIGATED":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "CLOSED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-100";
  }
}
