import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPlatformResultMatrix } from "@/lib/result.service";
import ResultCell from "@/components/ResultCell";
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
  const [platform, matrix] = await Promise.all([
    prisma.platform.findUnique({ where: { id } }),
    getPlatformResultMatrix(id),
  ]);

  if (!platform) notFound();

  const resultCount = matrix.filter(m => m.result !== null).length;
  const passCount = matrix.filter(m => m.result?.status === "PASS").length;
  const failCount = matrix.filter(m => m.result?.status === "FAIL").length;
  const pct = matrix.length > 0 ? Math.round((passCount / matrix.length) * 100) : 0;

  // group by category
  const grouped = matrix.reduce<Record<string, typeof matrix>>((acc, item) => {
    const cat = item.testCase.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <Link href="/platforms" style={{ color: "var(--fg-muted)", fontSize: "0.85rem" }}>← Platforms</Link>
          <h1 className="page-title" style={{ marginTop: "0.25rem" }}>
            {platform.vendor} {platform.modelName}
          </h1>
          <p className="page-subtitle">
            {platform.osVersion} &nbsp;·&nbsp; {resultCount} / {matrix.length} test cases recorded
            &nbsp;·&nbsp; {passCount} PASS &nbsp;·&nbsp; {failCount} FAIL &nbsp;·&nbsp; {pct}% pass rate
          </p>
        </div>
        <DeleteButton url={`/api/platforms/${id}`} label="Delete Platform" redirectTo="/platforms" />
      </div>

      {matrix.length === 0 ? (
        <div className="empty-state">
          No test cases found. Run <code>npm run seed</code> to populate from the compliance checklist.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Test Case</th>
                <th>Description</th>
                <th>Status</th>
                <th>Notes / Evidence</th>
                <th>Badge</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([category, items]) => (
                <>
                  <tr key={`cat-${category}`} className="category-row">
                    <th colSpan={6}>{category}</th>
                  </tr>
                  {items.map(({ testCase, result }) => (
                    <ResultCell
                      key={testCase.id}
                      platformId={id}
                      testCase={testCase}
                      result={result}
                    />
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
