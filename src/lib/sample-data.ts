export type WorkspaceTaskStatus = "todo" | "inProgress" | "done";

export type WorkspaceTask = {
  id: string;
  title: string;
  description: string;
  project: string;
  assignee: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: WorkspaceTaskStatus;
  tags: string[];
};

export const workspaceStats = [
  {
    label: "Active projects",
    value: "12",
    trend: "+18%",
    detail: "4 due this week",
  },
  {
    label: "Open tasks",
    value: "84",
    trend: "-9%",
    detail: "21 assigned to you",
  },
  {
    label: "Files stored",
    value: "1.8 TB",
    trend: "+32%",
    detail: "AWS S3 workspace bucket",
  },
  {
    label: "Unread updates",
    value: "27",
    trend: "+6",
    detail: "Chat, comments, shares",
  },
];

export const tasks: WorkspaceTask[] = [
  {
    id: "task-1",
    title: "Ship Google OAuth invitation flow",
    description: "Finish protected routes, role defaults, and first-login profile creation.",
    project: "Identity",
    assignee: "Kevin",
    dueDate: "Today",
    priority: "Urgent",
    status: "todo",
    tags: ["Auth", "RBAC"],
  },
  {
    id: "task-2",
    title: "Add S3 preview metadata",
    description: "Store file checksums, MIME type, and preview-ready object keys.",
    project: "Cloud Files",
    assignee: "Maya",
    dueDate: "Tomorrow",
    priority: "High",
    status: "todo",
    tags: ["AWS", "Storage"],
  },
  {
    id: "task-3",
    title: "Index project comments",
    description: "Prepare full-text search fields for tasks, files, and messages.",
    project: "Search",
    assignee: "Alex",
    dueDate: "May 23",
    priority: "Medium",
    status: "inProgress",
    tags: ["Postgres", "Search"],
  },
  {
    id: "task-4",
    title: "Design activity log events",
    description: "Normalize audit records for task changes, file shares, and admin actions.",
    project: "Audit Trail",
    assignee: "Sam",
    dueDate: "May 24",
    priority: "High",
    status: "inProgress",
    tags: ["Audit", "Events"],
  },
  {
    id: "task-5",
    title: "Create workspace analytics cards",
    description: "Summarize active members, completion rate, and storage growth.",
    project: "Dashboard",
    assignee: "Nina",
    dueDate: "May 20",
    priority: "Low",
    status: "done",
    tags: ["UI", "Analytics"],
  },
  {
    id: "task-6",
    title: "Model project-level file sharing",
    description: "Owner, editor, and viewer permissions are represented in Prisma.",
    project: "Permissions",
    assignee: "Jordan",
    dueDate: "May 19",
    priority: "Medium",
    status: "done",
    tags: ["Security", "Prisma"],
  },
];

export const files = [
  {
    name: "Q2-roadmap.pdf",
    project: "Leadership Sync",
    owner: "Kevin",
    size: "18.4 MB",
    permission: "Owner",
    updated: "8 min ago",
    type: "PDF",
  },
  {
    name: "client-onboarding.fig",
    project: "Design Systems",
    owner: "Maya",
    size: "42.1 MB",
    permission: "Editor",
    updated: "24 min ago",
    type: "Design",
  },
  {
    name: "aws-cost-report.xlsx",
    project: "Cloud Files",
    owner: "Alex",
    size: "2.7 MB",
    permission: "Viewer",
    updated: "1 hr ago",
    type: "Sheet",
  },
  {
    name: "auth-risk-register.md",
    project: "Identity",
    owner: "Sam",
    size: "84 KB",
    permission: "Editor",
    updated: "Yesterday",
    type: "Doc",
  },
];

export const members = [
  { name: "Kevin", role: "Owner", status: "Online", workload: 82 },
  { name: "Maya", role: "Admin", status: "Online", workload: 67 },
  { name: "Alex", role: "Editor", status: "Away", workload: 54 },
  { name: "Sam", role: "Viewer", status: "Offline", workload: 31 },
];

export const notifications = [
  {
    title: "Maya shared client-onboarding.fig",
    body: "You have editor access in Design Systems.",
    time: "4 min ago",
    unread: true,
  },
  {
    title: "Alex commented on Search indexing",
    body: "Asked whether task tags should be searchable.",
    time: "18 min ago",
    unread: true,
  },
  {
    title: "Admin role changed",
    body: "Sam moved Jordan from viewer to editor.",
    time: "1 hr ago",
    unread: false,
  },
];

export const activity = [
  {
    actor: "Kevin",
    action: "created",
    subject: "Ship Google OAuth invitation flow",
    scope: "Identity",
    time: "11 min ago",
  },
  {
    actor: "Maya",
    action: "uploaded",
    subject: "client-onboarding.fig",
    scope: "Design Systems",
    time: "24 min ago",
  },
  {
    actor: "Alex",
    action: "moved",
    subject: "Index project comments",
    scope: "Search",
    time: "42 min ago",
  },
  {
    actor: "Sam",
    action: "shared",
    subject: "auth-risk-register.md",
    scope: "Identity",
    time: "Yesterday",
  },
];

export const messages = [
  {
    author: "Maya",
    body: "The AWS upload flow is ready for presigned URLs. I left the metadata fields in the schema.",
    time: "9:42 AM",
  },
  {
    author: "Kevin",
    body: "Great. I am wiring that into the Cloud Files section and keeping the dashboard demo-friendly.",
    time: "9:46 AM",
  },
  {
    author: "Alex",
    body: "Search can start with Postgres text indexes, then move to OpenSearch if the dataset grows.",
    time: "9:51 AM",
  },
];

export const adminMetrics = [
  { label: "Users", value: "128", detail: "9 invited this week" },
  { label: "Projects", value: "34", detail: "12 private, 22 shared" },
  { label: "Audit events", value: "9.4k", detail: "Last 30 days" },
  { label: "Storage spend", value: "$74", detail: "S3 monthly estimate" },
];
