export const dynamic = 'force-dynamic';

import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getDashboardData() {
  const [platformCount, testCaseCount, platforms, results, testCases] = await Promise.all([
    prisma.platform.count(),
    prisma.testCase.count(),
    prisma.platform.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.testResult.findMany({ include: { testCase: { select: { category: true } } } }),
    prisma.testCase.findMany({ select: { category: true } }),
  ]);

  const byStatus = { PASS: 0, FAIL: 0, PARTIAL: 0, "N/A": 0 };
  for (const r of results) {
    if (r.status in byStatus) byStatus[r.status as keyof typeof byStatus]++;
  }

  const categories = [...new Set(testCases.map(t => t.category))].sort();
  const categoryStats = categories.map(cat => {
    const catResults = results.filter(r => r.testCase.category === cat);
    const pass = catResults.filter(r => r.status === "PASS").length;
    const fail = catResults.filter(r => r.status === "FAIL").length;
    const partial = catResults.filter(r => r.status === "PARTIAL").length;
    const na = catResults.filter(r => r.status === "N/A").length;
    const total = catResults.length;
    return { category: cat, pass, fail, partial, na, total };
  });

  const passRate = results.length > 0
    ? Math.round((byStatus.PASS / results.length) * 100)
    : 0;

  return { platformCount, testCaseCount, results: results.length, byStatus, passRate, platforms, categoryStats };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">IPv6 compliance overview across all platforms</p>
        </div>
        <Link href="/platforms" className="btn btn-primary">+ Add Platform</Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Platforms</div>
          <div className="stat-value">{data.platformCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Test Cases</div>
          <div className="stat-value">{data.testCaseCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Results Recorded</div>
          <div className="stat-value">{data.results}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pass Rate</div>
          <div className={`stat-value ${data.passRate >= 80 ? "pass" : data.passRate >= 50 ? "" : "fail"}`}>
            {data.passRate}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">PASS</div>
          <div className="stat-value pass">{data.byStatus.PASS}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">FAIL</div>
          <div className="stat-value fail">{data.byStatus.FAIL}</div>
        </div>
      </div>

      {data.categoryStats.length > 0 && (
        <>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>By Category</h2>
          <div className="table-wrap" style={{ marginBottom: "2rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>PASS</th>
                  <th>FAIL</th>
                  <th>PARTIAL</th>
                  <th>N/A</th>
                  <th>Total Results</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryStats.map(c => (
                  <tr key={c.category}>
                    <td style={{ fontWeight: 500 }}>{c.category}</td>
                    <td><span className="badge badge-PASS">{c.pass}</span></td>
                    <td><span className="badge badge-FAIL">{c.fail}</span></td>
                    <td><span className="badge badge-PARTIAL">{c.partial}</span></td>
                    <td><span className="badge badge-NA">{c.na}</span></td>
                    <td style={{ color: "var(--fg-muted)" }}>{c.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Recent Platforms</h2>
      {data.platforms.length === 0 ? (
        <div className="empty-state">
          No platforms yet. <Link href="/platforms">Add the first one.</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Model</th>
                <th>OS Version</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.platforms.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.vendor}</td>
                  <td>{p.modelName}</td>
                  <td style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.85rem" }}>{p.osVersion}</td>
                  <td style={{ color: "var(--fg-muted)", fontSize: "0.85rem" }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Link href={`/platforms/${p.id}`} className="btn btn-ghost" style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}>
                      View Matrix →
                    </Link>
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
