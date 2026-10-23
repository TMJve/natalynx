import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <SiteHeader home="/admin">
        <Link href="/admin/projects/new" className="btn-primary min-h-9 px-4 text-xs">
          New project
        </Link>
      </SiteHeader>
      <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-20 sm:px-6">{children}</main>
    </>
  );
}
