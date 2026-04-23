export const USER_ROLES = ["customer", "support", "admin", "owner"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PERMISSIONS = {
  bookingReadOwn: "booking:read:own",
  bookingManageOwn: "booking:manage:own",
  bookingReadAll: "booking:read:all",
  bookingManageAll: "booking:manage:all",
  visaReview: "visa:review",
  adminAccess: "admin:access",
  settingsManage: "settings:manage"
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  customer: [PERMISSIONS.bookingReadOwn, PERMISSIONS.bookingManageOwn],
  support: [
    PERMISSIONS.bookingReadAll,
    PERMISSIONS.bookingManageAll,
    PERMISSIONS.visaReview
  ],
  admin: [
    PERMISSIONS.bookingReadAll,
    PERMISSIONS.bookingManageAll,
    PERMISSIONS.visaReview,
    PERMISSIONS.adminAccess
  ],
  owner: Object.values(PERMISSIONS)
};

export function hasPermission(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}
