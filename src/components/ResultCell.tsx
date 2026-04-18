"use client";

import { useState, useCallback, useRef } from "react";

const STATUS_OPTIONS = ["", "PASS", "FAIL", "PARTIAL", "N/A"] as const;

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

interface Props {
  platformId: string;
  testCase: TestCase;
  result: ExistingResult | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ResultCell({ platformId, testCase, result }: Props) {
  const [status, setStatus] = useState(result?.status ?? "");
  const [detail, setDetail] = useState(result?.detail ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (nextStatus: string, nextDetail: string) => {
      if (!nextStatus) return;
      setSaveState("saving");
      try {
        const res = await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platformId,
            testCaseId: testCase.id,
            status: nextStatus,
            detail: nextDetail || undefined,
          }),
        });
        setSaveState(res.ok ? "saved" : "error");
        if (res.ok) setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("error");
      }
    },
    [platformId, testCase.id]
  );

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setStatus(val);
    save(val, detail);
  }

  function handleDetailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setDetail(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(status, val), 800);
  }

  const badgeClass = status ? `badge badge-${status === "N/A" ? "NA" : status}` : "";

  return (
    <tr>
      <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{testCase.name}</td>
      <td className="description-cell">{testCase.description}</td>
      <td>
        <select className="status-select" value={status} onChange={handleStatusChange}>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt || "— unset —"}</option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="text"
          className="detail-input"
          placeholder="Notes / evidence…"
          value={detail}
          onChange={handleDetailChange}
          disabled={!status}
        />
      </td>
      <td>
        {status && <span className={badgeClass}>{status}</span>}
      </td>
      <td>
        <span className={`save-indicator${saveState !== "idle" ? ` ${saveState}` : ""}`}>
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "✓ Saved"}
          {saveState === "error" && "✗ Error"}
        </span>
      </td>
    </tr>
  );
}
