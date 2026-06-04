import DashboardShell from "@/components/layout/DashboardShell";
import { WorkspaceSearch } from "@/components/dashboard/workspace-search";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <DashboardShell>
      <WorkspaceSearch />
    </DashboardShell>
  );
}
