"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/platforms", label: "Platforms" },
  { href: "/testcases", label: "Test Cases" },
  { href: "/admin", label: "Admin" },
];

interface NavProps {
  showLogout?: boolean;
}

export default function Nav({ showLogout = false }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <span className="nav-brand">IPv6 Compliance Tracker</span>
        <div className="nav-links">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link${pathname === href || (href !== "/" && pathname.startsWith(href)) ? " active" : ""}`}
            >
              {label}
            </Link>
          ))}
          {showLogout && (
            <button className="nav-link nav-logout" onClick={handleLogout}>
              Sign out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
