type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="group flex w-full items-center justify-between gap-4 rounded-xl border border-nb-border bg-white px-4 py-3 text-left shadow-sm transition hover:border-nb-navy/30 hover:bg-nb-surface-alt focus:outline-none focus:ring-2 focus:ring-nb-navy/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-semibold text-nb-text">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-nb-muted">
            {description}
          </span>
        ) : null}
      </span>

      <span
        className={[
          "relative inline-flex h-7 w-12 shrink-0 rounded-full border p-0.5 transition-colors",
          checked
            ? "border-nb-navy bg-nb-navy"
            : "border-nb-border bg-nb-surface-alt",
        ].join(" ")}
      >
        <span
          className={[
            "h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
