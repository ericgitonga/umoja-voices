"use client";

import { useState } from "react";
import MemberRow from "./MemberRow";
import Pagination, { paginate, DEFAULT_PAGE_SIZE, type PageSize } from "@/components/Pagination";

type Member = { id: string; name: string; email: string; role: string; status: string };

export default function MembersList({ members }: { members: Member[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const pageItems = paginate(members, page, pageSize);

  return (
    <>
      <ul className="mt-8 flex flex-col gap-2">
        {pageItems.map((m) => (
          <MemberRow key={m.id} id={m.id} name={m.name} email={m.email} role={m.role} status={m.status} />
        ))}
        {members.length === 0 && <p className="text-sm text-ink/50">No members yet.</p>}
      </ul>
      <Pagination
        totalItems={members.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </>
  );
}
