"use client";

import {AlertTriangle, Loader2, LockKeyhole, Search, ShieldCheck} from "lucide-react";
import {type FormEvent, useMemo, useState} from "react";

import {Button} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

type SetupUserRole = "customer" | "super_admin" | "admin" | "agent" | "support";

type SetupUserRecord = {
  authCreatedAt: string | null;
  email: string;
  fullName: string | null;
  id: string;
  isActive: boolean;
  role: SetupUserRole;
};

type SetupCounts = {
  adminUsersCount: number;
  authUsersCount: number;
  profilesCount: number;
};

type SetupListResponse = {
  counts: SetupCounts;
  users: SetupUserRecord[];
};

const ADMIN_ROLE_OPTIONS: Array<{
  description: string;
  label: string;
  value: Exclude<SetupUserRole, "customer">;
}> = [
  {
    description: "Full access to everything",
    label: "super_admin",
    value: "super_admin"
  },
  {
    description: "All admin except users and API keys",
    label: "admin",
    value: "admin"
  },
  {
    description: "Bookings and support only",
    label: "agent",
    value: "agent"
  },
  {
    description: "Support tickets only",
    label: "support",
    value: "support"
  }
];

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  const labelMap = ["Too weak", "Weak", "Fair", "Strong", "Very strong"] as const;
  const toneMap = [
    "bg-[#ead9c8]",
    "bg-[#d32222]",
    "bg-[#c9a84c]",
    "bg-[#2a5a40]",
    "bg-[#1c3d2e]"
  ] as const;

  return {
    className: toneMap[score],
    label: labelMap[score],
    score
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

type ApiError = {
  message?: string;
};

type SetupToolProps = {
  setupEnabled: boolean;
};

export function SetupTool({setupEnabled}: SetupToolProps) {
  const [secretKey, setSecretKey] = useState("");

  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminRole, setAdminRole] = useState<Exclude<SetupUserRole, "customer">>(
    "super_admin"
  );
  const [adminPending, setAdminPending] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [customerFullName, setCustomerFullName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [customerConfirmPassword, setCustomerConfirmPassword] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPending, setCustomerPending] = useState(false);
  const [customerMessage, setCustomerMessage] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const [users, setUsers] = useState<SetupUserRecord[]>([]);
  const [counts, setCounts] = useState<SetupCounts | null>(null);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersPending, setUsersPending] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | SetupUserRole>("all");
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const [connectionPending, setConnectionPending] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const adminStrength = getPasswordStrength(adminPassword);
  const customerStrength = getPasswordStrength(customerPassword);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;
      const searchTerm = userSearch.trim().toLowerCase();
      const haystack = `${user.fullName ?? ""} ${user.email}`.toLowerCase();
      const matchesSearch = searchTerm ? haystack.includes(searchTerm) : true;

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, userSearch, users]);

  async function requestSetup<TResponse>(
    path: string,
    options?: {
      body?: Record<string, unknown>;
      method?: "GET" | "POST";
    }
  ): Promise<TResponse> {
    if (!secretKey.trim()) {
      throw new Error("Enter the setup secret key to proceed.");
    }

    const response = await fetch(path, {
      method: options?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "x-setup-secret-key": secretKey.trim()
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    });

    const payload = (await response.json().catch(() => null)) as ApiError | TResponse | null;

    if (!response.ok) {
      const errorMessage =
        payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : null;

      throw new Error(
        errorMessage || "The setup request failed."
      );
    }

    return payload as TResponse;
  }

  function clearAdminMessages() {
    setAdminError(null);
    setAdminMessage(null);
  }

  function clearCustomerMessages() {
    setCustomerError(null);
    setCustomerMessage(null);
  }

  async function refreshUsers() {
    const response = await requestSetup<SetupListResponse>("/api/setup/list-users");
    setUsers(response.users);
    setCounts(response.counts);
    setUsersLoaded(true);
    return response;
  }

  async function handleCreateAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAdminMessages();

    if (adminPassword.length < 8) {
      setAdminError("Password must be at least 8 characters.");
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setAdminError("Passwords do not match.");
      return;
    }

    setAdminPending(true);

    try {
      await requestSetup<{message: string}>("/api/setup/create-user", {
        body: {
          email: adminEmail,
          fullName: adminFullName,
          kind: "admin",
          password: adminPassword,
          role: adminRole
        },
        method: "POST"
      });

      setAdminMessage("Admin user created. They can now log in at /admin-login");
      setAdminFullName("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminConfirmPassword("");

      if (usersLoaded) {
        await refreshUsers();
      }
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Unable to create admin user.");
    } finally {
      setAdminPending(false);
    }
  }

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearCustomerMessages();

    if (customerPassword.length < 8) {
      setCustomerError("Password must be at least 8 characters.");
      return;
    }

    if (customerPassword !== customerConfirmPassword) {
      setCustomerError("Passwords do not match.");
      return;
    }

    setCustomerPending(true);

    try {
      await requestSetup<{message: string}>("/api/setup/create-user", {
        body: {
          email: customerEmail,
          fullName: customerFullName,
          kind: "customer",
          password: customerPassword,
          phone: customerPhone || null
        },
        method: "POST"
      });

      setCustomerMessage("Customer user created successfully.");
      setCustomerFullName("");
      setCustomerEmail("");
      setCustomerPassword("");
      setCustomerConfirmPassword("");
      setCustomerPhone("");

      if (usersLoaded) {
        await refreshUsers();
      }
    } catch (error) {
      setCustomerError(
        error instanceof Error ? error.message : "Unable to create customer user."
      );
    } finally {
      setCustomerPending(false);
    }
  }

  async function handleLoadUsers() {
    setUsersPending(true);
    setUsersError(null);

    try {
      await refreshUsers();
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      setUsersPending(false);
    }
  }

  async function handleRoleChange(userId: string, nextRole: SetupUserRole) {
    setActiveUserId(userId);
    setUsersError(null);

    try {
      await requestSetup<{message: string}>("/api/setup/update-role", {
        body: {
          role: nextRole,
          userId
        },
        method: "POST"
      });

      await refreshUsers();
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Unable to update the user.");
    } finally {
      setActiveUserId(null);
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setActiveUserId(userId);
    setUsersError(null);

    try {
      await requestSetup<{message: string}>("/api/setup/update-role", {
        body: {
          isActive: !isActive,
          userId
        },
        method: "POST"
      });

      await refreshUsers();
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Unable to update the user.");
    } finally {
      setActiveUserId(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    setActiveUserId(userId);
    setUsersError(null);

    try {
      await requestSetup<{message: string}>("/api/setup/delete-user", {
        body: {
          userId
        },
        method: "POST"
      });

      await refreshUsers();
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Unable to delete the user.");
    } finally {
      setActiveUserId(null);
    }
  }

  async function handleTestConnection() {
    setConnectionPending(true);
    setConnectionError(null);
    setConnectionMessage(null);

    try {
      const response = await refreshUsers();
      setConnectionMessage(
        `Supabase connected. Auth users: ${response.counts.authUsersCount}, profiles: ${response.counts.profilesCount}, admin users: ${response.counts.adminUsersCount}.`
      );
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Unable to verify the Supabase connection."
      );
    } finally {
      setConnectionPending(false);
    }
  }

  if (!setupEnabled) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#ead9c8] bg-[#fffaf3] shadow-soft">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#9a6b10]">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-[0.12em]">
                Initial setup only
              </p>
            </div>
            <p className="text-sm leading-6 text-[#6d5936]">
              This page is for initial setup only. Disable it after setup is complete.
            </p>
          </div>
          <div className="rounded-md border border-[#f0d8a2] bg-[#fff3d6] px-4 py-3 text-sm text-[#8a6516]">
            Set <code>SETUP_ENABLED=false</code> after the first super admin is ready.
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#e8e0d0] bg-white shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-[#1c3d2e]">
            <LockKeyhole className="h-5 w-5 text-[#c9a84c]" />
            Setup secret key
          </CardTitle>
          <CardDescription>
            Enter setup secret key to proceed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="setup-secret-key">Secret key</Label>
          <Input
            id="setup-secret-key"
            type="password"
            autoComplete="off"
            className="h-11 border-[#e8e0d0]"
            onChange={(event) => setSecretKey(event.target.value)}
            placeholder="Enter setup secret key"
            value={secretKey}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-[#e8e0d0] bg-white shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1c3d2e]">Create Admin User</CardTitle>
            <CardDescription>
              Create a staff account with a privileged admin role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" noValidate onSubmit={handleCreateAdmin}>
              <div className="space-y-2">
                <Label htmlFor="setup-admin-full-name">Full name</Label>
                <Input
                  id="setup-admin-full-name"
                  className="h-11 border-[#e8e0d0]"
                  onChange={(event) => setAdminFullName(event.target.value)}
                  placeholder="Ada Nwosu"
                  value={adminFullName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-admin-email">Email address</Label>
                <Input
                  id="setup-admin-email"
                  type="email"
                  className="h-11 border-[#e8e0d0]"
                  onChange={(event) => setAdminEmail(event.target.value)}
                  placeholder="admin@aurevia.travel"
                  value={adminEmail}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-admin-password">Password</Label>
                <Input
                  id="setup-admin-password"
                  type="password"
                  className="h-11 border-[#e8e0d0]"
                  onChange={(event) => setAdminPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  value={adminPassword}
                />
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-[#f0ebe0]">
                    <div
                      className={`h-full transition-all ${adminStrength.className}`}
                      style={{width: `${Math.max(8, adminStrength.score * 25)}%`}}
                    />
                  </div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7a9a85]">
                    Strength: {adminStrength.label}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-admin-confirm-password">Confirm password</Label>
                <Input
                  id="setup-admin-confirm-password"
                  type="password"
                  className="h-11 border-[#e8e0d0]"
                  onChange={(event) => setAdminConfirmPassword(event.target.value)}
                  placeholder="Re-enter password"
                  value={adminConfirmPassword}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-admin-role">Role</Label>
                <select
                  id="setup-admin-role"
                  className="flex h-11 w-full rounded-md border border-[#e8e0d0] bg-white px-3 text-sm text-[#1c3d2e] focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  onChange={(event) =>
                    setAdminRole(event.target.value as Exclude<SetupUserRole, "customer">)
                  }
                  value={adminRole}
                >
                  {ADMIN_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.description}
                    </option>
                  ))}
                </select>
              </div>

              {adminError ? (
                <p className="rounded-md border border-[#f1c3c3] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f1d1d]">
                  {adminError}
                </p>
              ) : null}

              {adminMessage ? (
                <p className="rounded-md border border-[#d9e6db] bg-[#f4faf5] px-4 py-3 text-sm text-[#1c3d2e]">
                  {adminMessage}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full bg-[#1c3d2e] text-white hover:bg-[#2a5a40]"
                disabled={adminPending}
              >
                {adminPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating admin user...
                  </>
                ) : (
                  "Create Admin User"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-[#e8e0d0] bg-white shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1c3d2e]">Create Customer User</CardTitle>
            <CardDescription>
              Bootstrap a normal customer account without going through the public flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" noValidate onSubmit={handleCreateCustomer}>
              <div className="space-y-2">
                <Label htmlFor="setup-customer-full-name">Full name</Label>
                <Input
                  id="setup-customer-full-name"
                  className="h-11 border-[#e8e0d0]"
                  onChange={(event) => setCustomerFullName(event.target.value)}
                  placeholder="Tola Ibrahim"
                  value={customerFullName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-customer-email">Email address</Label>
                <Input
                  id="setup-customer-email"
                  type="email"
                  className="h-11 border-[#e8e0d0]"
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="traveler@example.com"
                  value={customerEmail}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-customer-password">Password</Label>
                <Input
                  id="setup-customer-password"
                  type="password"
                  className="h-11 border-[#e8e0d0]"
                  onChange={(event) => setCustomerPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  value={customerPassword}
                />
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-[#f0ebe0]">
                    <div
                      className={`h-full transition-all ${customerStrength.className}`}
                      style={{width: `${Math.max(8, customerStrength.score * 25)}%`}}
                    />
                  </div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7a9a85]">
                    Strength: {customerStrength.label}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-customer-confirm-password">Confirm password</Label>
                <Input
                  id="setup-customer-confirm-password"
                  type="password"
                  className="h-11 border-[#e8e0d0]"
                  onChange={(event) => setCustomerConfirmPassword(event.target.value)}
                  placeholder="Re-enter password"
                  value={customerConfirmPassword}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-customer-phone">Phone number</Label>
                <Input
                  id="setup-customer-phone"
                  className="h-11 border-[#e8e0d0]"
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="+234 800 000 0000"
                  value={customerPhone}
                />
              </div>

              {customerError ? (
                <p className="rounded-md border border-[#f1c3c3] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f1d1d]">
                  {customerError}
                </p>
              ) : null}

              {customerMessage ? (
                <p className="rounded-md border border-[#d9e6db] bg-[#f4faf5] px-4 py-3 text-sm text-[#1c3d2e]">
                  {customerMessage}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full bg-[#2a5a40] text-white hover:bg-[#1f4633]"
                disabled={customerPending}
              >
                {customerPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating customer user...
                  </>
                ) : (
                  "Create Customer User"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#e8e0d0] bg-white shadow-soft">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl text-[#1c3d2e]">Existing Users</CardTitle>
            <CardDescription>
              Load, search, and edit users after verifying the setup secret.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9a85]" />
              <Input
                className="h-11 border-[#e8e0d0] pl-10"
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search name or email"
                value={userSearch}
              />
            </div>
            <select
              className="h-11 min-w-[180px] rounded-md border border-[#e8e0d0] bg-white px-3 text-sm text-[#1c3d2e] focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              onChange={(event) => setRoleFilter(event.target.value as "all" | SetupUserRole)}
              value={roleFilter}
            >
              <option value="all">All roles</option>
              <option value="customer">customer</option>
              <option value="super_admin">super_admin</option>
              <option value="admin">admin</option>
              <option value="agent">agent</option>
              <option value="support">support</option>
            </select>
            <Button
              type="button"
              className="h-11 bg-[#1c3d2e] text-white hover:bg-[#2a5a40]"
              disabled={usersPending}
              onClick={() => void handleLoadUsers()}
            >
              {usersPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load Users"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {usersError ? (
            <p className="rounded-md border border-[#f1c3c3] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f1d1d]">
              {usersError}
            </p>
          ) : null}

          {!usersLoaded ? (
            <div className="rounded-lg border border-dashed border-[#e8e0d0] bg-[#faf7f1] px-6 py-10 text-center text-sm text-[#7a9a85]">
              Secret key required to view users. Press <strong>Load Users</strong> when ready.
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#e8e0d0] bg-[#faf7f1] px-6 py-10 text-center text-sm text-[#7a9a85]">
              No users matched the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#e8e0d0]">
              <table className="min-w-full divide-y divide-[#e8e0d0] text-sm">
                <thead className="bg-[#faf7f1] text-left text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a9a85]">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe0] bg-white">
                  {filteredUsers.map((user) => {
                    const isBusy = activeUserId === user.id;

                    return (
                      <tr key={user.id} className="align-top hover:bg-[#f7f3ec]">
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-[#1c3d2e]">
                              {user.fullName || "Unnamed user"}
                            </p>
                            <p className="text-xs uppercase tracking-[0.12em] text-[#7a9a85]">
                              {user.isActive ? "Active" : "Inactive"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[#4c6655]">{user.email}</td>
                        <td className="px-4 py-4">
                          <select
                            className="h-10 min-w-[150px] rounded-md border border-[#e8e0d0] bg-white px-3 text-sm text-[#1c3d2e] focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
                            disabled={isBusy}
                            onChange={(event) =>
                              void handleRoleChange(user.id, event.target.value as SetupUserRole)
                            }
                            value={user.role}
                          >
                            <option value="customer">customer</option>
                            <option value="super_admin">super_admin</option>
                            <option value="admin">admin</option>
                            <option value="agent">agent</option>
                            <option value="support">support</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 text-[#4c6655]">
                          {formatDate(user.authCreatedAt)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="border-[#e8e0d0] text-[#1c3d2e] hover:bg-[#f7f3ec]"
                              disabled={isBusy}
                              onClick={() => void handleToggleActive(user.id, user.isActive)}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.isActive ? (
                                "Deactivate"
                              ) : (
                                "Reactivate"
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="bg-[#d32222] text-white hover:bg-[#b61d1d]"
                              disabled={isBusy}
                              onClick={() => void handleDeleteUser(user.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#e8e0d0] bg-white shadow-soft">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-2xl text-[#1c3d2e]">
              <ShieldCheck className="h-5 w-5 text-[#c9a84c]" />
              Connection Status
            </CardTitle>
            <CardDescription>
              Validate the Supabase connection and inspect bootstrap counts.
            </CardDescription>
          </div>
          <Button
            type="button"
            className="h-11 bg-[#1c3d2e] text-white hover:bg-[#2a5a40]"
            disabled={connectionPending}
            onClick={() => void handleTestConnection()}
          >
            {connectionPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionError ? (
            <p className="rounded-md border border-[#f1c3c3] bg-[#fff4f4] px-4 py-3 text-sm text-[#9f1d1d]">
              {connectionError}
            </p>
          ) : null}

          {connectionMessage ? (
            <p className="rounded-md border border-[#d9e6db] bg-[#f4faf5] px-4 py-3 text-sm text-[#1c3d2e]">
              {connectionMessage}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#e8e0d0] bg-[#faf7f1] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a9a85]">
                Auth users
              </p>
              <p className="mt-2 text-3xl text-[#1c3d2e]">{counts?.authUsersCount ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-[#e8e0d0] bg-[#faf7f1] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a9a85]">
                Profiles rows
              </p>
              <p className="mt-2 text-3xl text-[#1c3d2e]">{counts?.profilesCount ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-[#e8e0d0] bg-[#faf7f1] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a9a85]">
                Admin users rows
              </p>
              <p className="mt-2 text-3xl text-[#1c3d2e]">{counts?.adminUsersCount ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
