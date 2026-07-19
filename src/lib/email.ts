import { Resend } from "resend";

const APP_NAME = "Umoja Voices";
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Umoja Voices <onboarding@resend.dev>";

let client: Resend | null | undefined;

/** Lazily constructed so a missing RESEND_API_KEY never breaks app startup —
 *  invite/reset flows fall back to returning the link on-screen instead. */
function getClient(): Resend | null {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  client = apiKey ? new Resend(apiKey) : null;
  return client;
}

/** Base URL for links inside emails — same env var NextAuth itself reads. */
export function appBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

/** Sync check for whether Resend is configured — lets a caller decide to
 *  fire off a send without awaiting it (see requestPasswordReset, which
 *  can't afford the network-latency variance in its timing-safe path). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function layout(title: string, bodyHtml: string): string {
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

function button(url: string, label: string): string {
  return `<p style="text-align:center;margin:24px 0;">
    <a href="${url}" style="background-color:#1c1c1c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-size:14px;">${label}</a>
  </p>
  <p style="font-size:12px;color:#666;word-break:break-all;">${url}</p>`;
}

/** Sends the invite email; returns whether it was actually sent (false if
 *  RESEND_API_KEY isn't configured, or the send failed). */
export async function sendInviteEmail(opts: { to: string; name: string; inviteUrl: string }): Promise<boolean> {
  const resend = getClient();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping invite email, falling back to on-screen link.");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: `You're invited to join ${APP_NAME}`,
      html: layout(
        `You're invited to join ${APP_NAME}`,
        `<p>Hi ${opts.name},</p>
         <p>An admin has invited you to join ${APP_NAME}. Click below to set your password and get started.</p>
         ${button(opts.inviteUrl, "Accept invite")}
         <p style="color:#888;">This link expires in 7 days. If you weren't expecting this, you can ignore this email.</p>`
      ),
    });
    if (error) {
      console.error("Resend invite email failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend invite email failed:", err);
    return false;
  }
}

/** Sends the password-reset email; returns whether it was actually sent. */
export async function sendPasswordResetEmail(opts: { to: string; resetUrl: string }): Promise<boolean> {
  const resend = getClient();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping reset email, falling back to on-screen link.");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: `Reset your ${APP_NAME} password`,
      html: layout(
        "Reset your password",
        `<p>We received a request to reset your ${APP_NAME} password. Click below to choose a new one.</p>
         ${button(opts.resetUrl, "Reset password")}
         <p style="color:#888;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>`
      ),
    });
    if (error) {
      console.error("Resend password-reset email failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend password-reset email failed:", err);
    return false;
  }
}
