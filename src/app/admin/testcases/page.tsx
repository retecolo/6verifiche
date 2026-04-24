export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAllTestCases } from "@/lib/testcase.service";
import DeleteButton from "@/components/DeleteButton";

export default async function AdminTestCasesPage() {
  const testCases = await getAllTestCases();

  const grouped = testCases.reduce<Record<string, typeof testCases>>((acc, tc) => {
    (acc[tc.category] ??= []).push(tc);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header" style={{ marginTop: "1.5rem" }}>
        <div>
          <h2 className="page-title" style={{ fontSize: "1.1rem" }}>Test Cases</h2>
          <p className="page-subtitle">{testCases.length} total</p>
        </div>
        <Link href="/admin/testcases/new" className="btn btn-primary">+ New Test Case</Link>
      </div>

      {testCases.length === 0 ? (
        <div className="empty-state">No test cases yet. <Link href="/admin/testcases/new">Add one</Link> or run the seed script.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Severity</th>
                <th>RFC</th>
                <th>Tags</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([cat, items]) => (
                <>
                  <tr key={`cat-${cat}`} className="category-row">
                    <th colSpan={5}>{cat}</th>
                  </tr>
                  {items.map((tc) => (
                    <tr key={tc.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{tc.name}</div>
                        <div className="description-cell" style={{ marginTop: "0.2rem" }}>{tc.description}</div>
                      </td>
                      <td><span className={`badge badge-${tc.severity === "MANDATORY" ? "FAIL" : tc.severity === "RECOMMENDED" ? "PARTIAL" : "NA"}`}>{tc.severity}</span></td>
                      <td style={{ fontSize: "0.8rem", color: "var(--fg-muted)" }}>{tc.rfcReference ?? "—"}</td>
                      <td style={{ fontSize: "0.8rem" }}>{tc.tags.join(", ") || "—"}</td>
                      <td>
                        <div className="actions">
                          <Link href={`/admin/testcases/${tc.id}/edit`} className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}>Edit</Link>
                          <DeleteButton url={`/api/testcases/${tc.id}`} label="Delete" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
