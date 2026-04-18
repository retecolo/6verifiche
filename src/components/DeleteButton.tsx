"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  url: string;
  label?: string;
  redirectTo?: string;
  onSuccess?: () => void;
}

export default function DeleteButton({ url, label = "Delete", redirectTo, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm(`Are you sure you want to delete this ${label.toLowerCase()}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await fetch(url, { method: "DELETE" });
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn btn-danger" onClick={handleClick} disabled={loading} style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}>
      {loading ? "Deleting…" : label}
    </button>
  );
}
