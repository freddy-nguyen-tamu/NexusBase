import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function PermissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Permissions</h1>
      <p className="mt-2 text-nb-muted">Role and permission management coming soon.</p>
    </div>
  );
}
