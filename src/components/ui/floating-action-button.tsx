import type { ButtonHTMLAttributes, ReactNode } from "react";

type FloatingActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  align?: "left" | "right";
};

export function FloatingActionButton({
  icon,
  label,
  align = "left",
  className = "",
  ...props
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center gap-2 rounded-xl border border-nb-border bg-white/95 px-3.5 py-2.5 text-sm font-semibold text-nb-navy shadow-lg shadow-slate-950/10 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-nb-navy/30 hover:bg-nb-surface-alt hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-nb-navy/30",
        align === "left" ? "justify-start" : "justify-end",
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
