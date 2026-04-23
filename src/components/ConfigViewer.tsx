"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { TEST_CASE_KEYWORDS } from "@/lib/config.keywords";

interface Props {
  content: string | null;
  testCaseName: string | null;
  isLoading: boolean;
}

export default function ConfigViewer({ content, testCaseName, isLoading }: Props) {
  const [search, setSearch] = useState("");
  const [showMatchOnly, setShowMatchOnly] = useState(false);
  const firstKwRef = useRef<HTMLSpanElement | null>(null);

  const keywords = testCaseName ? (TEST_CASE_KEYWORDS[testCaseName] ?? []) : [];

  const kwRegex = useMemo(() => {
    if (keywords.length === 0) return null;
    const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(escaped.join("|"), "gi");
  }, [keywords]);

  const searchRegex = useMemo(() => {
    if (!search.trim()) return null;
    try {
      return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    } catch {
      return null;
    }
  }, [search]);

  const processedLines = useMemo(() => {
    if (!content) return [];
    return content.split("\n").map((line, i) => {
      if (kwRegex) kwRegex.lastIndex = 0;
      if (searchRegex) searchRegex.lastIndex = 0;
      const kwMatch = kwRegex ? kwRegex.test(line) : false;
      const srMatch = searchRegex ? searchRegex.test(line) : false;
      return { line, lineNum: i + 1, kwMatch, srMatch };
    });
  }, [content, kwRegex, searchRegex]);

  const kwMatchCount = processedLines.filter((l) => l.kwMatch).length;
  const srMatchCount = processedLines.filter((l) => l.srMatch).length;

  const displayed = showMatchOnly
    ? processedLines.filter((l) => l.kwMatch || l.srMatch)
    : processedLines;

  const firstKwIndex = displayed.findIndex((l) => l.kwMatch);

  useEffect(() => {
    if (firstKwRef.current) {
      firstKwRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [testCaseName, content]);

  if (isLoading) {
    return (
      <div className="card config-viewer-empty">
        <span style={{ color: "var(--fg-muted)" }}>Loading snapshot…</span>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="card config-viewer-empty">
        <span style={{ color: "var(--fg-muted)" }}>
          Select a config snapshot on the left to view its contents here.
          {testCaseName && ` Relevant lines for "${testCaseName}" will be highlighted.`}
        </span>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="config-viewer-toolbar">
        <input
          type="text"
          className="detail-input"
          placeholder="Search in file…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "220px" }}
        />
        {testCaseName && (
          <span className="config-match-count kw">
            {kwMatchCount} line{kwMatchCount !== 1 ? "s" : ""} match &ldquo;{testCaseName}&rdquo;
          </span>
        )}
        {search && (
          <span className="config-match-count sr">
            {srMatchCount} line{srMatchCount !== 1 ? "s" : ""} match search
          </span>
        )}
        <label className="config-toggle">
          <input
            type="checkbox"
            checked={showMatchOnly}
            onChange={(e) => setShowMatchOnly(e.target.checked)}
          />
          {" "}Matching only
        </label>
      </div>
      <pre className="config-pre">
        {displayed.map((l, idx) => (
          <span
            key={l.lineNum}
            ref={idx === firstKwIndex ? firstKwRef : undefined}
            className={`config-line${l.kwMatch ? " kw-match" : ""}${l.srMatch ? " sr-match" : ""}`}
          >
            <span className="config-line-num">{l.lineNum}</span>
            <span className="config-line-content">{l.line}</span>
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}
