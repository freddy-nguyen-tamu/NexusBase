import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7fb] p-4 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950" href="/">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <div className="mb-6 grid h-12 w-12 place-items-center rounded-lg bg-[#10151f] text-white">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-semibold text-slate-950">Sign in to NexusBase</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Google OAuth connects users to protected workspace routes, role-based permissions, and account sessions.
        </p>

        <div className="mt-6">
          <GoogleSignInButton />
        </div>

        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" aria-hidden="true" />
            <p className="text-sm leading-5 text-slate-600">
              Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `DATABASE_URL` before using live authentication.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
