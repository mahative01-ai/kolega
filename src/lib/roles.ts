export const ROLE_LABEL = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MEMBER: "Member",
} as const;

export const REGISTRATION_DEFAULT_ROLE = "MEMBER" as const;
export const LOCAL_ACTING_ADMIN_EMAIL = "admin.mahative@kolega.local";

export function canManageTargetRole(actorRole: string, targetRole: string) {
  if (targetRole === "SUPER_ADMIN") {
    return false;
  }

  return actorRole === "SUPER_ADMIN";
}

export function canAssignRole(actorRole: string, nextRole: string) {
  if (nextRole === "SUPER_ADMIN") {
    return false;
  }

  return actorRole === "SUPER_ADMIN";
}
