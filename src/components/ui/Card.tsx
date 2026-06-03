"use client"

import { motion } from "framer-motion"

export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`
        rounded-3xl
        bg-white
        border
        border-black/[0.04]
        shadow-sm
        hover:shadow-xl
        transition-all
        duration-300
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}
