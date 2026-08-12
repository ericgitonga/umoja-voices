import { requireSessionOrRedirect } from "@/lib/get-session";

export default async function LogisticsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSessionOrRedirect();
  return children;
}
