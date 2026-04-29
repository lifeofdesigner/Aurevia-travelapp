"use client";

import {useState} from "react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {type LiveChatDepartment} from "@/lib/live-chat/types";

type PreChatFormProps = {
  departments: LiveChatDepartment[];
  initialEmail: string | null;
  initialName: string | null;
  isOffline: boolean;
  isSending: boolean;
  onStart: (input: {
    departmentId?: string | null;
    email?: string | null;
    message: string;
    name?: string | null;
  }) => Promise<void>;
  requireEmail: boolean;
  welcomeMessage: string;
};

export function PreChatForm({
  departments,
  initialEmail,
  initialName,
  isOffline,
  isSending,
  onStart,
  requireEmail,
  welcomeMessage
}: PreChatFormProps) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [message, setMessage] = useState("");
  const [name, setName] = useState(initialName ?? "");

  return (
    <form
      className="space-y-4 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onStart({
          departmentId: departmentId || null,
          email: email || null,
          message,
          name: name || null
        });
      }}
    >
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-sm leading-6 text-foreground">{welcomeMessage}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {isOffline ? "The team is away, but your message will stay in the queue." : "A support agent will pick this up shortly."}
        </p>
      </div>
      {departments.length > 1 ? (
        <Select
          aria-label="Department"
          onChange={(event) => setDepartmentId(event.target.value)}
          value={departmentId}
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
      ) : null}
      <Input
        autoComplete="name"
        onChange={(event) => setName(event.target.value)}
        placeholder="Name"
        value={name}
      />
      <Input
        autoComplete="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder={requireEmail ? "Email address" : "Email address (optional)"}
        required={requireEmail}
        type="email"
        value={email}
      />
      <Textarea
        className="min-h-[104px]"
        onChange={(event) => setMessage(event.target.value)}
        placeholder="How can we help?"
        required
        value={message}
      />
      <Button className="w-full" disabled={isSending || !message.trim()} type="submit">
        {isSending ? "Sending..." : isOffline ? "Leave message" : "Start chat"}
      </Button>
    </form>
  );
}
