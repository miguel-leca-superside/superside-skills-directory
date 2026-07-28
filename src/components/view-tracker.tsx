"use client";

// Fire-and-forget view beacon for a skill's detail page. Deduped per browser
// session (sessionStorage) so a refresh or re-mount doesn't inflate the count.
// Renders nothing.

import { useEffect } from "react";

export function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    const key = `superside:viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable — fall through and still count the view */
    }
    fetch("/api/skills/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      keepalive: true,
    }).catch(() => {
      /* best-effort — a missed view beacon is fine */
    });
  }, [id]);

  return null;
}
