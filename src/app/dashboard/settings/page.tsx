"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Shield,
  Bell,
  Palette,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const notifications = [
  { id: "task_assigned", label: "Task assigned to me" },
  { id: "task_updated", label: "Task status changes" },
  { id: "new_comment", label: "New comments on my tasks" },
  { id: "project_invite", label: "Project invitations" },
  { id: "mention", label: "Mentions in conversations" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(notifications.map((n) => [n.id, true])),
  );

  useEffect(() => {
    const stored = localStorage.getItem("nb-theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
    }
  }, []);

  useEffect(() => {
    if (session?.user?.name && name === "") {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("nb-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  async function handleSaveProfile() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  function toggleNotif(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-nb-text">Settings</h1>
      <p className="mt-1 text-sm text-nb-muted">
        Signed in as{" "}
        <span className="font-semibold text-nb-text">
          {session?.user?.email ?? "—"}
        </span>
      </p>

      <div className="mt-6 space-y-6">
        {/* Profile */}
        <section className="rounded-xl border border-nb-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-nb-surface-alt text-nb-navy">
              <User className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-nb-text">Profile</h2>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-nb-text">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setStatus("idle");
                }}
                className="mt-1 w-full rounded-lg border border-nb-border bg-white px-3 py-2 text-sm text-nb-text outline-none focus:border-nb-navy focus:ring-1 focus:ring-nb-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-nb-text">
                Email
              </label>
              <input
                value={session?.user?.email ?? ""}
                readOnly
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-nb-border bg-nb-surface-alt px-3 py-2 text-sm text-nb-muted"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-nb-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-nb-navy/90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
              {status === "saved" && (
                <span className="flex items-center gap-1 text-sm text-nb-green">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
              {status === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" /> Failed to save
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-xl border border-nb-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-nb-surface-alt text-nb-navy">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-nb-text">Security</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between rounded-lg bg-nb-surface-alt px-4 py-3">
              <span className="text-nb-muted">Sign-in method</span>
              <span className="font-medium text-nb-text">Google OAuth</span>
            </div>
            <div className="flex justify-between rounded-lg bg-nb-surface-alt px-4 py-3">
              <span className="text-nb-muted">Last sign-in</span>
              <span className="font-medium text-nb-text">
                {session?.user?.email ? "Today" : "—"}
              </span>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border border-nb-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-nb-surface-alt text-nb-navy">
              <Bell className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-nb-text">
              Notification preferences
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-nb-surface-alt"
              >
                <span className="text-sm text-nb-text">{n.label}</span>
                <button
                  onClick={() => toggleNotif(n.id)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    toggles[n.id] ? "bg-nb-green" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      toggles[n.id] ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-xl border border-nb-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-nb-surface-alt text-nb-navy">
              <Palette className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-nb-text">Appearance</h2>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-nb-surface-alt px-4 py-3">
            <span className="text-sm text-nb-text">Theme</span>
            <button
              onClick={toggleTheme}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                theme === "dark" ? "bg-nb-navy" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  theme === "dark" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
