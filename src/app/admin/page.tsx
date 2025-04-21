import { AdminConsole } from "@/components/admin/admin-console";

export const metadata = {
  title: "Admin | NexusBase",
  description: "Admin dashboard for users, activity, and system analytics.",
};

export default function AdminPage() {
  return <AdminConsole />;
}
