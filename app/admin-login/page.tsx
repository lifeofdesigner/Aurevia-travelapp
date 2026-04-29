import {redirect} from "next/navigation";
import Image from "next/image";

import {getAdminSession} from "@/lib/auth/admin-auth";
import {defaultLocale} from "@/lib/i18n/routing";
import {AdminLoginForm} from "@/features/admin/components/admin-login-form";
import {getSiteBranding} from "@/server/brand/site-branding";

export default async function AdminLoginPage() {
  const [session, branding] = await Promise.all([
    getAdminSession(),
    getSiteBranding()
  ]);

  if (session) {
    redirect(`/${defaultLocale}/admin`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c3d2e] px-4 py-10">
      <div className="w-full max-w-[420px] rounded-xl bg-white p-10 shadow-[0_32px_90px_rgba(8,22,16,0.28)]">
        <div className="space-y-4 text-center">
          <div className="space-y-2">
            {branding.logoUrl ? (
              <Image
                alt={`${branding.siteName} logo`}
                className="mx-auto h-auto max-h-16 w-auto object-contain"
                height={64}
                priority
                src={branding.logoUrl}
                width={220}
              />
            ) : (
              <h1 className="font-display text-[36px] leading-none text-[#1c3d2e]">
                {branding.siteName}
              </h1>
            )}
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7a9a85]">
              Admin Portal
            </p>
          </div>
          <div className="mx-auto h-px w-16 bg-[#c9a84c]" />
        </div>

        <div className="mt-8">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
