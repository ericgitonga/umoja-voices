import { Resend } from "resend";

const APP_NAME = "Umoja Voices";
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Umoja Voices <onboarding@resend.dev>";

let client: Resend | null | undefined;

/** Lazily constructed so a missing RESEND_API_KEY never breaks app startup. */
export function getResendClient(): Resend | null {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  client = apiKey ? new Resend(apiKey) : null;
  return client;
}

/** Base URL for links inside emails/redirects. APP_URL is the canonical
 *  name; NEXTAUTH_URL is read as a fallback for environments that haven't
 *  been updated since the NextAuth-era env var of the same purpose. Neither
 *  is configured for Preview/Development (#116) — VERCEL_URL is Vercel's own
 *  auto-injected per-deployment hostname (set on every environment,
 *  Production included, with zero per-branch config needed), so it's the
 *  next fallback before finally assuming local dev. */
export function appBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Branded HTML email shell — invite/password-reset now go through
 *  Supabase's own SMTP-configured send, but this stays for any future
 *  direct transactional email (e.g. issue #11's practice-session
 *  notifications), sharing the same "Umoja Voices" from-address/branding. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4efe4;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe4;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#1c1c1c;padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">${APP_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#1c1c1c;font-size:14px;line-height:1.6;">
                <h1 style="font-size:18px;margin:0 0 16px;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function emailButton(url: string, label: string): string {
  return `<p style="text-align:center;margin:24px 0;">
    <a href="${url}" style="background-color:#1c1c1c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-size:14px;">${label}</a>
  </p>
  <p style="font-size:12px;color:#666;word-break:break-all;">${url}</p>`;
}

export function resendFromAddress(): string {
  return FROM_ADDRESS;
}
