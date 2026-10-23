import { SiteHeader } from "@/components/site-header";

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <>
      <SiteHeader home="/portal" />
      {children}
    </>
  );
}
