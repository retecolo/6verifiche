export const dynamic = 'force-dynamic';

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPlatformResultMatrix } from "@/lib/result.service";
import { getConfigSnapshots } from "@/lib/config.service";
import PlatformComplianceSection from "@/components/PlatformComplianceSection";
import DeleteButton from "@/components/DeleteButton";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const platform = await prisma.platform.findUnique({ where: { id } });
  if (!platform) return { title: "Not Found" };
  return { title: `${platform.vendor} ${platform.modelName} — IPv6 Compliance` };
}

export default async function PlatformDetailPage({ params }: Props) {
  const { id } = await params;
  const [platform, matrix, snapshots] = await Promise.all([
    prisma.platform.findUnique({ where: { id } }),
    getPlatformResultMatrix(id),
    getConfigSnapshots(id),
  ]);

  if (!platform) notFound();

  const resultCount = matrix.filter((m) => m.result !== null).length;
  const passCount = matrix.filter((m) => m.result?.status === "PASS").length;
  const failCount = matrix.filter((m) => m.result?.status === "FAIL").length;
  const pct = matrix.length > 0 ? Math.round((passCount / matrix.length) * 100) : 0;

  const initialSnapshots = snapshots.map((s) => ({
    id: s.id,
    filename: s.filename,
    uploadedAt: s.uploadedAt.toISOString(),
  }));

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <Link href="/platforms" style={{ color: "var(--fg-muted)", fontSize: "0.85rem" }}>
            ← Platforms
          </Link>
          <h1 className="page-title" style={{ marginTop: "0.25rem" }}>
            {platform.vendor} {platform.modelName}
          </h1>
          <p className="page-subtitle">
            {platform.osVersion} &nbsp;·&nbsp; {resultCount} / {matrix.length} test cases recorded
            &nbsp;·&nbsp; {passCount} PASS &nbsp;·&nbsp; {failCount} FAIL &nbsp;·&nbsp; {pct}% pass rate
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a
            href={`/platforms/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Export PDF
          </a>
          <DeleteButton url={`/api/platforms/${id}`} label="Delete Platform" redirectTo="/platforms" />
        </div>
      </div>

      {matrix.length === 0 ? (
        <div className="empty-state">
          No test cases found. Run <code>npm run seed</code> to populate from the compliance checklist.
        </div>
      ) : (
        <PlatformComplianceSection
          platformId={id}
          matrix={matrix}
          initialSnapshots={initialSnapshots}
        />
      )}
    </div>
  );
}
