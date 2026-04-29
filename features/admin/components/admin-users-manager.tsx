"use client";

import {Eye, EyeOff, Search, ShieldCheck, UserPlus} from "lucide-react";
import {type FormEvent, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {
  type AdminManagedUserRole,
  type AdminStaffUserRecord,
  type AdminUsersManagerData
} from "@/features/admin/lib/control-center-types";

type AdminUsersManagerProps = {
  currentUserId: string;
  data: AdminUsersManagerData;
};

const ROLE_OPTIONS: Array<{
  description: string;
  label: string;
  value: AdminManagedUserRole;
}> = [
  {
    description: "Regular booking and account access",
    label: "Customer",
    value: "customer"
  },
  {
    description: "Full access to everything",
    label: "Super admin",
    value: "super_admin"
  },
  {
    description: "Operations, content, settings, and reports",
    label: "Admin",
    value: "admin"
  },
  {
    description: "Bookings, customers, support, and visa review",
    label: "Agent",
    value: "agent"
  },
  {
    description: "Support tickets, bookings view, and customers view",
    label: "Support",
    value: "support"
  }
];

const ROLE_VALUES = new Set(ROLE_OPTIONS.map((option) => option.value));

function isManagedRole(value: string): value is AdminManagedUserRole {
  return ROLE_VALUES.has(value as AdminManagedUserRole);
}

function formatRoleLabel(role: AdminManagedUserRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString();
}

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

  const labels = ["Too weak", "Weak", "Fair", "Strong", "Very strong"] as const;
  const colors = [
    "bg-[#ead9c8]",
    "bg-[#d32222]",
    "bg-[#c9a84c]",
    "bg-[#2a5a40]",
    "bg-[#1c3d2e]"
  ] as const;

  return {
    color: colors[score],
    label: labels[score],
    score
  };
}

type ApiPayload = {
  message?: string;
};

export function AdminUsersManager({
  currentUserId,
  data
}: AdminUsersManagerProps) {
  const router = useRouter();
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createRole, setCreateRole] = useState<AdminManagedUserRole>("customer");
  const [createPassword, setCreatePassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminManagedUserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "inactive">("all");

  const passwordStrength = getPasswordStrength(createPassword);
  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return data.users.filter((user) => {
      const matchesSearch = normalizedSearch
        ? `${user.name} ${user.email} ${user.phone ?? ""}`.toLowerCase().includes(normalizedSearch)
        : true;
      const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? user.isActive
            : !user.isActive;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [data.users, roleFilter, searchTerm, statusFilter]);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingCreate(true);

    try {
      const formData = new FormData(event.currentTarget);
      const password = String(formData.get("password") ?? "");
      const confirmPassword = String(formData.get("confirmPassword") ?? "");

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const response = await fetch("/api/admin/users", {
        body: JSON.stringify({
          email: formData.get("email"),
          fullName: formData.get("fullName"),
          password,
          phone: formData.get("phone"),
          role: createRole
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const payload = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to create the user.");
      }

      toast.success("User created", {
        description: `${formatRoleLabel(createRole)} access is ready for this account.`
      });
      event.currentTarget.reset();
      setCreateRole("customer");
      setCreatePassword("");
      router.refresh();
    } catch (error) {
      toast.error("Unable to create user", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setPendingCreate(false);
    }
  }

  async function saveUser(user: AdminStaffUserRecord, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingUserId(user.userId);

    try {
      const formData = new FormData(event.currentTarget);
      const roleValue = user.userId === currentUserId
        ? user.role
        : String(formData.get("role") ?? user.role);

      if (!isManagedRole(roleValue)) {
        throw new Error("Choose a valid role.");
      }

      const isActive = user.userId === currentUserId
        ? true
        : formData.get("isActive") === "on";
      const response = await fetch(`/api/admin/users/${user.userId}`, {
        body: JSON.stringify({
          isActive,
          role: roleValue
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "PATCH"
      });
      const payload = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to update the user.");
      }

      toast.success("User updated", {
        description: "Role and approval status have been saved."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to update user", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Total users" value={data.counts.total} />
        <Metric label="Customers" value={data.counts.customers} />
        <Metric label="Admin staff" value={data.counts.admins} />
        <Metric label="Approved" value={data.counts.active} />
      </div>

      <form
        className="rounded-lg border border-border/80 bg-card p-6 shadow-soft"
        onSubmit={handleCreateUser}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#c9a84c]" aria-hidden="true" />
              <h2 className="font-display text-2xl italic text-foreground">Create user</h2>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Add a customer or staff account with a confirmed email and immediate platform access.
            </p>
          </div>
          <StatusBadge label="super admin only" status="approved" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="create-user-full-name">Full name</Label>
            <Input id="create-user-full-name" name="fullName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-email">Email address</Label>
            <Input id="create-user-email" name="email" required type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-phone">Phone number</Label>
            <Input id="create-user-phone" name="phone" placeholder="Optional for customers" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-role">Role</Label>
            <Select
              id="create-user-role"
              name="role"
              onChange={(event) => {
                if (isManagedRole(event.target.value)) {
                  setCreateRole(event.target.value);
                }
              }}
              value={createRole}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-password">Password</Label>
            <div className="flex gap-2">
              <Input
                id="create-user-password"
                minLength={8}
                name="password"
                onChange={(event) => setCreatePassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
              />
              <Button
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
                type="button"
                variant="outline"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <span
                  className={`block h-full ${passwordStrength.color}`}
                  style={{width: `${Math.max(passwordStrength.score, 1) * 25}%`}}
                />
              </span>
              <span>{passwordStrength.label}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-confirm-password">Confirm password</Label>
            <Input
              id="create-user-confirm-password"
              minLength={8}
              name="confirmPassword"
              required
              type={showPassword ? "text" : "password"}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
            disabled={pendingCreate}
            type="submit"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {pendingCreate ? "Creating..." : "Create approved user"}
          </Button>
        </div>
      </form>

      <section className="rounded-lg border border-border/80 bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="font-display text-2xl italic text-foreground">User directory</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Approve customer login, suspend accounts, and promote or demote staff roles.
            </p>
          </div>
          <StatusBadge
            label={`${data.counts.inactive} inactive`}
            status={data.counts.inactive > 0 ? "pending" : "approved"}
          />
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, or phone"
              value={searchTerm}
            />
          </div>
          <Select
            aria-label="Filter by role"
            onChange={(event) => {
              const value = event.target.value;
              setRoleFilter(value === "all" || isManagedRole(value) ? value : "all");
            }}
            value={roleFilter}
          >
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="active">Approved</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        <div className="mt-6 space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-background/60 p-8 text-center text-sm text-muted-foreground">
              No users match the current filters.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <form
                key={user.userId}
                className="rounded-lg border border-border/80 bg-background/60 p-5"
                onSubmit={(event) => void saveUser(user, event)}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-2xl italic text-foreground">{user.name}</h3>
                      <StatusBadge
                        label={user.isActive ? "approved" : "inactive"}
                        status={user.isActive ? "approved" : "failed"}
                      />
                      <StatusBadge
                        label={user.accountType}
                        status={user.accountType === "admin" ? "published" : "queued"}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Role: {formatRoleLabel(user.role)} | Last login: {formatDate(user.lastLoginAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Joined: {formatDate(user.createdAt)}
                      {user.phone ? ` | Phone: ${user.phone}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_0.9fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor={`managed-user-role-${user.userId}`}>Role</Label>
                    <Select
                      defaultValue={user.role}
                      disabled={user.userId === currentUserId}
                      id={`managed-user-role-${user.userId}`}
                      name="role"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Approval status</Label>
                    <label className="flex min-h-[40px] items-center gap-3 rounded-lg border border-border/80 bg-card px-4 py-3 text-sm text-foreground">
                      <input
                        defaultChecked={user.isActive}
                        disabled={user.userId === currentUserId}
                        name="isActive"
                        type="checkbox"
                      />
                      <span>
                        {user.isActive
                          ? "Approved for login"
                          : "Login disabled until approved"}
                      </span>
                    </label>
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                      disabled={pendingUserId === user.userId}
                      type="submit"
                    >
                      {pendingUserId === user.userId ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </div>

                {user.userId === currentUserId ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Your own super admin access cannot be disabled or downgraded from this screen.
                  </p>
                ) : null}
              </form>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({label, value}: {label: string; value: number}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-display text-3xl italic text-foreground">{value}</p>
    </div>
  );
}
