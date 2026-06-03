"use client"

import { motion } from "framer-motion"

const stats = [
  { label: "Active Projects", value: "12", trend: "+2", positive: true },
  { label: "Open Tasks", value: "42", trend: "+8", positive: true },
  { label: "Files Stored", value: "1.4k", trend: "+12%", positive: true },
  { label: "Unread Updates", value: "27", trend: "-3", positive: false },
]

export default function StatsCards() {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-framer-text">
          Welcome back, Alex
        </h1>
        <p className="text-framer-muted text-sm mt-1">Here&apos;s what&apos;s happening today.</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.article
            key={stat.label}
            whileHover={{ y: -4 }}
            className="rounded-2xl bg-white border border-black/[0.04] p-5 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <p className="text-2xl font-bold text-framer-text">{stat.value}</p>
            <p className="text-xs text-framer-muted mt-0.5">{stat.label}</p>
            <p className={`mt-1 text-xs font-semibold ${stat.positive ? "text-emerald-600" : "text-rose-600"}`}>
              {stat.trend}
            </p>
          </motion.article>
        ))}
      </div>
    </div>
  )
}
