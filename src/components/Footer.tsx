import { getAppVersion } from "@/lib/version";

export default function Footer() {
  const version = getAppVersion();
  return (
    <footer className="mt-auto border-t border-black/10 py-4 text-center text-xs text-ink/50">
      Umoja Voices &middot; v{version}
    </footer>
  );
}
