export const dynamic = "force-dynamic";

import { getCategories } from "@/lib/testcase.service";
import TestCaseForm from "@/components/TestCaseForm";

export default async function NewTestCasePage() {
  const categories = await getCategories();

  return (
    <>
      <div className="page-header" style={{ marginTop: "1.5rem" }}>
        <h2 className="page-title" style={{ fontSize: "1.1rem" }}>New Test Case</h2>
      </div>
      <div className="card">
        <TestCaseForm categories={categories} action="/api/testcases" method="POST" submitLabel="Create Test Case" />
      </div>
    </>
  );
}
