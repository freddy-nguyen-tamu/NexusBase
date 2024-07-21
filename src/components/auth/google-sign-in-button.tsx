"use client";

import { signIn } from "next-auth/react";
import { KeyRound } from "lucide-react";

export function GoogleSignInButton() {
  return (
    <button
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[7px] bg-[#323234] px-5 py-3 font-mono text-sm font-bold uppercase text-white hover:bg-black"
      onClick={() => signIn("google", { callbackUrl: "/" })}
      type="button"
    >
      <KeyRound className="h-4 w-4" aria-hidden="true" />
      Continue with Google
    </button>
  );
}
