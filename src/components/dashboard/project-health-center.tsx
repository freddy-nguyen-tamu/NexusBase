"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  RefreshCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import {
  calculateProjectHealthScore,
  getHealthBadgeClass,
  getRiskSeverityClass,
  getRiskStatusClass,
} from "@/lib/project-health";

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  members: {
    role: string;
    user: { id: string; name: string | null; email: string | null; image: string | null };
  }[];
  tasks: {
    id: string;
    title: string;
    status: "TODO" | "IN_PROGRESS" | "DONE";
    dueDate: string | null;
    completedAt: string | null;
  }[];
};

type Risk = {
  id: string;
  projectId: string;
  ownerId: string | null;
  createdById: string;
  title: string;
  description: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "WATCHING" | "MITIGATED" | "CLOSED";
  impact: string | null;
  mitigation: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; slug: string };
  owner: { id: string; name: string | null; email: string | null; image: string | null } | null;
};

const severityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const statusOptions = ["OPEN", "WATCHING", "MITIGATED", "CLOSED"] as const;

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function isPastDue(value: string | null) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toIsoDate(value: string) {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

export function ProjectHealthCenter() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [mitigation, setMitigation] = useState("");
  const [severity, setSeverity] = useState<(typeof severityOptions)[number]>("MEDIUM");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("OPEN");
  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const healthByProject = useMemo(() => {
    return projects.map((project) => {
      const projectRisks = risks.filter((r) => r.projectId === project.id);
      const health = calculateProjectHealthScore({
        tasks: project.tasks.map((t) => ({
          status: t.status,
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
        })),
        risks: projectRisks.map((r) => ({
          severity: r.severity,
          status: r.status,
          dueDate: r.dueDate ? new Date(r.dueDate) : null,
        })),
      });
      return { project, health, risks: projectRisks };
    });
  }, [projects, risks]);

  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      if (selectedProjectId && r.projectId !== selectedProjectId) return false;
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [risks, selectedProjectId, severityFilter, statusFilter]);

  const totalActiveRisks = risks.filter((r) => r.status === "OPEN" || r.status === "WATCHING").length;
  const criticalRisks = risks.filter((r) => r.severity === "CRITICAL" && (r.status === "OPEN" || r.status === "WATCHING")).length;
  const overdueRisks = risks.filter((r) => (r.status === "OPEN" || r.status === "WATCHING") && isPastDue(r.dueDate)).length;

  async function loadProjects() {
    const response = await fetch("/api/projects", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load projects");
    const data = (await response.json()) as { projects: Project[] };
    setProjects(data.projects);
    if (!selectedProjectId && data.projects[0]) setSelectedProjectId(data.projects[0].id);
  }

  async function loadRisks() {
    const params = new URLSearchParams();
    if (selectedProjectId) params.set("projectId", selectedProjectId);
    if (severityFilter !== "all") params.set("severity", severityFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);

    const response = await fetch(`/api/risks?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Failed to load risks");
    }
    const data = (await response.json()) as { risks: Risk[] };
    setRisks(data.risks);
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      await loadProjects();
      await loadRisks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    void loadRisks().catch((err) => setError(err instanceof Error ? err.message : "Failed to load risks"));
  }, [selectedProjectId, severityFilter, statusFilter]);

  async function createRisk() {
    if (!selectedProjectId || !title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          ownerId: ownerId || null,
          title: title.trim(),
          description: description.trim() || null,
          impact: impact.trim() || null,
          mitigation: mitigation.trim() || null,
          severity,
          status,
          dueDate: toIsoDate(dueDate),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to create risk");
      }

      setTitle("");
      setDescription("");
      setImpact("");
      setMitigation("");
      setSeverity("MEDIUM");
      setStatus("OPEN");
      setOwnerId("");
      setDueDate("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create risk");
    } finally {
      setSaving(false);
    }
  }

  async function updateRisk(risk: Risk, updates: Partial<Risk>) {
    setError(null);
    try {
      const response = await fetch("/api/risks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskId: risk.id, ...updates }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to update risk");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update risk");
    }
  }

  async function deleteRisk(riskId: string) {
    if (!confirm("Delete this risk? This cannot be undone.")) return;
    setError(null);
    try {
      const response = await fetch("/api/risks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to delete risk");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete risk");
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-nb-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-nb-muted">Project health</p>
            <h1 className="mt-1 text-2xl font-bold text-nb-text">Risks and blockers</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-nb-muted">
              Track project risks, owners, mitigation plans, due dates, and health signals using the same project membership and activity system as the rest of NexusBase.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-nb-border bg-white px-4 py-2.5 text-sm font-semibold text-nb-navy shadow-sm transition hover:-translate-y-0.5 hover:border-nb-navy/30 hover:bg-nb-surface-alt hover:shadow-md focus:outline-none focus:ring-2 focus:ring-nb-navy/30"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
        {error ? (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-nb-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-nb-muted">Active risks</p>
            <ShieldAlert className="h-5 w-5 text-nb-muted" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-nb-text">{totalActiveRisks}</p>
          <p className="mt-1 text-sm text-nb-muted">Open or watching</p>
        </div>
        <div className="rounded-2xl border border-nb-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-nb-muted">Critical risks</p>
            <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-nb-text">{criticalRisks}</p>
          <p className="mt-1 text-sm text-nb-muted">Require immediate attention</p>
        </div>
        <div className="rounded-2xl border border-nb-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-nb-muted">Overdue risks</p>
            <ClipboardList className="h-5 w-5 text-nb-muted" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-nb-text">{overdueRisks}</p>
          <p className="mt-1 text-sm text-nb-muted">Past due and unresolved</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.6fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-nb-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-nb-navy" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-nb-text">Workspace health</h2>
            </div>
            <div className="mt-4 space-y-3">
              {healthByProject.map(({ project, health }) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  className={[
                    "w-full rounded-xl border px-4 py-3 text-left transition hover:border-nb-navy/30 hover:bg-nb-surface-alt",
                    selectedProjectId === project.id ? "border-nb-navy/30 bg-nb-surface-alt" : "border-nb-border bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-nb-text">{project.name}</p>
                      <p className="mt-1 text-xs text-nb-muted">
                        {health.completedTasks}/{health.totalTasks} tasks complete · {health.activeRisks} active risks
                      </p>
                    </div>
                    <span className={["rounded-full px-2.5 py-1 text-xs font-semibold ring-1", getHealthBadgeClass(health.label)].join(" ")}>
                      {health.label}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-nb-surface-alt">
                    <div className="h-full rounded-full bg-nb-navy transition-all" style={{ width: `${health.score}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-nb-muted">Health score: {health.score}/100</p>
                </button>
              ))}
              {!loading && healthByProject.length === 0 ? (
                <div className="rounded-xl border border-dashed border-nb-border bg-nb-surface-alt px-4 py-6 text-sm text-nb-muted">
                  No accessible projects found.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-nb-border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-nb-text">Create risk</h2>
            <p className="mt-1 text-sm text-nb-muted">Add a real project risk with an owner, severity, due date, impact, and mitigation plan.</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-nb-text">
                Project
                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10">
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-nb-text">
                Risk title
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. S3 download links fail for missing objects" className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition placeholder:text-nb-muted/70 focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10" />
              </label>
              <label className="block text-sm font-medium text-nb-text">
                Description
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is the risk?" className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition placeholder:text-nb-muted/70 focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-nb-text">
                  Severity
                  <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10">
                    {severityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-nb-text">
                  Status
                  <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10">
                    {statusOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-nb-text">
                  Owner
                  <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10">
                    <option value="">Unassigned</option>
                    {selectedProject?.members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name ?? m.user.email ?? "Unnamed user"}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-nb-text">
                  Due date
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10" />
                </label>
              </div>
              <label className="block text-sm font-medium text-nb-text">
                Impact
                <textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} placeholder="What happens if this is not addressed?" className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition placeholder:text-nb-muted/70 focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10" />
              </label>
              <label className="block text-sm font-medium text-nb-text">
                Mitigation plan
                <textarea value={mitigation} onChange={(e) => setMitigation(e.target.value)} rows={2} placeholder="How will the team reduce or resolve this risk?" className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition placeholder:text-nb-muted/70 focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10" />
              </label>
              <button
                type="button"
                onClick={createRisk}
                disabled={saving || !title.trim() || !selectedProjectId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-nb-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-nb-navy/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-nb-navy/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                {saving ? "Creating..." : "Create risk"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-nb-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-nb-text">Risk register</h2>
              <p className="mt-1 text-sm text-nb-muted">Filter, update, and close project risks.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10">
                <option value="all">All severities</option>
                {severityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10">
                <option value="all">All statuses</option>
                {statusOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {filteredRisks.map((risk) => (
              <article key={risk.id} className="rounded-2xl border border-nb-border bg-white p-4 shadow-sm transition hover:border-nb-navy/20 hover:shadow-md">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className={["rounded-full px-2.5 py-1 text-xs font-semibold ring-1", getRiskSeverityClass(risk.severity)].join(" ")}>{risk.severity}</span>
                      <span className={["rounded-full px-2.5 py-1 text-xs font-semibold ring-1", getRiskStatusClass(risk.status)].join(" ")}>{risk.status}</span>
                      {isPastDue(risk.dueDate) && risk.status !== "CLOSED" ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">OVERDUE</span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-nb-text">{risk.title}</h3>
                    <p className="mt-1 text-sm text-nb-muted">{risk.description || "No description provided."}</p>
                    <div className="mt-3 grid gap-3 text-sm text-nb-muted md:grid-cols-2">
                      <div className="rounded-xl bg-nb-surface-alt px-3 py-2"><span className="font-semibold text-nb-text">Impact:</span> {risk.impact || "Not documented"}</div>
                      <div className="rounded-xl bg-nb-surface-alt px-3 py-2"><span className="font-semibold text-nb-text">Mitigation:</span> {risk.mitigation || "Not documented"}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteRisk(risk.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <label className="block text-xs font-medium text-nb-muted">
                    Status
                    <select value={risk.status} onChange={(e) => updateRisk(risk, { status: e.target.value as Risk["status"] })} className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10">
                      {statusOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-nb-muted">
                    Severity
                    <select value={risk.severity} onChange={(e) => updateRisk(risk, { severity: e.target.value as Risk["severity"] })} className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10">
                      {severityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-nb-muted">
                    Owner
                    <select value={risk.ownerId ?? ""} onChange={(e) => updateRisk(risk, { ownerId: e.target.value || null })} className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10">
                      <option value="">Unassigned</option>
                      {projects.find((p) => p.id === risk.projectId)?.members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name ?? m.user.email ?? "Unnamed user"}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-nb-muted">
                    Due date
                    <input type="date" value={toDateInputValue(risk.dueDate)} onChange={(e) => updateRisk(risk, { dueDate: toIsoDate(e.target.value) })} className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10" />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-nb-muted">
                  <span>Project: {risk.project.name}</span>
                  <span>Owner: {risk.owner?.name ?? risk.owner?.email ?? "Unassigned"}</span>
                  <span>Due: {formatDate(risk.dueDate)}</span>
                  <span>Updated: {formatDateTime(risk.updatedAt)}</span>
                </div>
              </article>
            ))}
            {!loading && filteredRisks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-nb-border bg-nb-surface-alt px-5 py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-nb-text">No matching risks</h3>
                <p className="mt-1 text-sm text-nb-muted">Create a risk or adjust the filters to inspect project health.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
