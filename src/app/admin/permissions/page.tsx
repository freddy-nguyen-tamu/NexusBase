import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PermissionsPanel } from "./permissions-panel";

export default async function PermissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-nb-text">Permissions</h1>
      <p className="mt-1 text-sm text-nb-muted">Manage user roles and account status.</p>
      <div className="mt-6">
        <PermissionsPanel />
      </div>
    </div>
  );
}
