import {BarChart3, Clock, MessageCircle, Smile, UserRoundCheck} from "lucide-react";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type LiveChatAnalytics} from "@/lib/live-chat/types";

type AdminLiveChatAnalyticsProps = {
  analytics: LiveChatAnalytics;
};

function valueOrDash(value: number | null, suffix = "") {
  return value === null ? "—" : `${value}${suffix}`;
}

export function AdminLiveChatAnalytics({analytics}: AdminLiveChatAnalyticsProps) {
  const metrics = [
    {icon: MessageCircle, label: "Total conversations", value: analytics.totalConversations},
    {icon: Clock, label: "Open conversations", value: analytics.openConversations},
    {icon: UserRoundCheck, label: "Resolved", value: analytics.resolvedConversations},
    {icon: Smile, label: "CSAT", value: valueOrDash(analytics.csatAverage, "/5")}
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-border/80 bg-card shadow-soft">
              <CardContent className="p-5">
                <Icon aria-hidden="true" className="h-5 w-5 text-accent" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{metric.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricList
          title="Response health"
          rows={[
            ["Average first response", valueOrDash(analytics.averageFirstResponseMinutes, " min")],
            ["Average resolution", valueOrDash(analytics.averageResolutionMinutes, " min")],
            ["Missed chats", analytics.missedChats],
            ["Offline messages", analytics.offlineMessages],
            ["Online agents", analytics.onlineAgents]
          ]}
        />
        <MetricList
          title="Visitors"
          rows={[
            ["New visitors", analytics.newVisitors],
            ["Returning visitors", analytics.returningVisitors]
          ]}
        />
        <MetricList
          title="Top tags"
          rows={analytics.topTags.length ? analytics.topTags.map((tag) => [tag.label, tag.value]) : [["No tags yet", "—"]]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarPanel title="Conversations by day" rows={analytics.conversationsByDay} />
        <BarPanel title="By department" rows={analytics.conversationsByDepartment} />
        <BarPanel title="Agent workload" rows={analytics.agentWorkload.map((row) => ({
          label: row.agent,
          value: row.open + row.resolved
        }))} />
      </div>
    </div>
  );
}

function MetricList({
  rows,
  title
}: {
  rows: Array<[string, number | string]>;
  title: string;
}) {
  return (
    <Card className="border-border/80 bg-card shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BarPanel({
  rows,
  title
}: {
  rows: Array<{label: string; value: number}>;
  title: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <Card className="border-border/80 bg-card shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 aria-hidden="true" className="h-5 w-5 text-accent" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="truncate text-muted-foreground">{row.label}</span>
                <span className="font-semibold text-foreground">{row.value}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{width: `${Math.max(4, (row.value / max) * 100)}%`}}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
