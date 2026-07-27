"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SkillCard } from "@/components/skill-card";
import {
  type SectionNode,
  type Skill,
  CATEGORY_DESCRIPTIONS,
  DEFAULT_DESCRIPTION,
  slugToLabel,
} from "@/lib/data";

const HOME_TITLE = "Superside Skills Directory";
const HOME_DESCRIPTION =
  "Every skill the team has built, in one place. Browse the full list below, or pick a category on the left to narrow things down.";

export function Directory({
  skills,
  sections,
  tags,
}: {
  skills: Skill[];
  sections: SectionNode[];
  tags: string[];
}) {
  // "" = the home view: all skills, no category filter applied.
  // Otherwise a "<section>/<subcategory>" slug path.
  const [selected, setSelected] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const toggleTag = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const isHome = selected === "";

  // Category filter: a skill's "<section>/<subcategory>" must match the selection.
  const inCategory = isHome
    ? skills
    : skills.filter((s) => `${s.section}/${s.subcategory}` === selected);

  const filtering = activeTags.length > 0;
  // AND filtering: a skill must carry every selected tag to appear.
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
    <div className="flex h-dvh gap-4 bg-background p-3">
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-foreground focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:text-background"
      >
        Skip to content
      </a>
      <AppSidebar
        sections={sections}
        tags={tags}
        selected={selected}
        onSelect={setSelected}
        activeTags={activeTags}
        onToggleTag={toggleTag}
      />

      <main id="main" className="flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center gap-10 rounded-2xl border border-border bg-muted px-6 py-12">
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
                onClick={() => setActiveTags([])}
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
              No skills match the current filters.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
