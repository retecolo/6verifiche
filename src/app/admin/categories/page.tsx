export const dynamic = "force-dynamic";

import { getCategoryCounts } from "@/lib/testcase.service";
import CategoryRenameRow from "@/components/CategoryRenameRow";

export default async function AdminCategoriesPage() {
  const categories = await getCategoryCounts();

  return (
    <>
      <div className="page-header" style={{ marginTop: "1.5rem" }}>
        <div>
          <h2 className="page-title" style={{ fontSize: "1.1rem" }}>Categories</h2>
          <p className="page-subtitle">Click &ldquo;Rename&rdquo; to rename a category across all test cases.</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">No categories yet. Create test cases first.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Test Cases</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map(({ category, count }) => (
                <CategoryRenameRow key={category} category={category} count={count} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
