"use client";

import { useMemo, useState, type DragEvent } from "react";
import { CalendarDays, GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { tasks, type WorkspaceTask, type WorkspaceTaskStatus } from "@/lib/sample-data";

const columns: Array<{ id: WorkspaceTaskStatus; label: string; border: string }> = [
  { id: "todo", label: "Todo", border: "border-l-[#2563eb]" },
  { id: "inProgress", label: "In Progress", border: "border-l-[#d97706]" },
  { id: "done", label: "Done", border: "border-l-[#0f766e]" },
];

const priorityStyles: Record<WorkspaceTask["priority"], string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-50 text-blue-700",
  High: "bg-amber-50 text-amber-700",
  Urgent: "bg-rose-50 text-rose-700",
};

export function TaskBoard() {
  const [items, setItems] = useState(tasks);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      tasks: items.filter((task) => task.status === column.id),
    }));
  }, [items]);

  function moveTask(taskId: string, status: WorkspaceTaskStatus) {
    setItems((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );
  }

  function onDragStart(event: DragEvent<HTMLElement>, taskId: string) {
    event.dataTransfer.setData("text/plain", taskId);
    setDraggingTaskId(taskId);
  }

  function onDrop(event: DragEvent<HTMLElement>, status: WorkspaceTaskStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggingTaskId;

    if (taskId) {
      moveTask(taskId, status);
    }

    setDraggingTaskId(null);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Project Kanban</h2>
          <p className="text-sm text-slate-500">Drag cards between columns to model task status changes.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {items.length} tracked tasks
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {grouped.map((column) => (
          <div
            key={column.id}
            className="min-h-[360px] rounded-lg border border-slate-200 bg-slate-50 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, column.id)}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">{column.label}</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                {column.tasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {column.tasks.map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={(event) => onDragStart(event, task.id)}
                  onDragEnd={() => setDraggingTaskId(null)}
                  className={cn(
                    "cursor-grab rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-sm active:cursor-grabbing",
                    column.border,
                    draggingTaskId === task.id && "opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold leading-5 text-slate-950">{task.title}</h4>
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-500">{task.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {task.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className={cn("rounded-full px-2 py-1 font-semibold", priorityStyles[task.priority])}>
                      {task.priority}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {task.dueDate}
                    </span>
                  </div>
                  <div className="mt-3 text-xs font-medium text-slate-500">
                    {task.assignee} · {task.project}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
