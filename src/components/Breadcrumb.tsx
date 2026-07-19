import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-ink/50">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-ink/30">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-ink hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
