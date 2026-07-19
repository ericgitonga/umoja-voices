import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side exchange for Supabase's invite/recovery email links —
 * token_hash/type based (not the older client-URL auto-detected session),
 * since corporate email scanners (Outlook Safe Links, Defender, etc.)
 * prefetch links and can burn a single-use token before the real user
 * clicks. Supabase's dashboard email templates must point here (see
 * SKILL.md).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  }

  redirect("/login?error=invalid-link");
}
