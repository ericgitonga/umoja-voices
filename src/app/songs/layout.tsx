import { requireSessionOrRedirect } from "@/lib/get-session";

export default async function SongsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSessionOrRedirect();
  return children;
}
