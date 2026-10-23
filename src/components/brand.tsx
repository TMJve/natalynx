import Link from "next/link";

export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`font-serif text-[22px] leading-none tracking-[0.01em] text-ink ${className}`}>
      Nata Studio<span className="text-accent">.</span>
    </Link>
  );
}
