import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

export function AdminAccessDenied() {
  return (
    <main className="space-y-8">
      <Card className="border-[#e8e0d0] bg-white shadow-soft">
        <CardHeader className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a9a85]">
            Restricted
          </p>
          <CardTitle className="font-display text-4xl italic text-[#1c3d2e]">
            You don&apos;t have access to this section.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-[#56705f]">
            Contact your administrator.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
