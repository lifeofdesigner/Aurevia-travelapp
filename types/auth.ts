import {type UserRole} from "@/lib/permissions";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};
