import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PlatformForm from "@/components/PlatformForm";
import DeleteButton from "@/components/DeleteButton";

export default async function PlatformsPage() {
  const platforms = await prisma.platform.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { results: true } } },
  });

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platforms</h1>
          <p className="page-subtitle">Network hardware under IPv6 compliance evaluation</p>
        </div>
      </div>

      <PlatformForm />

      {platforms.length === 0 ? (
        <div className="empty-state">No platforms yet. Add one above.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Model</th>
                <th>OS / Firmware</th>
                <th>Results</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {platforms.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.vendor}</td>
                  <td>{p.modelName}</td>
                  <td style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.85rem" }}>{p.osVersion}</td>
                  <td style={{ color: "var(--fg-muted)" }}>{p._count.results} recorded</td>
                  <td style={{ color: "var(--fg-muted)", fontSize: "0.85rem" }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="actions">
                      <Link href={`/platforms/${p.id}`} className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}>
                        Compliance Matrix →
                      </Link>
                      <DeleteButton url={`/api/platforms/${p.id}`} label="Delete" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
