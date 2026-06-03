export default function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode
  variant?: "default" | "accent" | "subtle"
  className?: string
}) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border"

  const variants: Record<string, string> = {
    default: "bg-white border-black/[0.06] text-framer-muted",
    accent: "bg-[#BFFB4F] border-transparent text-[#29291C]",
    subtle: "bg-framer-surface-subtle border-framer-border text-framer-gray-400",
  }

  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
