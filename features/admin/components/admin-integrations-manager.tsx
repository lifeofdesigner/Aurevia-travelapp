"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {type AdminIntegrationsManagerData} from "@/features/admin/lib/control-center-types";

type AdminIntegrationsManagerProps = {
  data: AdminIntegrationsManagerData;
};

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function AdminIntegrationsManager({
  data
}: AdminIntegrationsManagerProps) {
  const router = useRouter();
  const [pendingSaveKey, setPendingSaveKey] = useState<string | null>(null);
  const [pendingTestKey, setPendingTestKey] = useState<string | null>(null);

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>,
    integrationKey: string
  ) {
    event.preventDefault();
    setPendingSaveKey(integrationKey);

    try {
      const formData = new FormData(event.currentTarget);
      const secretValues: Record<string, string> = {};

      for (const [fieldName, value] of formData.entries()) {
        if (fieldName === "environment" || fieldName === "provider") {
          continue;
        }

        if (typeof value === "string") {
          secretValues[fieldName] = value;
        }
      }

      const response = await fetch(`/api/admin/integrations/${integrationKey}`, {
        body: JSON.stringify({
          environment: formData.get("environment"),
          provider: formData.get("provider"),
          secretValues
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "PATCH"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save the integration settings.");
      }

      toast.success("Integration saved", {
        description: "Encrypted credentials and environment settings have been updated."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save integration", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setPendingSaveKey(null);
    }
  }

  async function handleTest(integrationKey: string) {
    setPendingTestKey(integrationKey);

    try {
      const response = await fetch(`/api/admin/integrations/${integrationKey}/test`, {
        method: "POST"
      });
      const payload = (await response.json()) as {message?: string; ok?: boolean};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to verify the connection.");
      }

      if (!payload.ok) {
        throw new Error(payload.message ?? "The provider connection could not be verified.");
      }

      toast.success("Connection tested", {
        description: payload.message ?? "The provider responded successfully."
      });
      router.refresh();
    } catch (error) {
      toast.error("Connection test failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setPendingTestKey(null);
    }
  }

  return (
    <div className="space-y-6">
      {data.items.map((item) => (
        <form
          key={item.key}
          className="rounded-lg border border-border/80 bg-card p-6 shadow-soft"
          onSubmit={(event) => handleSave(event, item.key)}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl italic text-foreground">{item.title}</h2>
                <StatusBadge
                  label={formatStatusLabel(item.status)}
                  status={
                    item.status === "connected"
                      ? "confirmed"
                      : item.status === "failed"
                        ? "failed"
                        : "draft"
                  }
                />
              </div>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                {item.description}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
              <p>Last tested</p>
              <p className="mt-1 font-medium text-foreground">
                {item.lastTestedAt
                  ? new Date(item.lastTestedAt).toLocaleString()
                  : "Not tested yet"}
              </p>
            </div>
          </div>

          {item.lastTestMessage ? (
            <div className="mt-4 rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
              {item.lastTestMessage}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`${item.key}-environment`}>Environment</Label>
              <Select
                defaultValue={item.environment}
                id={`${item.key}-environment`}
                name="environment"
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </Select>
            </div>

            {item.key === "email_delivery" ? (
              <div className="space-y-2">
                <Label htmlFor={`${item.key}-provider`}>Provider</Label>
                <Select
                  defaultValue={item.provider ?? "resend"}
                  id={`${item.key}-provider`}
                  name="provider"
                >
                  <option value="resend">Resend</option>
                  <option value="sendgrid">SendGrid</option>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {item.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`${item.key}-${field.name}`}>{field.label}</Label>
                <Input
                  autoComplete="off"
                  id={`${item.key}-${field.name}`}
                  name={field.name}
                  placeholder={
                    field.maskedValue
                      ? `Saved value ending in ${field.maskedValue}`
                      : field.placeholder
                  }
                  type="password"
                />
                <p className="text-xs text-muted-foreground">
                  {field.maskedValue
                    ? "Existing secret remains unchanged if you leave this blank."
                    : "Stored encrypted after save. Only the last four characters are shown later."}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
              disabled={pendingSaveKey === item.key}
              type="submit"
            >
              {pendingSaveKey === item.key ? "Saving..." : "Save"}
            </Button>
            <Button
              disabled={pendingTestKey === item.key}
              onClick={() => handleTest(item.key)}
              type="button"
              variant="outline"
            >
              {pendingTestKey === item.key ? "Testing..." : "Test connection"}
            </Button>
          </div>
        </form>
      ))}
    </div>
  );
}
