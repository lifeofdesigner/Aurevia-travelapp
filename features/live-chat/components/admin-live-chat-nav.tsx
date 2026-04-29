import Link from "next/link";

import {Button} from "@/components/ui/button";
import {type Locale} from "@/lib/i18n/routing";

const items = [
  ["Inbox", "inbox"],
  ["Agents", "agents"],
  ["Departments", "departments"],
  ["Canned", "canned-responses"],
  ["Automation", "automation"],
  ["Settings", "settings"],
  ["Analytics", "analytics"]
] as const;

export function AdminLiveChatNav({locale}: {locale: Locale}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([label, path]) => (
        <Button key={path} asChild size="sm" variant="outline">
          <Link href={`/${locale}/admin/live-chat/${path}`}>{label}</Link>
        </Button>
      ))}
    </div>
  );
}
