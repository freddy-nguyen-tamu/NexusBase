import { MembersPanel } from "@/components/dashboard/members-panel";

export default function MembersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-nb-text mb-4">Members</h1>
      <MembersPanel />
    </div>
  );
}
