"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Plus } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SkillRequest } from "@/lib/requests";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-foreground/40";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function RequestForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length >= 4 && description.trim().length >= 10 && name.trim();

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, name, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        onDone();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">What should the skill do?</span>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Turn a Loom into a shot list"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Describe it</span>
        <textarea
          className={`${inputCls} min-h-28 resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What you want it to do, when you'd use it, and any examples."
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Your name</span>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Email (optional)</span>
          <input
            className={inputCls}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@superside.com"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <DialogClose className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Cancel
        </DialogClose>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Send request"}
        </button>
      </div>
    </div>
  );
}

export function RequestBoard({
  requests,
  configured,
}: {
  requests: SkillRequest[];
  configured: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {requests.length > 0
            ? `${requests.length} open request${requests.length === 1 ? "" : "s"}`
            : "No open requests yet."}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm text-background transition-opacity hover:opacity-90">
            <Plus className="size-4" strokeWidth={1.5} />
            Request a skill
          </DialogTrigger>
          <DialogContent>
            <div className="flex flex-col gap-2 pr-8">
              <DialogTitle>Request a skill</DialogTitle>
              <DialogDescription>
                Describe a skill you wish existed. It goes on the board for the team to see and
                upvote — and onto the makers&apos; radar.
              </DialogDescription>
            </div>
            <div className="mt-6">
              <RequestForm
                onDone={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!configured && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          The request board isn&apos;t connected yet — set a registry token to load and post
          requests.
        </p>
      )}

      {requests.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {requests.map((r) => (
            <div
              key={r.number}
              className="flex gap-4 rounded-xl border border-border bg-background p-5 ring-1 ring-foreground/5"
            >
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                title="Upvote on GitHub"
                className="flex h-fit flex-col items-center gap-0.5 rounded-lg border border-border px-2.5 py-1.5 text-foreground transition-colors hover:bg-secondary"
              >
                <ArrowUp className="size-4" strokeWidth={1.5} />
                <span className="text-xs tabular-nums">{r.upvotes}</span>
              </a>
              <div className="flex min-w-0 flex-col gap-1.5">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-base font-medium text-foreground hover:underline"
                >
                  {r.title}
                </a>
                <p className="line-clamp-3 text-pretty text-sm leading-normal text-muted-foreground">
                  {r.description}
                </p>
                <p className="pt-1 text-xs text-muted-foreground">
                  {r.requester} · {timeAgo(r.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
