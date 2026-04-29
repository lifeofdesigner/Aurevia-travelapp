import Image from "next/image";

import {AdminForgotPasswordForm} from "@/features/admin/components/admin-forgot-password-form";
import {getSiteBranding} from "@/server/brand/site-branding";

export default async function AdminForgotPasswordPage() {
  const branding = await getSiteBranding();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c3d2e] px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[10px] bg-white p-10 shadow-[0_32px_90px_rgba(8,22,16,0.28)]">
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
              Admin Password Reset
            </p>
          </div>
          <div className="mx-auto h-px w-16 bg-[#c9a84c]" />
          <p className="text-sm leading-6 text-[#5d7364]">
            Enter the admin email address and we&apos;ll send a secure password reset link.
          </p>
        </div>

        <div className="mt-8">
          <AdminForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
