"use client"

import { motion } from "framer-motion"

type Stat = { label: string; value: string; trend?: string; detail: string }

export default function StatsCards({ stats = [] }: { stats?: Stat[] }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-nb-text">
          Welcome back, Alex
        </h1>
        <p className="text-nb-muted text-sm mt-1">Here&apos;s what&apos;s happening today.</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.article
            key={stat.label}
            whileHover={{ y: -4 }}
            className="rounded-2xl bg-white border border-nb-border p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default"
          >
            <p className="text-2xl font-heading font-black text-nb-navy">{stat.value}</p>
            <p className="text-xs text-nb-muted mt-0.5 font-mono">{stat.label}</p>
            {stat.trend && (
              <p className={`mt-1 text-xs font-bold ${stat.trend.startsWith("+") ? "text-nb-green-dark" : "text-nb-orange"}`}>
                {stat.trend}
              </p>
            )}
          </motion.article>
        ))}
      </div>
    </div>
  )
}
