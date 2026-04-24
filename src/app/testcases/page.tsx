export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";

export const metadata = { title: "Test Cases — IPv6 Compliance Tracker" };

export default async function TestCasesPage() {
  const testCases = await prisma.testCase.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { results: true } } },
  });

  const grouped = testCases.reduce<Record<string, typeof testCases>>((acc, tc) => {
    if (!acc[tc.category]) acc[tc.category] = [];
    acc[tc.category].push(tc);
    return acc;
  }, {});

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Cases</h1>
          <p className="page-subtitle">
            {testCases.length} test cases across {Object.keys(grouped).length} categories.
            Seeded from <code>IPv6-compliance-superset.md</code>.
          </p>
        </div>
      </div>

      {testCases.length === 0 ? (
        <div className="empty-state">
          No test cases found. Run <code style={{ background: "var(--border)", padding: "0.1em 0.4em", borderRadius: "4px" }}>npm run seed</code> to load the compliance checklist.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Test Case</th>
                <th>Description</th>
                <th>Results</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([category, cases]) => (
                <>
                  <tr key={`cat-${category}`} className="category-row">
                    <th colSpan={3}>{category}</th>
                  </tr>
                  {cases.map(tc => (
                    <tr key={tc.id}>
                      <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{tc.name}</td>
                      <td className="description-cell">{tc.description}</td>
                      <td style={{ color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
                        {tc._count.results} recorded
                      </td>
                    </tr>
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
