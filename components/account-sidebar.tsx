"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const accountSections = [
  { href: "/profile", label: "Profile" },
  { href: "/statistics/overall", label: "Statistics" },
  { href: "/settings", label: "Settings" },
] as const;

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="account-sidebar" aria-label="Account sections">
      <nav className="account-sidebar-nav">
        {accountSections.map((section) => {
          const isActive = section.href === "/statistics/overall"
            ? pathname === "/statistics" || pathname.startsWith("/statistics/")
            : pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`account-nav-link${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
