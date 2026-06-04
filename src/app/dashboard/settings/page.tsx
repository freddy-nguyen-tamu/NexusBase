"use client";

import { useSession } from "next-auth/react";
import { User, Shield, Bell, Palette } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  const sections = [
    { icon: User, label: "Profile", desc: "Manage your name, email, and avatar." },
    { icon: Shield, label: "Security", desc: "Authentication methods and session management." },
    { icon: Bell, label: "Notifications", desc: "Configure which alerts you receive." },
    { icon: Palette, label: "Appearance", desc: "Theme and display preferences." },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-nb-text">Settings</h1>
      <p className="mt-1 text-sm text-nb-muted">
        Signed in as <span className="font-semibold text-nb-text">{session?.user?.email ?? "—"}</span>
      </p>
      <div className="mt-6 grid gap-4">
        {sections.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-nb-border bg-white p-5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-nb-surface-alt text-nb-navy">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-nb-text">{label}</p>
              <p className="text-sm text-nb-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
