import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Markdown } from "@/components/markdown";
import { InstallBlock } from "@/components/install-block";
import { BookmarkButton } from "@/components/bookmark-button";
import { ViewTracker } from "@/components/view-tracker";
import { type Skill, avatarColor, slugToLabel } from "@/lib/data";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Format an ISO date-only string ("2026-05-19") deterministically — no TZ surprises. */
function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${Number(m[3])}, ${m[1]}` : iso;
}

const VISIBILITY_LABEL: Record<string, string> = {
  internal: "Whole org",
  "team-only": "Team only",
  public: "Public",
};

const SOURCE_LABEL: Record<string, string> = {
  "claude.ai": "claude.ai",
  "claude-code": "Claude Code",
  other: "Other",
};

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function SkillDetail({ skill }: { skill: Skill }) {
  const category = `${slugToLabel(skill.section)} / ${slugToLabel(skill.subcategory)}`;
  const submitted = formatDate(skill.submittedAt);
  const approved = formatDate(skill.approvedAt);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
      <ViewTracker id={skill.id} />
      <Link
        href="/"
        className="mb-8 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} />
        Skills Directory
      </Link>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        {/* LEFT: title, description, and the full SKILL.md body */}
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <header className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium tracking-wide text-muted-foreground">
                {category}
              </span>
              <BookmarkButton id={skill.id} showLabel />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
              {skill.name}
            </h1>
            <p className="text-pretty text-sm leading-normal text-muted-foreground">
              {skill.description}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
              <div className="flex items-center gap-2">
                <Avatar className="size-5">
                  <AvatarFallback style={{ backgroundColor: avatarColor(skill.author) }} />
                </Avatar>
                <span className="text-xs text-foreground">{skill.author}</span>
              </div>
              {skill.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-lg border border-border bg-card px-2 py-1 text-xs leading-[14px] text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </header>

          {skill.body && (
            <article className="border-t border-border pt-8">
              <Markdown content={skill.body} />
            </article>
          )}
        </div>

        {/* RIGHT: install + details rail */}
        <aside className="flex w-full flex-col gap-6 lg:sticky lg:top-12 lg:w-[340px] lg:shrink-0">
          <InstallBlock
            slug={skill.slug}
            skillId={skill.id}
            downloadHref={`/api/skills/download/${skill.id}`}
          />

          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-base font-medium text-foreground">Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              <MetaRow label="Author">{skill.author}</MetaRow>
              {skill.team && <MetaRow label="Team">{skill.team}</MetaRow>}
              <MetaRow label="Category">{category}</MetaRow>
              <MetaRow label="Visibility">
                {VISIBILITY_LABEL[skill.visibility] ?? skill.visibility}
              </MetaRow>
              {skill.source && (
                <MetaRow label="Exported from">
                  {SOURCE_LABEL[skill.source] ?? skill.source}
                </MetaRow>
              )}
              {submitted && <MetaRow label="Submitted">{submitted}</MetaRow>}
              {approved && <MetaRow label="Approved">{approved}</MetaRow>}
            </dl>

            {skill.files.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">
                  Files ({skill.files.length + 1})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    SKILL.md
                  </span>
                  {skill.files.map((f) => (
                    <span
                      key={f}
                      className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
