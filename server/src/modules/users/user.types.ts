export const userRoles = ["admin", "member", "viewer"] as const;
export type UserRole = (typeof userRoles)[number];

export const userStatuses = ["active", "invited", "disabled"] as const;
export type UserStatus = (typeof userStatuses)[number];
