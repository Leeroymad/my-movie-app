"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Download, Library, User, Clapperboard } from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Browse", icon: Search },
  { href: "/publish", label: "Publish", icon: Clapperboard },
  { href: "/downloads", label: "Files", icon: Download },
  { href: "/watchlist", label: "Library", icon: Library },
  { href: "/profile", label: "Profile", icon: User },
];

export default function MobileNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-t border-white/10 flex justify-around items-center h-16 px-2 pb-safe">
      {links.map(l => {
        const active = path === l.href;
        const Icon = l.icon;
        return (
          <Link key={l.href} href={l.href} className={`flex flex-col items-center gap-0.5 text-[10px] font-medium ${active ? "text-amber-400" : "text-slate-400"}`}>
            <Icon size={20} strokeWidth={2} />
            <span>{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
