import { getAppVersion } from "@/lib/version";

export default function Footer() {
  const version = getAppVersion();
  return (
    <footer className="mt-auto border-t border-slate-200 py-4 text-center text-xs text-slate-500">
      Umoja Voices &middot; v{version}
    </footer>
  );
}
