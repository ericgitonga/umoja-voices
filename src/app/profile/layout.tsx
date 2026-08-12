import { requireSessionOrRedirect } from "@/lib/get-session";

export default async function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSessionOrRedirect();
  return children;
}
