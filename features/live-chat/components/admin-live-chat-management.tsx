"use client";

import {Bot, Building2, MessageSquareQuote, Save, UserPlus} from "lucide-react";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {type AdminSelectOption} from "@/features/admin/types";
import {
  type LiveChatAdminBootstrap,
  type LiveChatAgent,
  type LiveChatCannedResponse,
  type LiveChatDepartment,
  type LiveChatSettings
} from "@/lib/live-chat/types";

async function submitJson(path: string, method: "PATCH" | "POST", body: unknown) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: {"Content-Type": "application/json"},
    method
  });
  const payload = (await response.json()) as {message?: string};

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to save changes.");
  }
}

function useSaveToast() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function save(key: string, action: () => Promise<void>) {
    setPending(key);

    try {
      await action();
      toast.success("Saved", {
        description: "Live chat changes have been stored."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setPending(null);
    }
  }

  return {pending, save};
}

export function AdminLiveChatAgentsManager({
  adminUsers,
  data
}: {
  adminUsers: AdminSelectOption[];
  data: LiveChatAdminBootstrap;
}) {
  const {pending, save} = useSaveToast();
  const [selectedUserId, setSelectedUserId] = useState(adminUsers[0]?.value ?? "");
  const selectedUser = adminUsers.find((user) => user.value === selectedUserId);

  function agentPayload(formData: FormData, existing?: LiveChatAgent) {
    const departmentIds = data.departments
      .filter((department) => formData.get(`department-${department.id}`) === "on")
      .map((department) => department.id);

    return {
      avatarUrl: null,
      canManageAgents: formData.get("canManageAgents") === "on",
      canManageSettings: formData.get("canManageSettings") === "on",
      canViewAllChats: formData.get("canViewAllChats") === "on",
      departmentIds,
      displayName: String(formData.get("displayName") ?? existing?.displayName ?? ""),
      email: String(formData.get("email") ?? existing?.email ?? ""),
      isActive: formData.get("isActive") === "on",
      maxActiveChats: Number(formData.get("maxActiveChats") ?? existing?.maxActiveChats ?? 5),
      role: String(formData.get("role") ?? existing?.role ?? "agent"),
      status: String(formData.get("status") ?? existing?.status ?? "offline"),
      userId: String(formData.get("userId") ?? existing?.userId ?? "")
    };
  }

  return (
    <div className="space-y-6">
      <form
        className="rounded-lg border border-border/80 bg-card p-5 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void save("new-agent", () => submitJson("/api/admin/live-chat/agents", "POST", agentPayload(formData)));
        }}
      >
        <div className="flex items-center gap-2">
          <UserPlus aria-hidden="true" className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Add support agent</h2>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-agent-user">Existing admin user</Label>
            <Select
              id="new-agent-user"
              name="userId"
              onChange={(event) => {
                setSelectedUserId(event.target.value);
                const selected = adminUsers.find((item) => item.value === event.target.value);
                const email = selected?.label.match(/\(([^)]+)\)/)?.[1];
                const form = event.currentTarget.form;
                if (form && selected) {
                  const displayName = form.elements.namedItem("displayName") as HTMLInputElement | null;
                  const emailInput = form.elements.namedItem("email") as HTMLInputElement | null;
                  if (displayName) displayName.value = selected.label.replace(/\s\([^)]+\)$/, "");
                  if (emailInput && email) emailInput.value = email;
                }
              }}
              value={selectedUserId}
            >
              {adminUsers.map((user) => (
                <option key={user.value} value={user.value}>
                  {user.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-agent-name">Display name</Label>
            <Input id="new-agent-name" name="displayName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-agent-email">Email</Label>
            <Input id="new-agent-email" name="email" required type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-agent-role">Role</Label>
            <Select id="new-agent-role" name="role" defaultValue="agent">
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="agent">Agent</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-agent-max">Max active chats</Label>
            <Input defaultValue={5} id="new-agent-max" min={1} name="maxActiveChats" type="number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-agent-status">Status</Label>
            <Select defaultValue="offline" id="new-agent-status" name="status">
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </Select>
          </div>
        </div>
        <fieldset className="mt-5 grid gap-3 md:grid-cols-2">
          {data.departments.map((department) => (
            <label key={department.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <input name={`department-${department.id}`} type="checkbox" />
              {department.name}
            </label>
          ))}
        </fieldset>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["isActive", "Active"],
            ["canViewAllChats", "View all chats"],
            ["canManageSettings", "Manage settings"],
            ["canManageAgents", "Manage agents"]
          ].map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <input defaultChecked={name === "isActive"} name={name} type="checkbox" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-5">
          <Button disabled={pending === "new-agent" || !selectedUser?.value} type="submit">
            <Save aria-hidden="true" className="h-4 w-4" />
            Save agent
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {data.agents.map((agent) => (
          <form
            key={agent.id}
            className="rounded-lg border border-border/80 bg-card p-5 shadow-soft"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              void save(agent.id, () =>
                submitJson(`/api/admin/live-chat/agents/${agent.id}`, "PATCH", agentPayload(formData, agent))
              );
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{agent.displayName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{agent.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={agent.role} status={agent.role} />
                <StatusBadge label={agent.status} status={agent.status} />
              </div>
            </div>
            <input name="userId" type="hidden" value={agent.userId} />
            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              <Input name="displayName" defaultValue={agent.displayName} />
              <Input name="email" defaultValue={agent.email} type="email" />
              <Select name="role" defaultValue={agent.role}>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="agent">Agent</option>
              </Select>
              <Input name="maxActiveChats" defaultValue={agent.maxActiveChats} min={1} type="number" />
            </div>
            <fieldset className="mt-5 grid gap-3 md:grid-cols-3">
              {data.departments.map((department) => (
                <label key={department.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <input defaultChecked={agent.departmentIds.includes(department.id)} name={`department-${department.id}`} type="checkbox" />
                  {department.name}
                </label>
              ))}
            </fieldset>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              <Select name="status" defaultValue={agent.status}>
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </Select>
              {[
                ["isActive", "Active", agent.isActive],
                ["canViewAllChats", "View all", agent.canViewAllChats],
                ["canManageSettings", "Settings", agent.canManageSettings],
                ["canManageAgents", "Agents", agent.canManageAgents]
              ].map(([name, label, checked]) => (
                <label key={String(name)} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <input defaultChecked={Boolean(checked)} name={String(name)} type="checkbox" />
                  {label}
                </label>
              ))}
            </div>
            <Button className="mt-5" disabled={pending === agent.id} type="submit">
              {pending === agent.id ? "Saving..." : "Save changes"}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}

export function AdminLiveChatDepartmentsManager({departments}: {departments: LiveChatDepartment[]}) {
  const {pending, save} = useSaveToast();

  function payload(formData: FormData) {
    return {
      description: String(formData.get("description") ?? ""),
      isActive: formData.get("isActive") === "on",
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0)
    };
  }

  return (
    <div className="space-y-4">
      {[null, ...departments].map((department) => (
        <form
          key={department?.id ?? "new"}
          className="rounded-lg border border-border/80 bg-card p-5 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const key = department?.id ?? "new";
            void save(key, () =>
              submitJson(
                department ? `/api/admin/live-chat/departments/${department.id}` : "/api/admin/live-chat/departments",
                department ? "PATCH" : "POST",
                payload(formData)
              )
            );
          }}
        >
          <div className="flex items-center gap-2">
            <Building2 aria-hidden="true" className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">{department ? department.name : "New department"}</h2>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_120px_auto]">
            <Input name="name" defaultValue={department?.name ?? ""} placeholder="Name" required />
            <Input name="slug" defaultValue={department?.slug ?? ""} placeholder="slug" required />
            <Input name="sortOrder" defaultValue={department?.sortOrder ?? 0} type="number" />
            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <input defaultChecked={department?.isActive ?? true} name="isActive" type="checkbox" />
              Active
            </label>
          </div>
          <Textarea className="mt-4 min-h-[80px]" name="description" defaultValue={department?.description ?? ""} placeholder="Description" />
          <Button className="mt-4" disabled={pending === (department?.id ?? "new")} type="submit">
            Save department
          </Button>
        </form>
      ))}
    </div>
  );
}

export function AdminLiveChatCannedResponsesManager({
  data
}: {
  data: LiveChatAdminBootstrap;
}) {
  const {pending, save} = useSaveToast();

  function payload(formData: FormData) {
    return {
      body: String(formData.get("body") ?? ""),
      departmentId: String(formData.get("departmentId") || "") || null,
      isActive: formData.get("isActive") === "on",
      shortcut: String(formData.get("shortcut") || "") || null,
      title: String(formData.get("title") ?? "")
    };
  }

  const rows: Array<LiveChatCannedResponse | null> = [null, ...data.cannedResponses];

  return (
    <div className="space-y-4">
      {rows.map((response) => (
        <form
          key={response?.id ?? "new"}
          className="rounded-lg border border-border/80 bg-card p-5 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const key = response?.id ?? "new";
            void save(key, () =>
              submitJson(
                response ? `/api/admin/live-chat/canned-responses/${response.id}` : "/api/admin/live-chat/canned-responses",
                response ? "PATCH" : "POST",
                payload(formData)
              )
            );
          }}
        >
          <div className="flex items-center gap-2">
            <MessageSquareQuote aria-hidden="true" className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">{response ? response.title : "New canned response"}</h2>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_160px_1fr_auto]">
            <Input name="title" defaultValue={response?.title ?? ""} placeholder="Title" required />
            <Input name="shortcut" defaultValue={response?.shortcut ?? ""} placeholder="/shortcut" />
            <Select name="departmentId" defaultValue={response?.departmentId ?? ""}>
              <option value="">All departments</option>
              {data.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <input defaultChecked={response?.isActive ?? true} name="isActive" type="checkbox" />
              Active
            </label>
          </div>
          <Textarea className="mt-4 min-h-[120px]" name="body" defaultValue={response?.body ?? ""} placeholder="Response text" required />
          <Button className="mt-4" disabled={pending === (response?.id ?? "new")} type="submit">
            Save response
          </Button>
        </form>
      ))}
    </div>
  );
}

export function AdminLiveChatSettingsManager({
  departments,
  settings
}: {
  departments: LiveChatDepartment[];
  settings: LiveChatSettings;
}) {
  const {pending, save} = useSaveToast();

  return (
    <form
      className="rounded-lg border border-border/80 bg-card p-5 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = {
          aiAutoReplyEnabled: formData.get("aiAutoReplyEnabled") === "on",
          aiEnabled: formData.get("aiEnabled") === "on",
          aiHandoffRequired: formData.get("aiHandoffRequired") === "on",
          aiSuggestionsEnabled: formData.get("aiSuggestionsEnabled") === "on",
          allowAttachments: formData.get("allowAttachments") === "on",
          autoAssignmentEnabled: formData.get("autoAssignmentEnabled") === "on",
          brandColor: String(formData.get("brandColor") ?? settings.brandColor),
          browserNotificationsEnabled: formData.get("browserNotificationsEnabled") === "on",
          businessHoursEnabled: formData.get("businessHoursEnabled") === "on",
          csatEnabled: formData.get("csatEnabled") === "on",
          dataRetentionDays: Number(formData.get("dataRetentionDays") ?? settings.typicalReplyMinutes),
          defaultDepartmentId: String(formData.get("defaultDepartmentId") || "") || null,
          maxAttachmentSizeMb: Number(formData.get("maxAttachmentSizeMb") ?? settings.maxAttachmentSizeMb),
          offlineMessage: String(formData.get("offlineMessage") ?? settings.offlineMessage),
          proactiveChatEnabled: formData.get("proactiveChatEnabled") === "on",
          requirePrechatEmail: formData.get("requirePrechatEmail") === "on",
          soundEnabled: formData.get("soundEnabled") === "on",
          transcriptEnabled: formData.get("transcriptEnabled") === "on",
          typicalReplyMinutes: Number(formData.get("typicalReplyMinutes") ?? settings.typicalReplyMinutes),
          welcomeMessage: String(formData.get("welcomeMessage") ?? settings.welcomeMessage),
          widgetEnabled: formData.get("widgetEnabled") === "on",
          widgetPosition: String(formData.get("widgetPosition") ?? settings.widgetPosition)
        };
        void save("settings", () => submitJson("/api/admin/live-chat/settings", "PATCH", payload));
      }}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="welcomeMessage">Welcome message</Label>
          <Textarea id="welcomeMessage" name="welcomeMessage" defaultValue={settings.welcomeMessage} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="offlineMessage">Offline message</Label>
          <Textarea id="offlineMessage" name="offlineMessage" defaultValue={settings.offlineMessage} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultDepartmentId">Default department</Label>
          <Select id="defaultDepartmentId" name="defaultDepartmentId" defaultValue={settings.defaultDepartmentId ?? ""}>
            <option value="">None</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input aria-label="Brand color" name="brandColor" defaultValue={settings.brandColor} />
          <Input aria-label="Attachment size" name="maxAttachmentSizeMb" defaultValue={settings.maxAttachmentSizeMb} min={1} type="number" />
          <Input aria-label="Reply minutes" name="typicalReplyMinutes" defaultValue={settings.typicalReplyMinutes} min={1} type="number" />
        </div>
        <Select name="widgetPosition" defaultValue={settings.widgetPosition}>
          <option value="bottom-right">Bottom right</option>
          <option value="bottom-left">Bottom left</option>
        </Select>
        <Input name="dataRetentionDays" defaultValue={365} min={30} type="number" />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ["widgetEnabled", "Widget enabled", settings.widgetEnabled],
          ["requirePrechatEmail", "Require email", settings.requirePrechatEmail],
          ["allowAttachments", "Attachments", settings.allowAttachments],
          ["soundEnabled", "Sound", settings.soundEnabled],
          ["browserNotificationsEnabled", "Browser notifications", settings.browserNotificationsEnabled],
          ["businessHoursEnabled", "Business hours", settings.businessHoursEnabled],
          ["autoAssignmentEnabled", "Auto assignment", settings.autoAssignmentEnabled],
          ["proactiveChatEnabled", "Proactive chat", settings.proactiveChatEnabled],
          ["csatEnabled", "CSAT", settings.csatEnabled],
          ["transcriptEnabled", "Transcripts", settings.transcriptEnabled],
          ["aiEnabled", "AI enabled", settings.aiEnabled],
          ["aiSuggestionsEnabled", "AI suggestions", settings.aiSuggestionsEnabled],
          ["aiAutoReplyEnabled", "AI auto reply", false],
          ["aiHandoffRequired", "AI handoff required", true]
        ].map(([name, label, checked]) => (
          <label key={String(name)} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input defaultChecked={Boolean(checked)} name={String(name)} type="checkbox" />
            {label}
          </label>
        ))}
      </div>
      {!settings.aiEnabled ? (
        <div className="mt-5 flex items-center gap-2 rounded-md border border-border bg-muted/60 p-3 text-sm text-muted-foreground">
          <Bot aria-hidden="true" className="h-4 w-4 text-accent" />
          AI suggestions unavailable until configured.
        </div>
      ) : null}
      <Button className="mt-6" disabled={pending === "settings"} type="submit">
        Save settings
      </Button>
    </form>
  );
}

export function AdminLiveChatAutomationManager() {
  const {pending, save} = useSaveToast();

  return (
    <form
      className="rounded-lg border border-border/80 bg-card p-5 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const tags = String(formData.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        const keywords = String(formData.get("keywords") ?? "")
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean);
        void save("automation", () =>
          submitJson("/api/admin/live-chat/automation", "POST", {
            actions: {tags},
            conditions: {keywords},
            isActive: formData.get("isActive") === "on",
            name: String(formData.get("name") ?? ""),
            priority: Number(formData.get("priority") ?? 100),
            triggerType: String(formData.get("triggerType") ?? "keyword")
          })
        );
      }}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Input name="name" placeholder="Rule name" required />
        <Select name="triggerType" defaultValue="keyword">
          <option value="keyword">Keyword</option>
          <option value="new_conversation">New conversation</option>
          <option value="offline">Offline</option>
          <option value="no_agent_available">No agent available</option>
          <option value="time_waiting">Time waiting</option>
          <option value="page_visit">Page visit</option>
          <option value="first_message">First message</option>
        </Select>
        <Input name="keywords" placeholder="keywords, separated, by comma" />
        <Input name="tags" placeholder="tags to add, comma separated" />
        <Input name="priority" defaultValue={100} min={1} type="number" />
        <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <input defaultChecked name="isActive" type="checkbox" />
          Active
        </label>
      </div>
      <Button className="mt-5" disabled={pending === "automation"} type="submit">
        Save rule
      </Button>
    </form>
  );
}
