"use client";

import { SkillCard } from "@/components/skill-card";
import { useFilters } from "@/components/app-shell";
import {
  type Skill,
  CATEGORY_DESCRIPTIONS,
  DEFAULT_DESCRIPTION,
  slugToLabel,
} from "@/lib/data";

const HOME_TITLE = "Superside Skills Directory";
const HOME_DESCRIPTION =
  "Every skill the team has built, in one place. Browse the full list below, or pick a category on the left to narrow things down.";

/** The directory's inner content (header + grid). The shell (sidebar + cream box) is provided by <AppShell>. */
export function DirectoryContent({ skills }: { skills: Skill[] }) {
  const { selected, activeTags, toggleTag, clearTags } = useFilters();

  const isHome = selected === "";
  const inCategory = isHome
    ? skills
    : skills.filter((s) => `${s.section}/${s.subcategory}` === selected);

  const filtering = activeTags.length > 0;
  const visible = filtering
    ? inCategory.filter((skill) => activeTags.every((t) => skill.tags.includes(t)))
    : inCategory;

  let title = HOME_TITLE;
  let description = HOME_DESCRIPTION;
  if (!isHome) {
    const [sectionSlug, subSlug] = selected.split("/");
    title = `${slugToLabel(sectionSlug)} / ${slugToLabel(subSlug)}`;
    description = CATEGORY_DESCRIPTIONS[selected] ?? DEFAULT_DESCRIPTION;
  }

  return (
    <div className="flex min-h-full flex-col items-center gap-10 px-6 py-12">
      <header
        key={selected}
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
        <p className="text-sm text-muted-foreground">No skills match the current filters.</p>
      )}
    </div>
  );
}
