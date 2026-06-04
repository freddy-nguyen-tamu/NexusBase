import type { WorkspaceRole } from "@prisma/client";

export function canManageProject(role: WorkspaceRole | string | null | undefined) {
  return role === "OWNER" || role === "ADMIN";
}

export function canEditProjectContent(role: WorkspaceRole | string | null | undefined) {
  return role === "OWNER" || role === "ADMIN" || role === "EDITOR";
}

export function canModerateProject(role: WorkspaceRole | string | null | undefined) {
  return role === "OWNER" || role === "ADMIN";
}
