import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clip } from "@/lib/validation";
import { getClientIp } from "@/lib/rate-limit";
import type { ActivityAction } from "@/lib/constants";

export type ActivityEntity = { type: string; label?: string };

/**
 * Best-effort: a logging failure must never break the action it's
 * describing, so errors are swallowed here rather than propagated.
 *
 * IP address and raw User-Agent (#49) are captured here, from `headers()`,
 * rather than threaded through every call site — every caller is already a
 * Server Action, so the request headers are always in scope, and this way
 * every existing call site (login, song create/delete, member role change)
 * started capturing them with no changes of its own needed.
 */
export async function logActivity(
  userLabel: string,
  action: ActivityAction,
  detail?: string,
  entity?: ActivityEntity
): Promise<void> {
  try {
    const requestHeaders = await headers();
    await prisma.activityLog.create({
      data: {
        userLabel: clip(userLabel, "name"),
        action,
        detail: detail ? clip(detail, "label") : null,
        entityType: entity?.type ?? null,
        entityLabel: entity?.label ? clip(entity.label, "label") : null,
        ipAddress: getClientIp(requestHeaders),
        userAgent: clip(requestHeaders.get("user-agent") ?? "", "label") || null,
      },
    });
  } catch (err) {
    console.error("logActivity failed:", err);
  }
}
