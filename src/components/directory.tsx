"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { SkillCard } from "@/components/skill-card";
import { useFilters } from "@/components/app-shell";
import { useSavedSkills } from "@/lib/saved-skills";
import {
  type Skill,
  CATEGORY_DESCRIPTIONS,
  CURRENT_USER,
  DEFAULT_DESCRIPTION,
  slugToLabel,
} from "@/lib/data";
import type { Metrics } from "@/lib/metrics";

const HOME_TITLE = "Superside Skills Directory";
const HOME_DESCRIPTION =
  "Every skill the team has built, in one place. Browse the full list below, or pick a category on the left to narrow things down.";

// --- Sorting -----------------------------------------------------------------

type SortKey = "featured" | "newest" | "oldest" | "az" | "za" | "views" | "installs";

const SORT_LABELS: Record<SortKey, string> = {
  featured: "Recommended",
  newest: "Newest",
  oldest: "Oldest",
  az: "Name (A–Z)",
  za: "Name (Z–A)",
  views: "Most viewed",
  installs: "Top installed",
};

// Sorts that always work vs. the popularity sorts, which need real metric data.
const BASE_SORTS: SortKey[] = ["featured", "newest", "oldest", "az", "za"];
const POPULARITY_SORTS: SortKey[] = ["views", "installs"];

/** A skill's timestamp for date sorts — submitted, falling back to approved. */
const dateOf = (s: Skill): string => s.submittedAt ?? s.approvedAt ?? "";

/** Compare two dates with missing values always sorted last (in both directions). */
function byDate(a: Skill, b: Skill, newestFirst: boolean): number {
  const da = dateOf(a);
  const db = dateOf(b);
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return newestFirst ? db.localeCompare(da) : da.localeCompare(db);
}

/** Return a new, sorted array. Array.sort is stable, so ties keep catalog order. */
function sortSkills(list: Skill[], key: SortKey, metrics: Metrics): Skill[] {
  const arr = [...list];
  switch (key) {
    case "newest":
      return arr.sort((a, b) => byDate(a, b, true));
    case "oldest":
      return arr.sort((a, b) => byDate(a, b, false));
    case "az":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "za":
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    case "views":
      return arr.sort((a, b) => (metrics.views[b.id] ?? 0) - (metrics.views[a.id] ?? 0));
    case "installs":
      return arr.sort((a, b) => (metrics.installs[b.id] ?? 0) - (metrics.installs[a.id] ?? 0));
    default:
      return arr; // "featured" — the catalog's curated order
  }
}

function SortMenu({
  value,
  onChange,
  options,
}: {
  value: SortKey;
  onChange: (key: SortKey) => void;
  options: SortKey[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary"
      >
        <span className="text-muted-foreground">Sort:</span>
        {SORT_LABELS[value]}
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1.5 min-w-[180px] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-100"
        >
          {options.map((key) => {
            const active = key === value;
            return (
              <li key={key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary ${
                    active ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {SORT_LABELS[key]}
                  {active && <Check className="size-4 shrink-0" strokeWidth={1.75} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// --- Directory ---------------------------------------------------------------

/** The directory's inner content (header + grid). The shell (sidebar + cream box) is provided by <AppShell>. */
export function DirectoryContent({ skills, metrics }: { skills: Skill[]; metrics: Metrics }) {
  const { selected, activeTags, toggleTag, clearTags, view } = useFilters();
  const { saved } = useSavedSkills();
  const [sort, setSort] = useState<SortKey>("featured");

  // Popularity sorts only appear once the metrics store is wired up, so we never
  // offer a sort that would silently order everything by zero.
  const sortOptions = useMemo(
    () => (metrics.configured ? [...BASE_SORTS, ...POPULARITY_SORTS] : BASE_SORTS),
    [metrics.configured],
  );

  // The active view decides the base set + header, before any tag filtering.
  let base: Skill[];
  let title: string;
  let description: string;
  let emptyMessage: string;

  if (view === "saved") {
    base = skills.filter((s) => saved.includes(s.id));
    title = "Saved skills";
    description = "Skills you've bookmarked. Tap the bookmark on any skill to add it here.";
    emptyMessage = "No saved skills yet — tap the bookmark on a skill to save it.";
  } else if (view === "created") {
    base = skills.filter((s) => s.author === CURRENT_USER);
    title = "Created by me";
    description = "Skills you've submitted to the directory.";
    emptyMessage = "You haven't submitted any skills yet.";
  } else if (selected === "") {
    base = skills;
    title = HOME_TITLE;
    description = HOME_DESCRIPTION;
    emptyMessage = "No skills match the current filters.";
  } else {
    const [sectionSlug, subSlug] = selected.split("/");
    base = skills.filter((s) => `${s.section}/${s.subcategory}` === selected);
    title = `${slugToLabel(sectionSlug)} / ${slugToLabel(subSlug)}`;
    description = CATEGORY_DESCRIPTIONS[selected] ?? DEFAULT_DESCRIPTION;
    emptyMessage = "No skills match the current filters.";
  }

  const filtering = activeTags.length > 0;
  const filtered = filtering
    ? base.filter((skill) => activeTags.every((t) => skill.tags.includes(t)))
    : base;
  const visible = sortSkills(filtered, sort, metrics);

  return (
    <div className="flex min-h-full flex-col items-center gap-10 px-6 py-12">
      <header
        key={`${view}:${selected}`}
        className="flex w-full flex-col items-center gap-6 text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
          {title}
        </h1>
        <p className="max-w-[600px] text-pretty text-sm leading-normal text-muted-foreground">
          {description}
        </p>
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {filtering
          ? `${visible.length} skills tagged ${activeTags.join(" + ")}`
          : `${visible.length} skills`}
      </p>

      {/* Toolbar: result summary (+ tag clear) on the left, sort on the right. */}
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums">{visible.length}</span> skill
            {visible.length === 1 ? "" : "s"}
            {filtering && (
              <>
                {" "}
                tagged {activeTags.join(" + ")}{" "}
                <button
                  type="button"
                  onClick={clearTags}
                  className="cursor-pointer rounded text-foreground underline underline-offset-2 hover:opacity-70"
                >
                  Clear
                </button>
              </>
            )}
          </p>
          <SortMenu value={sort} onChange={setSort} options={sortOptions} />
        </div>

        {visible.length > 0 ? (
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                activeTags={activeTags}
                onToggleTag={toggleTag}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {base.length === 0 ? emptyMessage : "No skills match the current filters."}
          </p>
        )}
      </div>
    </div>
  );
}
