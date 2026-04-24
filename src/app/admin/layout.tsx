import Link from "next/link";
import { headers } from "next/headers";

const adminLinks = [
  { href: "/admin/testcases", label: "Test Cases" },
  { href: "/admin/categories", label: "Categories" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authMode = process.env.AUTH_MODE ?? "none";
  // Resolve active path server-side via the x-pathname header set by middleware,
  // or fall back to checking referer. Next.js doesn't expose pathname in layouts directly.
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  return (
    <div className="page-wrapper">
      {authMode === "none" && (
        <div className="admin-warning">
          <strong>Note:</strong> AUTH_MODE is set to &ldquo;none&rdquo; — this admin section is publicly accessible.
          Set AUTH_MODE=cookie or AUTH_MODE=basic to restrict access.
        </div>
      )}
      <div className="admin-header">
        <h1 className="page-title">Admin</h1>
      </div>
      <nav className="admin-subnav">
        {adminLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`admin-subnav-link${pathname.startsWith(href) ? " active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
