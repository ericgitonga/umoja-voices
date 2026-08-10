import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/get-session", () => ({ getSession }));

const { prisma } = vi.hoisted(() => ({
  prisma: { user: { findUnique: vi.fn(), count: vi.fn() } },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const { requireAdmin, orphanAdminsError } = await import("@/lib/actions/member-guards");

function makeSession(role: string, id = "admin-1") {
  return { user: { id, email: "admin@example.com", name: "Admin", role } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAdmin", () => {
  it("returns the session when the signed-in user is an admin", async () => {
    const session = makeSession("admin");
    getSession.mockResolvedValue(session);
    expect(await requireAdmin()).toBe(session);
  });

  it("throws when there is no session", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("Admin access required.");
  });

  it("throws when the signed-in user is not an admin", async () => {
    getSession.mockResolvedValue(makeSession("chorister"));
    await expect(requireAdmin()).rejects.toThrow("Admin access required.");
  });
});

describe("orphanAdminsError", () => {
  it("blocks an admin from changing their own role/status", async () => {
    const session = makeSession("admin", "admin-1");
    const result = await orphanAdminsError(session, "admin-1");
    expect(result).toBe("You can't change your own role or status here — ask another admin.");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("blocks demoting the last active admin", async () => {
    const session = makeSession("admin", "admin-1");
    prisma.user.findUnique.mockResolvedValue({ role: "admin", status: "active" });
    prisma.user.count.mockResolvedValue(0);

    const result = await orphanAdminsError(session, "admin-2");
    expect(result).toBe("Can't remove the last active admin.");
  });

  it("allows demoting an admin when other active admins remain", async () => {
    const session = makeSession("admin", "admin-1");
    prisma.user.findUnique.mockResolvedValue({ role: "admin", status: "active" });
    prisma.user.count.mockResolvedValue(2);

    const result = await orphanAdminsError(session, "admin-2");
    expect(result).toBeNull();
  });

  it("allows changing a non-admin member", async () => {
    const session = makeSession("admin", "admin-1");
    prisma.user.findUnique.mockResolvedValue({ role: "chorister", status: "active" });

    const result = await orphanAdminsError(session, "member-1");
    expect(result).toBeNull();
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it("allows changing an already-inactive admin (not part of the active count)", async () => {
    const session = makeSession("admin", "admin-1");
    prisma.user.findUnique.mockResolvedValue({ role: "admin", status: "disabled" });

    const result = await orphanAdminsError(session, "admin-2");
    expect(result).toBeNull();
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it("allows the action when the target user can't be found", async () => {
    const session = makeSession("admin", "admin-1");
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await orphanAdminsError(session, "missing-user");
    expect(result).toBeNull();
  });

  it("excludes the target itself from the other-active-admins count", async () => {
    const session = makeSession("admin", "admin-1");
    prisma.user.findUnique.mockResolvedValue({ role: "admin", status: "active" });
    prisma.user.count.mockResolvedValue(1);

    await orphanAdminsError(session, "admin-2");
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { role: "admin", status: "active", id: { not: "admin-2" } },
    });
  });
});
