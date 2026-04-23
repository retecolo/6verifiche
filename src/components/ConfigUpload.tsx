"use client";

import { useState, useRef } from "react";

export interface ConfigSnapshotMeta {
  id: string;
  filename: string;
  uploadedAt: string;
}

interface Props {
  platformId: string;
  snapshots: ConfigSnapshotMeta[];
  selectedSnapshotId: string | null;
  onSelect: (id: string | null) => void;
  onUploaded: (snapshot: ConfigSnapshotMeta) => void;
  onDeleted: (id: string) => void;
}

export default function ConfigUpload({
  platformId,
  snapshots,
  selectedSnapshotId,
  onSelect,
  onUploaded,
  onDeleted,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("config", file);
    try {
      const res = await fetch(`/api/platforms/${platformId}/config`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Upload failed");
        return;
      }
      const snapshot = await res.json();
      onUploaded({
        id: snapshot.id,
        filename: snapshot.filename,
        uploadedAt: snapshot.uploadedAt ?? new Date().toISOString(),
      });
    } catch {
      setError("Upload failed — network error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this config snapshot?")) return;
    const res = await fetch(`/api/platforms/${platformId}/config/${id}`, {
      method: "DELETE",
    });
    if (res.ok || res.status === 204) onDeleted(id);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="card">
      <div className="card-title">Configuration Snapshots</div>

      <div
        className="config-drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        aria-label="Upload config file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.cfg,.conf,.log,text/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <span>Uploading…</span>
        ) : (
          <span>
            Drop a config file here or <strong>click to browse</strong>
            <br />
            <small style={{ color: "var(--fg-muted)" }}>Max 5 MB · plain text / .cfg / .conf</small>
          </span>
        )}
      </div>

      {error && (
        <p style={{ color: "var(--fail)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{error}</p>
      )}

      {snapshots.length === 0 ? (
        <p style={{ color: "var(--fg-muted)", fontSize: "0.875rem", marginTop: "1rem" }}>
          No config files uploaded yet.
        </p>
      ) : (
        <ul className="config-snapshot-list">
          {snapshots.map((s) => (
            <li
              key={s.id}
              className={`config-snapshot-row${selectedSnapshotId === s.id ? " selected" : ""}`}
            >
              <button
                className="config-snapshot-name"
                onClick={() => onSelect(selectedSnapshotId === s.id ? null : s.id)}
              >
                <span>{s.filename}</span>
                <span className="config-snapshot-date">
                  {new Date(s.uploadedAt).toLocaleDateString()}
                </span>
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                onClick={() => handleDelete(s.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
