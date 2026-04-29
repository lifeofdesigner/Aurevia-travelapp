type EmailShellInput = {
  bodyHtml: string;
  footerText: string;
  title: string;
};

export function getEmailBrandName(footerText: string) {
  return footerText.split("|")[0]?.trim() || "Aurevia Travel";
}

export function buildEmailShell({
  bodyHtml,
  footerText,
  title
}: EmailShellInput) {
  const brandName = getEmailBrandName(footerText);

  return `
    <div style="background:#f7f3ec;padding:32px 16px;font-family:Manrope,Arial,sans-serif;color:#1c3d2e;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d0;border-radius:8px;overflow:hidden;">
        <div style="background:#1c3d2e;padding:24px 28px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a84c;">${brandName}</p>
          <h1 style="margin:10px 0 0;font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:32px;line-height:1.1;color:#f5f0e8;">
            ${title}
          </h1>
        </div>
        <div style="padding:28px;">
          ${bodyHtml}
        </div>
        <div style="border-top:1px solid #e8e0d0;padding:18px 28px;background:#f0ebe0;">
          <p style="margin:0;font-size:12px;line-height:1.7;color:#56705f;">
            ${footerText}
          </p>
        </div>
      </div>
    </div>
  `;
}
