import { prisma } from "@/lib/prisma";
import { clip } from "@/lib/validation";
import type { ActivityAction } from "@/lib/constants";

/**
 * Best-effort: a logging failure must never break the action it's
 * describing, so errors are swallowed here rather than propagated.
 */
export async function logActivity(userLabel: string, action: ActivityAction, detail?: string): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userLabel: clip(userLabel, "name"),
        action,
        detail: detail ? clip(detail, "label") : null,
      },
    });
  } catch (err) {
    console.error("logActivity failed:", err);
  }
}
