import {SetupTool} from "@/features/admin/components/setup-tool";
import {getSiteBranding} from "@/server/brand/site-branding";
import {getSetupRuntimeConfig} from "@/server/setup/config";

function SetupDisabledState({
  body,
  siteName,
  title
}: {
  body: string;
  siteName: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#f7f3ec] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-[10px] border border-[#e8e0d0] bg-white p-10 shadow-soft">
        <div className="space-y-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a9a85]">
            Setup Tool
          </p>
          <h1 className="font-display text-5xl italic text-[#1c3d2e]">
            {siteName} - Setup Tool
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[#4c6655]">{title}</p>
          <div className="rounded-lg border border-[#f0d8a2] bg-[#fff3d6] px-6 py-4 text-sm text-[#8a6516]">
            {body}
          </div>
        </div>
      </div>
    </main>
  );
}

export default async function SetupPage() {
  const config = getSetupRuntimeConfig();
  const branding = await getSiteBranding();

  if (!config.enabled) {
    return (
      <SetupDisabledState
        siteName={branding.siteName}
        title="Setup is disabled."
        body="Set SETUP_ENABLED=true to re-enable."
      />
    );
  }

  if (!config.hasSecret) {
    return (
      <SetupDisabledState
        siteName={branding.siteName}
        title="Setup secret key is missing."
        body="Add SETUP_SECRET_KEY to .env.local before using the setup tool."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-4 py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4 rounded-[10px] border border-[#e8e0d0] bg-white p-8 shadow-soft">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a9a85]">
              Setup Tool
            </p>
            <h1 className="font-display text-5xl italic text-[#1c3d2e]">
              {branding.siteName} - Setup Tool
            </h1>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-[#4c6655]">
            Create users and assign roles. This bootstrap surface bypasses the normal
            customer and admin login flows, so keep it enabled only for initial setup.
          </p>
        </header>

        <SetupTool setupEnabled={config.canUseSetup} />
      </div>
    </main>
  );
}
