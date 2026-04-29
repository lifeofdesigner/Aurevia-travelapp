"use client";

import {createContext, useContext, type ReactNode} from "react";

import {type AdminRole} from "@/lib/auth/admin-auth-config";

export type AdminSessionContextValue = {
  email: string;
  fullName: string | null;
  role: AdminRole;
  userId: string;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

type AdminSessionProviderProps = {
  children: ReactNode;
  value: AdminSessionContextValue;
};

export function AdminSessionProvider({children, value}: AdminSessionProviderProps) {
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);

  if (!context) {
    throw new Error("useAdminSession must be used within an AdminSessionProvider.");
  }

  return context;
}
