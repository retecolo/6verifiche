export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTestCaseById, getCategories } from "@/lib/testcase.service";
import TestCaseForm from "@/components/TestCaseForm";

export default async function EditTestCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tc, categories] = await Promise.all([getTestCaseById(id), getCategories()]);
  if (!tc) notFound();

  return (
    <>
      <div className="page-header" style={{ marginTop: "1.5rem" }}>
        <h2 className="page-title" style={{ fontSize: "1.1rem" }}>Edit: {tc.name}</h2>
      </div>
      <div className="card">
        <TestCaseForm
          initial={tc}
          categories={categories}
          action={`/api/testcases/${id}`}
          method="PUT"
          submitLabel="Save Changes"
        />
      </div>
    </>
  );
}
