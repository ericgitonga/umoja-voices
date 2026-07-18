import { prisma } from "@/lib/prisma";
import InviteForm from "./InviteForm";
import MemberRow from "./MemberRow";

export default async function AdminMembersPage() {
  const members = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Members</h1>

      <InviteForm />

      <ul className="mt-8 flex flex-col gap-2">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            id={m.id}
            name={m.name}
            email={m.email}
            role={m.role}
            status={m.status}
          />
        ))}
      </ul>
    </div>
  );
}
