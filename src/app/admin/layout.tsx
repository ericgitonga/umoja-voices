import { requireAdminOrRedirect } from "@/lib/get-session";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminOrRedirect();
  return children;
}
