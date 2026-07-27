"use client";

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

const HOME_TITLE = "Superside Skills Directory";
const HOME_DESCRIPTION =
  "Every skill the team has built, in one place. Browse the full list below, or pick a category on the left to narrow things down.";

/** The directory's inner content (header + grid). The shell (sidebar + cream box) is provided by <AppShell>. */
export function DirectoryContent({ skills }: { skills: Skill[] }) {
  const { selected, activeTags, toggleTag, clearTags, view } = useFilters();
  const { saved } = useSavedSkills();

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
  const visible = filtering
    ? base.filter((skill) => activeTags.every((t) => skill.tags.includes(t)))
    : base;

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

      {filtering && (
        <div className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>
            <span className="tabular-nums">{visible.length}</span> skill
            {visible.length === 1 ? "" : "s"} tagged {activeTags.join(" + ")}
          </span>
          <button
            type="button"
            onClick={clearTags}
            className="cursor-pointer rounded text-foreground underline underline-offset-2 hover:opacity-70"
          >
            Clear
          </button>
        </div>
      )}

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
        <p className="text-sm text-muted-foreground">
          {base.length === 0 ? emptyMessage : "No skills match the current filters."}
        </p>
      )}
    </div>
  );
}
