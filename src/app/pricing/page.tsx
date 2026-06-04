import { Check } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started on your own.",
    features: [
      "Self-hosted",
      "Google OAuth",
      "Projects",
      "Tasks",
      "Files",
      "1 workspace",
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Team",
    price: "Contact for setup",
    description: "Collaborate with your team in real time.",
    features: [
      "Everything in Free",
      "Team chat",
      "File sharing",
      "Roles & permissions",
    ],
    cta: "Contact Sales",
    href: "#",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Contact for setup",
    description: "Advanced security and dedicated support.",
    features: [
      "Everything in Team",
      "SSO",
      "Audit logs",
      "Admin console",
      "Priority support",
    ],
    cta: "Contact Sales",
    href: "#",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-nb-bg">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-nb-text md:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-nb-muted">
            Choose the plan that fits your workflow. No hidden fees.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-8 md:grid-cols-3 md:items-start">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-md ${
                tier.highlighted
                  ? "border-nb-green ring-2 ring-nb-green/40"
                  : "border-nb-border"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-nb-green px-4 py-1 text-xs font-semibold text-nb-text">
                  Most popular
                </span>
              )}

              <h2 className="text-xl font-semibold text-nb-text">
                {tier.name}
              </h2>
              <p className="mt-1 text-sm text-nb-muted">{tier.description}</p>

              <div className="mt-6 border-t border-nb-border pt-6">
                <span className="text-3xl font-bold text-nb-text">
                  {tier.price}
                </span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-nb-text">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-nb-green-dark" />
                    {feat}
                  </li>
                ))}
              </ul>

              <a
                href={tier.href}
                className={`mt-8 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-center text-sm font-semibold transition-all duration-200 ${
                  tier.highlighted
                    ? "bg-nb-text text-white hover:bg-nb-text/90"
                    : "border border-nb-border bg-white text-nb-text hover:bg-nb-surface-alt"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
