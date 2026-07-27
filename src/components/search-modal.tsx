"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { type Skill, slugToLabel } from "@/lib/data";
import { cn } from "@/lib/utils";

/** How many suggestions to show for an empty query, and results cap per search. */
const BROWSE_COUNT = 6;
const MAX_RESULTS = 8;

function rank(skill: Skill, q: string): number {
  const name = skill.name.toLowerCase();
  if (name.startsWith(q)) return 3;
  if (name.includes(q)) return 2;
  const hay = `${skill.description} ${skill.tags.join(" ")} ${skill.section} ${skill.subcategory}`.toLowerCase();
  return hay.includes(q) ? 1 : 0;
}

export function SearchModal({
  skills,
  open,
  onOpenChange,
}: {
  skills: Skill[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset the palette each time it opens — React's "adjust state during render"
  // pattern (no effect), so the query + highlight start fresh on every open.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills.slice(0, BROWSE_COUNT);
    return skills
      .map((s) => ({ s, score: rank(s, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
      .slice(0, MAX_RESULTS)
      .map((r) => r.s);
  }, [query, skills]);

  // Focus the input once the modal is on screen.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Scroll the highlighted row into view during keyboard navigation.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (skill: Skill | undefined) => {
    if (!skill) return;
    onOpenChange(false);
    router.push(`/skills/${skill.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  const q = query.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Search skills</DialogTitle>

        {/* Query input */}
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search skills…"
            aria-label="Search skills"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[min(60dvh,360px)] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No skills match “{q}”.
            </p>
          ) : (
            <>
              {!q && (
                <p className="px-3 pb-1 pt-1 text-xs font-medium text-muted-foreground">Skills</p>
              )}
              {results.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(s)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors",
                    i === active ? "bg-secondary" : "hover:bg-secondary/60",
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {slugToLabel(s.section)}
                    </span>
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {s.description}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5">↑</kbd>
            <kbd className="rounded border border-border bg-muted px-1 py-0.5">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5">↵</kbd>
            to open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
