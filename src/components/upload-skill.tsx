"use client";

import { useCallback, useRef, useState } from "react";
import { unzipSync } from "fflate";
import {
  normalizeUpload,
  validateSkill,
  TEAMS,
  type NormalizedSkill,
  type SourceValue,
  type UploadFile,
  type ValidationResult,
  type VisibilityValue,
} from "@/lib/skill-submission";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function readUpload(fileList: File[]): Promise<UploadFile[]> {
  // Claude exports a single .skill file (a zip archive under the hood). Unzip it.
  if (fileList.length === 1) {
    const file = fileList[0];
    const buf = new Uint8Array(await file.arrayBuffer());
    try {
      const entries = unzipSync(buf);
      return Object.entries(entries).map(([path, data]) => ({
        path,
        base64: bytesToBase64(data),
      }));
    } catch {
      // Not an archive — accept a bare SKILL.md if that's what was dropped.
      if (file.name === "SKILL.md" || /\.md$/i.test(file.name)) {
        return [{ path: "SKILL.md", base64: bytesToBase64(buf) }];
      }
      throw new Error(
        "Couldn't read that file. Export your skill from Claude and drop the .skill file it gives you.",
      );
    }
  }
  // Fallback: multiple files (a folder selection) — keep their relative paths.
  return Promise.all(
    fileList.map(async (f) => {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
      return {
        path: rel && rel.length > 0 ? rel : f.name,
        base64: bytesToBase64(new Uint8Array(await f.arrayBuffer())),
      };
    }),
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-foreground/40";

export function UploadSkill() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [skill, setSkill] = useState<NormalizedSkill | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [authorName, setAuthorName] = useState("");
  const [author, setAuthor] = useState("");
  const [team, setTeam] = useState<string>(TEAMS[0]);
  const [visibility, setVisibility] = useState<VisibilityValue>("internal");
  const [source, setSource] = useState<SourceValue>("claude.ai");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ prUrl: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  const ingest = useCallback(async (list: FileList | File[]) => {
    setParseError(null);
    setResult(null);
    setSubmitError(null);
    try {
      const uploaded = await readUpload(Array.from(list));
      const normalized = normalizeUpload(uploaded);
      setFiles(uploaded);
      setSkill(normalized);
      setValidation(validateSkill(normalized));
    } catch (e) {
      setSkill(null);
      setFiles([]);
      setValidation(null);
      setParseError(e instanceof Error ? e.message : "Could not read the upload.");
    }
  }, []);

  const reset = () => {
    setFiles([]);
    setSkill(null);
    setValidation(null);
    setParseError(null);
    setResult(null);
    setSubmitError(null);
  };

  const submit = async () => {
    if (!skill) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          meta: { authorName, author, team, visibility, source },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitError(
          [data.error, ...(data.errors ?? [])].filter(Boolean).join(" ") || "Submission failed.",
        );
      } else {
        setResult({ prUrl: data.prUrl });
      }
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    skill && validation?.ok && authorName.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(author);

  // ---- Success state ----
  if (result) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-muted px-6 py-12 text-center">
        <h2 className="text-lg font-semibold text-foreground">Submitted for review 🎉</h2>
        <p className="max-w-[440px] text-sm text-muted-foreground">
          A pull request was opened in the registry. An admin will review it, categorize it, and
          merge it into the catalog.
        </p>
        <a
          href={result.prUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
        >
          View the pull request →
        </a>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-foreground underline underline-offset-2 hover:opacity-70"
        >
          Submit another skill
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) ingest(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragOver ? "border-foreground/40 bg-secondary" : "border-border bg-muted"
        }`}
      >
        <p className="text-sm text-foreground">
          Drag your <span className="font-medium">.skill</span> file here
        </p>
        <p className="text-xs text-muted-foreground">
          The file Claude gives you when you export a skill
        </p>
        <div className="pt-1">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            Choose file
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".skill,.zip"
          hidden
          onChange={(e) => e.target.files && ingest(e.target.files)}
        />
      </div>

      {parseError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {parseError}
        </p>
      )}

      {/* Preview + form */}
      {skill && validation && (
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-muted p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium text-foreground">{skill.name || "(no name)"}</h2>
              <p className="max-w-[560px] text-sm text-muted-foreground">{skill.description}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {skill.files.map((f) => (
              <span
                key={f.path}
                className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {f.path}
              </span>
            ))}
          </div>

          {validation.errors.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {validation.errors.map((err) => (
                <li key={err}>• {err}</li>
              ))}
            </ul>
          )}
          {validation.warnings.map((w) => (
            <p
              key={w}
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
            >
              {w}
            </p>
          ))}

          {/* Metadata form */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">Your name</span>
              <input
                className={inputCls}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Jane Doe"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">Superside email</span>
              <input
                className={inputCls}
                type="email"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="you@superside.com"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">Owning team</span>
              <select className={inputCls} value={team} onChange={(e) => setTeam(e.target.value)}>
                {TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">Exported from</span>
              <select
                className={inputCls}
                value={source}
                onChange={(e) => setSource(e.target.value as SourceValue)}
              >
                <option value="claude.ai">claude.ai</option>
                <option value="claude-code">Claude Code</option>
                <option value="other">Other</option>
              </select>
            </label>
            <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm text-muted-foreground">Visibility</span>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["internal", "Whole org"],
                    ["team-only", "My team only"],
                    ["public", "Public / shareable"],
                  ] as [VisibilityValue, string][]
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === value}
                      onChange={() => setVisibility(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {submitError && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">
              Opens a pull request in the registry for admin review.
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
