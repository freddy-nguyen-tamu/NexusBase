"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { on } from "@/lib/events";
import { FlipNumber } from "@/components/ui/flip-number";

type Stat = { label: string; value: string; trend?: string; detail: string };

export default function StatsCards() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("there");

  async function load() {
    try {
      const [statsRes, sessionRes] = await Promise.allSettled([
        fetch("/api/stats"),
        fetch("/api/auth/session"),
      ]);

      let data: Record<string, number> = {};
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        data = await statsRes.value.json();
      }

      if (sessionRes.status === "fulfilled" && sessionRes.value.ok) {
        const session = await sessionRes.value.json();
        const name = session?.user?.name ?? session?.user?.email ?? "there";
        setUserName(name.split(" ")[0]);
      }

      const cards: Stat[] = [
        {
          label: "Projects",
          value: data.projects != null ? String(data.projects) : "—",
          detail: "active workspaces",
        },
        {
          label: "Tasks",
          value: data.tasks != null ? String(data.tasks) : "—",
          detail: "across all projects",
        },
        {
          label: "Members",
          value: data.members != null ? String(data.members) : "—",
          detail: "workspace users",
        },
        {
          label: "Files",
          value: data.files != null ? String(data.files) : "—",
          detail: "cloud-stored assets",
        },
      ];

      setStats(cards);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const unsub = on("activity", () => void loadRef.current());
    return unsub;
  }, []);

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-nb-text">
          Welcome back, {userName}
        </h1>
        <p className="text-nb-muted text-sm mt-1">Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-nb-border p-5 shadow-sm animate-pulse h-24"
              />
            ))
          : stats.map((stat) => (
              <motion.article
                key={stat.label}
                whileHover={{ y: -4 }}
                className="rounded-2xl bg-white border border-nb-border p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default"
              >
                <p className="text-2xl font-heading font-black text-nb-navy">
                  <FlipNumber value={stat.value} />
                </p>
                <p className="text-xs text-nb-muted mt-0.5 font-mono">{stat.label}</p>
                {stat.trend && (
                  <p
                    className={`mt-1 text-xs font-bold ${
                      stat.trend.startsWith("+") ? "text-nb-green-dark" : "text-nb-orange"
                    }`}
                  >
                    {stat.trend}
                  </p>
                )}
              </motion.article>
            ))}
      </div>
    </div>
  );
}
