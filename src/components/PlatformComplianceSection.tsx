"use client";

import { useState, useEffect } from "react";
import ResultCell from "./ResultCell";
import ConfigUpload, { type ConfigSnapshotMeta } from "./ConfigUpload";
import ConfigViewer from "./ConfigViewer";

interface TestCase {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface ExistingResult {
  id: string;
  status: string;
  detail: string | null;
}

interface MatrixRow {
  testCase: TestCase;
  result: ExistingResult | null;
}

interface Props {
  platformId: string;
  matrix: MatrixRow[];
  initialSnapshots: ConfigSnapshotMeta[];
}

export default function PlatformComplianceSection({
  platformId,
  matrix,
  initialSnapshots,
}: Props) {
  const [selectedTestCaseName, setSelectedTestCaseName] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<ConfigSnapshotMeta[]>(initialSnapshots);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [snapshotContent, setSnapshotContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (!selectedSnapshotId) {
      setSnapshotContent(null);
      return;
    }
    setLoadingContent(true);
    fetch(`/api/platforms/${platformId}/config/${selectedSnapshotId}`)
      .then((r) => r.json())
      .then((data) => {
        setSnapshotContent(data.content ?? null);
        setLoadingContent(false);
      })
      .catch(() => setLoadingContent(false));
  }, [selectedSnapshotId, platformId]);

  const grouped = matrix.reduce<Record<string, MatrixRow[]>>((acc, item) => {
    const cat = item.testCase.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  function toggleTestCase(name: string) {
    setSelectedTestCaseName((prev) => (prev === name ? null : name));
  }

  const hasConfig = snapshots.length > 0;

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Test Case</th>
              <th>Description</th>
              <th>Status</th>
              <th>Notes / Evidence</th>
              <th>Badge</th>
              {hasConfig && <th>Config</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([category, items]) => (
              <>
                <tr key={`cat-${category}`} className="category-row">
                  <th colSpan={hasConfig ? 7 : 6}>{category}</th>
                </tr>
                {items.map(({ testCase, result }) => (
                  <ResultCell
                    key={testCase.id}
                    platformId={platformId}
                    testCase={testCase}
                    result={result}
                    selectedName={selectedTestCaseName}
                    onSelect={hasConfig ? toggleTestCase : undefined}
                  />
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="config-section">
        <ConfigUpload
          platformId={platformId}
          snapshots={snapshots}
          selectedSnapshotId={selectedSnapshotId}
          onSelect={setSelectedSnapshotId}
          onUploaded={(s) => setSnapshots((prev) => [s, ...prev])}
          onDeleted={(id) => {
            setSnapshots((prev) => prev.filter((s) => s.id !== id));
            if (selectedSnapshotId === id) {
              setSelectedSnapshotId(null);
            }
          }}
        />
        <ConfigViewer
          content={snapshotContent}
          testCaseName={selectedTestCaseName}
          isLoading={loadingContent}
        />
      </div>
    </>
  );
}
