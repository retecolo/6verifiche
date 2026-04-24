"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TestCaseOut } from "@/lib/testcase.service";

interface Props {
  initial?: Partial<TestCaseOut>;
  categories: string[];
  action: string; // POST or PUT URL
  method?: "POST" | "PUT";
  submitLabel?: string;
}

const SEVERITIES = ["MANDATORY", "RECOMMENDED", "OPTIONAL"] as const;

export default function TestCaseForm({
  initial = {},
  categories,
  action,
  method = "POST",
  submitLabel = "Save",
}: Props) {
  const router = useRouter();
  const [category, setCategory] = useState(initial.category ?? "");
  const [name, setName] = useState(initial.name ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [rfcReference, setRfcReference] = useState(initial.rfcReference ?? "");
  const [severity, setSeverity] = useState<string>(initial.severity ?? "MANDATORY");
  const [tagsRaw, setTagsRaw] = useState((initial.tags ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch(action, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category, name, description, rfcReference: rfcReference || undefined, severity, tags }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error?.formErrors?.[0] ?? data?.error ?? "Save failed");
      return;
    }
    router.push("/admin/testcases");
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Category</label>
        <input
          type="text"
          list="category-list"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          maxLength={100}
          placeholder="e.g. Core IPv6 Protocols"
        />
        <datalist id="category-list">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={150}
          placeholder="e.g. ICMPv6 / Neighbor Discovery"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={2000}
          rows={4}
          placeholder="Describe what is being tested and why it matters."
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>RFC Reference</label>
          <input
            type="text"
            value={rfcReference}
            onChange={(e) => setRfcReference(e.target.value)}
            maxLength={500}
            placeholder="e.g. RFC 4443"
          />
        </div>

        <div className="form-group">
          <label>Severity</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Tags (comma-separated)</label>
        <input
          type="text"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="e.g. routing, bgp, ietf"
        />
      </div>

      {error && <p className="admin-form-error">{error}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        <a href="/admin/testcases" className="btn btn-ghost">Cancel</a>
      </div>
    </form>
  );
}
