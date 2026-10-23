"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApproveIcon, FeedIcon, FolderIcon, HomeIcon } from "@/components/icons";

export function ProjectNav({ projectId, pendingApprovals }: { projectId: string; pendingApprovals: number }) {
  const pathname = usePathname();
  const base = `/portal/${projectId}`;
  const items = [
    { href: base, label: "Overview", Icon: HomeIcon },
    { href: `${base}/updates`, label: "Updates", Icon: FeedIcon },
    { href: `${base}/approvals`, label: "Approvals", Icon: ApproveIcon, badge: pendingApprovals },
    { href: `${base}/files`, label: "Files", Icon: FolderIcon },
  ];

  return (
    <nav
      aria-label="Project"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map(({ href, label, Icon, badge }) => {
          const active = href === base ? pathname === base : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  active ? "text-ink" : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                <span className="relative">
                  <Icon />
                  {badge ? (
                    <span className="absolute -top-1 -right-2 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-4 font-medium text-white">
                      {badge}
                    </span>
                  ) : null}
                </span>
                {label}
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
