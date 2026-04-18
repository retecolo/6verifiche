"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  onSuccess?: () => void;
}

export default function PlatformForm({ onSuccess }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ vendor: "", modelName: "", osVersion: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.formErrors?.[0] ?? "Failed to create platform");
        return;
      }
      setForm({ vendor: "", modelName: "", osVersion: "" });
      router.refresh();
      onSuccess?.();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">Add Platform</div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="vendor">Vendor</label>
            <input
              id="vendor"
              type="text"
              placeholder="e.g. Arista"
              value={form.vendor}
              onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="modelName">Model Name</label>
            <input
              id="modelName"
              type="text"
              placeholder="e.g. 7050X3-48YC12"
              value={form.modelName}
              onChange={e => setForm(f => ({ ...f, modelName: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="osVersion">OS / Firmware Version</label>
            <input
              id="osVersion"
              type="text"
              placeholder="e.g. EOS 4.30.2F"
              value={form.osVersion}
              onChange={e => setForm(f => ({ ...f, osVersion: e.target.value }))}
              required
            />
          </div>
          <div className="form-group" style={{ flex: "0 0 auto", justifyContent: "flex-end" }}>
            <label style={{ visibility: "hidden" }}>x</label>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Adding…" : "Add Platform"}
            </button>
          </div>
        </div>
        {error && <p style={{ color: "var(--fail)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{error}</p>}
      </form>
    </div>
  );
}
