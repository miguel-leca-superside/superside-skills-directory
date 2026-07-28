"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

function CommandRow({
  label,
  command,
  onCopy,
}: {
  label: string;
  command: string;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — no-op */
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[13px] text-foreground no-scrollbar">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : `Copy: ${command}`}
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="size-3.5" strokeWidth={2} />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" strokeWidth={1.75} />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function InstallBlock({
  slug,
  skillId,
  downloadHref,
}: {
  slug: string;
  skillId: string;
  downloadHref: string;
}) {
  // Copying the CLI command counts as an install (the .zip path is counted
  // server-side in the download route). Best-effort — never blocks the copy.
  const recordInstall = () => {
    fetch("/api/skills/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: skillId }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-medium text-foreground">Install</h2>
        <a
          href={downloadHref}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary"
        >
          <Download className="size-4" strokeWidth={1.5} />
          Download .zip
        </a>
      </div>

      <CommandRow
        label="Install into your agent"
        command={`npx superside-skills add -s ${slug}`}
        onCopy={recordInstall}
      />
    </section>
  );
}
