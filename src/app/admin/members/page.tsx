import { prisma } from "@/lib/prisma";
import InviteForm from "./InviteForm";
import MembersList from "./MembersList";

// This page reads live, admin-editable data — never statically cache it.
export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const members = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Members</h1>

      <InviteForm />

      <MembersList members={members} />
    </div>
  );
}
