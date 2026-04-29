"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {toast} from "sonner";

import {ConfirmDialog} from "@/components/shared/feedback/confirm-dialog";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import type {
  AdminResourceField,
  AdminResourceKey,
  AdminResourceRow
} from "@/features/admin/types";

type AdminResourceManagerProps = {
  allowCreate: boolean;
  allowDelete: boolean;
  allowEdit: boolean;
  columns: Array<{
    key: string;
    label: string;
  }>;
  emptyBody: string;
  emptyTitle: string;
  fields: AdminResourceField[];
  resource: AdminResourceKey;
  rows: AdminResourceRow[];
};

type FormStateValue = boolean | string | string[];
type FormState = Record<string, FormStateValue>;

function getStringArrayValue(value: FormStateValue | undefined) {
  return Array.isArray(value) ? value : [];
}

function createInitialFormState(fields: AdminResourceField[], values?: AdminResourceRow["values"]) {
  const state: FormState = {};

  for (const field of fields) {
    const initialValue = values?.[field.name];

    if (field.type === "checkbox") {
      state[field.name] = Boolean(initialValue);
      continue;
    }

    if (field.type === "checkbox-group") {
      state[field.name] = Array.isArray(initialValue)
        ? initialValue.map((entry) => String(entry))
        : [];
      continue;
    }

    if (field.type === "json") {
      state[field.name] =
        initialValue && typeof initialValue === "object"
          ? JSON.stringify(initialValue, null, 2)
          : typeof initialValue === "string"
            ? initialValue
            : initialValue === null || typeof initialValue === "undefined"
              ? ""
              : JSON.stringify(initialValue, null, 2);
      continue;
    }

    if (field.type === "tags") {
      state[field.name] = Array.isArray(initialValue)
        ? initialValue.join(", ")
        : typeof initialValue === "string"
          ? initialValue
          : "";
      continue;
    }

    state[field.name] =
      initialValue === null || typeof initialValue === "undefined"
        ? ""
        : String(initialValue);
  }

  return state;
}

function toRequestValues(fields: AdminResourceField[], formState: FormState) {
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = formState[field.name];

    switch (field.type) {
      case "checkbox":
        values[field.name] = Boolean(rawValue);
        break;
      case "checkbox-group":
        values[field.name] = Array.isArray(rawValue) ? rawValue : [];
        break;
      case "json":
        values[field.name] =
          typeof rawValue === "string" && rawValue.trim().length > 0
            ? JSON.parse(rawValue)
            : {};
        break;
      case "tags":
        values[field.name] =
          typeof rawValue === "string"
            ? rawValue
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean)
            : [];
        break;
      case "number":
        values[field.name] =
          typeof rawValue === "string" && rawValue.length > 0 ? Number(rawValue) : null;
        break;
      default:
        values[field.name] =
          typeof rawValue === "string" && rawValue.length > 0 ? rawValue : null;
    }
  }

  return values;
}

export function AdminResourceManager({
  allowCreate,
  allowDelete,
  allowEdit,
  columns,
  emptyBody,
  emptyTitle,
  fields,
  resource,
  rows
}: AdminResourceManagerProps) {
  const router = useRouter();
  const t = useTranslations("Admin.resources");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [formState, setFormState] = useState<FormState>(createInitialFormState(fields));

  const editingRow = rows.find((row) => row.id === editingRowId) ?? null;

  function resetForm(nextRow?: AdminResourceRow | null) {
    setEditingRowId(nextRow?.id ?? null);
    setFormState(createInitialFormState(fields, nextRow?.values));
  }

  function updateValue(name: string, value: FormStateValue) {
    setFormState((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    try {
      const response = await fetch(`/api/admin/resources/${resource}`, {
        body: JSON.stringify({
          id: editingRowId ?? undefined,
          values: toRequestValues(fields, formState)
        }),
        headers: {"Content-Type": "application/json"},
        method: editingRowId ? "PATCH" : "POST"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? t("saveErrorDescription"));
      }

      toast.success(t("saveSuccessTitle"), {
        description: editingRowId ? t("updatedDescription") : t("createdDescription")
      });
      resetForm(null);
      router.refresh();
    } catch (error) {
      toast.error(t("saveErrorTitle"), {
        description:
          error instanceof Error ? error.message : t("saveErrorDescription")
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete(id: string) {
    setIsPending(true);

    try {
      const response = await fetch(`/api/admin/resources/${resource}`, {
        body: JSON.stringify({id}),
        headers: {"Content-Type": "application/json"},
        method: "DELETE"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? t("deleteErrorDescription"));
      }

      toast.success(t("deleteSuccessTitle"), {
        description: t("deleteSuccessDescription")
      });

      setDeleteRowId(null);

      if (editingRowId === id) {
        resetForm(null);
      }

      router.refresh();
    } catch (error) {
      toast.error(t("deleteErrorTitle"), {
        description:
          error instanceof Error ? error.message : t("deleteErrorDescription")
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">{t("recordsTitle")}</CardTitle>
          {allowCreate ? (
            <Button onClick={() => resetForm(null)} type="button" variant="outline">
              {t("createAction")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-6">
              <h2 className="text-base font-semibold text-foreground">{emptyTitle}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{emptyBody}</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-border/70 text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      {columns.map((column) => (
                        <th key={column.key} className="py-3 pr-4 font-medium">
                          {column.label}
                        </th>
                      ))}
                      <th className="py-3 text-right font-medium">{t("actionsLabel")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        {columns.map((column) => (
                          <td key={column.key} className="py-4 pr-4 align-top text-foreground">
                            {row.cells[column.key] || "—"}
                          </td>
                        ))}
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {allowEdit ? (
                              <Button
                                onClick={() => resetForm(row)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                {t("editAction")}
                              </Button>
                            ) : null}
                            {allowDelete ? (
                              <Button
                                onClick={() => setDeleteRowId(row.id)}
                                size="sm"
                                type="button"
                                variant="destructive"
                              >
                                {t("deleteAction")}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 md:hidden">
                {rows.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <div className="space-y-3">
                      {columns.map((column) => (
                        <div key={column.key}>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {column.label}
                          </p>
                          <p className="mt-1 text-sm text-foreground">{row.cells[column.key] || "—"}</p>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        {allowEdit ? (
                          <Button onClick={() => resetForm(row)} size="sm" type="button" variant="outline">
                            {t("editAction")}
                          </Button>
                        ) : null}
                        {allowDelete ? (
                          <Button
                            onClick={() => setDeleteRowId(row.id)}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            {t("deleteAction")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
        </Card>

        {(allowCreate || allowEdit) ? (
          <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingRow ? t("editFormTitle") : t("createFormTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={`${resource}-${field.name}`}>{field.label}</Label>
                  {"description" in field && field.description ? (
                    <p className="text-xs leading-6 text-muted-foreground">{field.description}</p>
                  ) : null}

                  {field.type === "textarea" || field.type === "json" || field.type === "tags" ? (
                    <Textarea
                      id={`${resource}-${field.name}`}
                      onChange={(event) => updateValue(field.name, event.target.value)}
                      placeholder={"placeholder" in field ? field.placeholder : undefined}
                      required={field.required}
                      value={String(formState[field.name] ?? "")}
                    />
                  ) : null}

                  {field.type === "text" ||
                  field.type === "email" ||
                  field.type === "number" ||
                  field.type === "date" ||
                  field.type === "datetime-local" ? (
                    <Input
                      id={`${resource}-${field.name}`}
                      onChange={(event) => updateValue(field.name, event.target.value)}
                      placeholder={"placeholder" in field ? field.placeholder : undefined}
                      required={field.required}
                      type={field.type}
                      value={String(formState[field.name] ?? "")}
                    />
                  ) : null}

                  {field.type === "select" ? (
                    <Select
                      id={`${resource}-${field.name}`}
                      onChange={(event) => updateValue(field.name, event.target.value)}
                      required={field.required}
                      value={String(formState[field.name] ?? "")}
                    >
                      <option value="">{field.placeholder ?? t("selectPlaceholder")}</option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : null}

                  {field.type === "checkbox" ? (
                    <label className="flex items-center gap-3 text-sm text-foreground">
                      <input
                        checked={Boolean(formState[field.name])}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        id={`${resource}-${field.name}`}
                        onChange={(event) => updateValue(field.name, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{field.label}</span>
                    </label>
                  ) : null}

                  {field.type === "checkbox-group" ? (
                    <div className="grid gap-2 rounded-lg border border-border/80 bg-background/70 p-4">
                      {field.options.map((option) => {
                        const selected = getStringArrayValue(formState[field.name]);
                        const isChecked = selected.includes(option.value);

                        return (
                          <label key={option.value} className="flex items-center gap-3 text-sm text-foreground">
                            <input
                              checked={isChecked}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              onChange={(event) => {
                                const next = new Set(selected);

                                if (event.target.checked) {
                                  next.add(option.value);
                                } else {
                                  next.delete(option.value);
                                }

                                updateValue(field.name, Array.from(next));
                              }}
                              type="checkbox"
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}

              <div className="flex flex-wrap gap-3">
                <Button disabled={isPending} type="submit">
                  {isPending ? t("saving") : editingRow ? t("saveEditAction") : t("saveCreateAction")}
                </Button>
                {editingRow ? (
                  <Button onClick={() => resetForm(null)} type="button" variant="outline">
                    {t("cancelAction")}
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
          </Card>
        ) : null}
      </div>

      {deleteRowId ? (
        <ConfirmDialog
          cancelLabel={t("cancelAction")}
          confirmLabel={t("deleteAction")}
          description={t("deleteConfirm")}
          isPending={isPending}
          onCancel={() => setDeleteRowId(null)}
          onConfirm={() => void handleDelete(deleteRowId)}
          pendingLabel={t("deletingAction")}
          title={t("deleteAction")}
        />
      ) : null}
    </>
  );
}
