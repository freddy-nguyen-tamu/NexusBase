"use client"

import { motion } from "framer-motion"

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost"
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200"

  const variants: Record<string, string> = {
    primary: "bg-[#29291C] text-white hover:bg-[#29291C]/90 shadow-sm",
    secondary: "bg-[#BFFB4F] text-[#29291C] hover:bg-[#BFFB4F]/90 shadow-sm",
    ghost: "bg-transparent text-framer-text hover:bg-black/[0.04]",
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant]} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}
