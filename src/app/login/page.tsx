import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="hupr-auth">
      <Link className="hupr-auth__back" href="/">
        BACK TO WORKSPACE
      </Link>

      <section className="hupr-auth__panel">
        <div className="hupr-section-label">
          <span>AUTHENTICATION</span>
          <span>GOOGLE OAUTH</span>
        </div>
        <h1>SIGN IN TO NEXUSBASE</h1>
        <p>
          Google OAuth connects users to protected workspace routes,
          project-level roles, account sessions, and admin-only controls.
        </p>

        <div className="hupr-auth__button">
          <GoogleSignInButton />
        </div>

        <div className="hupr-auth__note text-nb-muted">
          Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET,
          and DATABASE_URL before using live authentication.
        </div>
      </section>
    </main>
  );
}
