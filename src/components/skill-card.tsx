import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/tag";
import { BookmarkButton } from "@/components/bookmark-button";
import { type Skill, avatarColor } from "@/lib/data";

export function SkillCard({
  skill,
  activeTags,
  onToggleTag,
}: {
  skill: Skill;
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}) {
  return (
    <Card className="relative flex h-full flex-col justify-between gap-8 rounded-xl p-5 shadow-[var(--shadow-card)] ring-1 ring-foreground/10 transition-[box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:shadow-[var(--shadow-card-hover)] focus-within:ring-foreground/30 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:hover:-translate-y-0.5">
      <div className="flex flex-col gap-4">
        {/* Stretched link: the title covers the whole card as the click target,
            so the card navigates while the bookmark + tag buttons stay clickable. */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-medium text-foreground">
            <Link
              href={`/skills/${skill.id}`}
              className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:underline focus-visible:underline-offset-2"
            >
              {skill.name}
            </Link>
          </h2>
          <BookmarkButton id={skill.id} className="relative z-10 -mr-1 -mt-0.5" />
        </div>
        <p className="line-clamp-4 text-pretty text-sm leading-normal text-muted-foreground">
          {skill.description}
        </p>
      </div>

      {/* z-10 lifts these above the stretched-link overlay so their clicks win. */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarFallback style={{ backgroundColor: avatarColor(skill.author) }} />
          </Avatar>
          <span className="text-xs text-foreground">{skill.author}</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {skill.tags.map((tag) => (
            <Tag
              key={tag}
              active={activeTags.includes(tag)}
              onClick={() => onToggleTag(tag)}
            >
              {tag}
            </Tag>
          ))}
        </div>
      </div>
    </Card>
  );
}
