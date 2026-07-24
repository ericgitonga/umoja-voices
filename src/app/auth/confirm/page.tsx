import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { confirmAuthLink } from "@/lib/actions/auth-actions";

const COPY: Record<string, { heading: string; body: string }> = {
  invite: {
    heading: "You've been invited to Umoja Voices",
    body: "Click Continue to set your password and activate your account.",
  },
  recovery: {
    heading: "Reset your password",
    body: "Click Continue to set a new password.",
  },
};

/**
 * Renders an interstitial rather than verifying immediately on load — #112:
 * invite/reset links are shared manually via WhatsApp (no email delivery
 * yet, see #34), and WhatsApp's own link-preview crawler GETs the URL to
 * build a chat preview card, which used to burn the single-use token before
 * the real recipient ever clicked it. Only the explicit Continue click below
 * (a real form POST) calls verifyOtp now.
 */
export default async function ConfirmAuthLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next = "/" } = await searchParams;

  if (!token_hash || !type) {
    redirect("/login?error=invalid-link");
  }

  const copy = COPY[type as EmailOtpType] ?? { heading: "Continue", body: "Click Continue to proceed." };

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-ink">{copy.heading}</h1>
      <p className="mb-6 text-sm text-ink/60">{copy.body}</p>
      <form action={confirmAuthLink} className="flex flex-col gap-4">
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90">
          Continue
        </button>
      </form>
    </div>
  );
}
