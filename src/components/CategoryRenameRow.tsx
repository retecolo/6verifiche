"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  category: string;
  count: number;
}

export default function CategoryRenameRow({ category, count }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(category);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const newName = value.trim();
    if (!newName || newName === category) {
      setEditing(false);
      setValue(category);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/testcases/categories", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ oldName: category, newName }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Rename failed");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setEditing(false); setValue(category); }
  }

  return (
    <tr>
      <td>
        {editing ? (
          <input
            className="detail-input"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            maxLength={100}
          />
        ) : (
          <span>{category}</span>
        )}
        {error && <span className="admin-inline-error"> {error}</span>}
      </td>
      <td>{count}</td>
      <td>
        {editing ? (
          <div className="actions">
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? "…" : "Save"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setValue(category); }}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            Rename
          </button>
        )}
      </td>
    </tr>
  );
}
