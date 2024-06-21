"use client";

import { signIn } from "next-auth/react";
import { KeyRound } from "lucide-react";

export function GoogleSignInButton() {
  return (
    <button
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#10151f] px-4 text-sm font-semibold text-white hover:bg-[#1f2937]"
      onClick={() => signIn("google", { callbackUrl: "/" })}
      type="button"
    >
      <KeyRound className="h-4 w-4" aria-hidden="true" />
      Continue with Google
    </button>
  );
}
