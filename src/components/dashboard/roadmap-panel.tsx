"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Flag,
  GitBranch,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { emit } from "@/lib/events";

type Project = {
  id: string;
  name: string;
  slug: string;
};

type MilestoneStatus = "PLANNED" | "ACTIVE" | "BLOCKED" | "COMPLETED" | "CANCELLED";
type DecisionStatus = "PROPOSED" | "APPROVED" | "REJECTED" | "SUPERSEDED";

type Milestone = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  dueDate: string | null;
  taskCount: number;
  doneTaskCount: number;
  progress: number;
  owner: { id: string; name: string | null; email: string | null; image: string | null } | null;
};

type Decision = {
  id: string;
  projectId: string;
  title: string;
  context: string | null;
  decision: string;
  impact: string | null;
  status: DecisionStatus;
  creator: { id: string; name: string | null; email: string | null; image: string | null };
  updatedAt: string;
};

const milestoneStatusStyles: Record<MilestoneStatus, string> = {
  PLANNED: "bg-slate-50 text-slate-700 ring-slate-200",
  ACTIVE: "bg-blue-50 text-blue-700 ring-blue-200",
  BLOCKED: "bg-amber-50 text-amber-700 ring-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
};

const decisionStatusStyles: Record<DecisionStatus, string> = {
  PROPOSED: "bg-slate-50 text-slate-700 ring-slate-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
  SUPERSEDED: "bg-purple-50 text-purple-700 ring-purple-200",
};

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function RoadmapPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [milestoneStatus, setMilestoneStatus] = useState<MilestoneStatus>("PLANNED");

  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [decisionImpact, setDecisionImpact] = useState("");
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>("PROPOSED");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  async function loadProjects() {
    const response = await fetch("/api/projects", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load projects");

    const data = (await response.json()) as { projects: Project[] };
    setProjects(data.projects);

    if (!selectedProjectId && data.projects[0]) {
      setSelectedProjectId(data.projects[0].id);
    }
  }

  async function loadRoadmap(projectId = selectedProjectId) {
    if (!projectId) {
      setMilestones([]);
      setDecisions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [milestoneResponse, decisionResponse] = await Promise.all([
        fetch(`/api/milestones?projectId=${projectId}`, { cache: "no-store" }),
        fetch(`/api/decisions?projectId=${projectId}`, { cache: "no-store" }),
      ]);

      if (!milestoneResponse.ok) throw new Error("Failed to load milestones");
      if (!decisionResponse.ok) throw new Error("Failed to load decisions");

      const milestoneData = (await milestoneResponse.json()) as { milestones: Milestone[] };
      const decisionData = (await decisionResponse.json()) as { decisions: Decision[] };

      setMilestones(milestoneData.milestones);
      setDecisions(decisionData.decisions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roadmap");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load projects");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      void loadRoadmap(selectedProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  async function createMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProjectId || !milestoneTitle.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: milestoneTitle.trim(),
          description: milestoneDescription.trim() || null,
          dueDate: milestoneDueDate ? new Date(`${milestoneDueDate}T12:00:00`).toISOString() : null,
          status: milestoneStatus,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to create milestone");
      }

      setMilestoneTitle("");
      setMilestoneDescription("");
      setMilestoneDueDate("");
      setMilestoneStatus("PLANNED");
      await loadRoadmap();
      emit("dashboard:refresh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create milestone");
    } finally {
      setSaving(false);
    }
  }

  async function createDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProjectId || !decisionTitle.trim() || !decisionText.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: decisionTitle.trim(),
          decision: decisionText.trim(),
          impact: decisionImpact.trim() || null,
          status: decisionStatus,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to create decision");
      }

      setDecisionTitle("");
      setDecisionText("");
      setDecisionImpact("");
      setDecisionStatus("PROPOSED");
      await loadRoadmap();
      emit("dashboard:refresh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create decision");
    } finally {
      setSaving(false);
    }
  }

  async function updateMilestoneStatus(id: string, status: MilestoneStatus) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/milestones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Failed to update milestone");

      await loadRoadmap();
      emit("dashboard:refresh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update milestone");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDecision(id: string) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/decisions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Failed to delete decision");

      await loadRoadmap();
      emit("dashboard:refresh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete decision");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="px-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-nb-muted">
            Roadmap & Decisions
          </p>
          <h3 className="mt-1 font-heading text-2xl font-bold tracking-tight text-nb-text">
            Plan delivery and capture why choices were made.
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-nb-muted">
            Milestones track delivery progress from tasks. Decisions record product and engineering context so the workspace becomes a source of truth.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
          >
            {projects.length === 0 ? <option value="">No projects found</option> : null}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadRoadmap()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-nb-border bg-white px-3 py-2 text-sm font-semibold text-nb-text shadow-sm transition hover:bg-nb-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-nb-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-nb-navy" />
              <h4 className="font-heading text-lg font-bold text-nb-text">Milestones</h4>
            </div>

            <form onSubmit={createMilestone} className="mt-4 grid gap-3 rounded-xl border border-nb-border bg-nb-surface-alt p-4">
              <input
                value={milestoneTitle}
                onChange={(event) => setMilestoneTitle(event.target.value)}
                placeholder="Milestone title, e.g. Launch private beta"
                className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
              />
              <textarea
                value={milestoneDescription}
                onChange={(event) => setMilestoneDescription(event.target.value)}
                placeholder="What needs to be true for this milestone to be complete?"
                rows={3}
                className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={milestoneDueDate}
                  onChange={(event) => setMilestoneDueDate(event.target.value)}
                  className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
                />
                <select
                  value={milestoneStatus}
                  onChange={(event) => setMilestoneStatus(event.target.value as MilestoneStatus)}
                  className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={saving || !selectedProject || !milestoneTitle.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-nb-navy px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-nb-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Add milestone
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-xl border border-dashed border-nb-border bg-nb-surface-alt px-4 py-8 text-center text-sm text-nb-muted">
                  Loading roadmap...
                </div>
              ) : milestones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-nb-border bg-nb-surface-alt px-4 py-8 text-center text-sm text-nb-muted">
                  No milestones yet. Create one to turn tasks into a delivery roadmap.
                </div>
              ) : (
                milestones.map((milestone) => (
                  <article key={milestone.id} className="rounded-xl border border-nb-border bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-semibold text-nb-text">{milestone.title}</h5>
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", milestoneStatusStyles[milestone.status])}>
                            {formatStatus(milestone.status)}
                          </span>
                        </div>
                        {milestone.description ? (
                          <p className="mt-2 text-sm leading-6 text-nb-muted">{milestone.description}</p>
                        ) : null}
                        <p className="mt-2 text-xs font-medium text-nb-muted">
                          {formatDate(milestone.dueDate)} · {milestone.doneTaskCount}/{milestone.taskCount} tasks done
                        </p>
                      </div>

                      <select
                        value={milestone.status}
                        onChange={(event) => updateMilestoneStatus(milestone.id, event.target.value as MilestoneStatus)}
                        className="rounded-lg border border-nb-border bg-white px-2.5 py-2 text-xs font-semibold text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
                      >
                        <option value="PLANNED">Planned</option>
                        <option value="ACTIVE">Active</option>
                        <option value="BLOCKED">Blocked</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-nb-surface-alt">
                      <div className="h-full rounded-full bg-nb-navy transition-all" style={{ width: `${milestone.progress}%` }} />
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-nb-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-nb-navy" />
              <h4 className="font-heading text-lg font-bold text-nb-text">Decision Log</h4>
            </div>

            <form onSubmit={createDecision} className="mt-4 grid gap-3 rounded-xl border border-nb-border bg-nb-surface-alt p-4">
              <input
                value={decisionTitle}
                onChange={(event) => setDecisionTitle(event.target.value)}
                placeholder="Decision title, e.g. Use presigned S3 uploads"
                className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
              />
              <textarea
                value={decisionText}
                onChange={(event) => setDecisionText(event.target.value)}
                placeholder="What decision was made?"
                rows={3}
                className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
              />
              <textarea
                value={decisionImpact}
                onChange={(event) => setDecisionImpact(event.target.value)}
                placeholder="Impact, tradeoffs, or follow-up work"
                rows={2}
                className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
              />
              <select
                value={decisionStatus}
                onChange={(event) => setDecisionStatus(event.target.value as DecisionStatus)}
                className="rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none transition focus:border-nb-navy focus:ring-2 focus:ring-nb-navy/10"
              >
                <option value="PROPOSED">Proposed</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SUPERSEDED">Superseded</option>
              </select>
              <button
                type="submit"
                disabled={saving || !selectedProject || !decisionTitle.trim() || !decisionText.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-nb-navy px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-nb-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Record decision
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {decisions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-nb-border bg-nb-surface-alt px-4 py-8 text-center text-sm text-nb-muted">
                  No decisions recorded yet. Capture important choices so the project history is understandable.
                </div>
              ) : (
                decisions.map((decision) => (
                  <article key={decision.id} className="rounded-xl border border-nb-border bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-semibold text-nb-text">{decision.title}</h5>
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", decisionStatusStyles[decision.status])}>
                            {formatStatus(decision.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-nb-muted">{decision.decision}</p>
                        {decision.impact ? (
                          <p className="mt-2 rounded-lg bg-nb-surface-alt px-3 py-2 text-xs leading-5 text-nb-muted">
                            Impact: {decision.impact}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteDecision(decision.id)}
                        className="rounded-lg border border-nb-border bg-white p-2 text-nb-muted transition hover:bg-red-50 hover:text-red-600"
                        title="Delete decision"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-nb-border bg-nb-surface-alt p-5">
            <div className="flex items-center gap-2 text-nb-navy">
              <GitBranch className="h-5 w-5" />
              <p className="font-semibold">Why this matters</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-nb-muted">
              Roadmaps and decisions make NexusBase feel like a real product workspace, not just a CRUD dashboard. They also create stronger portfolio talking points around project planning, role-based access, audit logs, and product documentation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
