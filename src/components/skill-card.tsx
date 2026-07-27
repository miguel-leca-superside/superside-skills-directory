import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/tag";
import type { Skill } from "@/lib/data";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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
    <Card className="flex flex-col gap-8 rounded-xl p-5 shadow-[var(--shadow-card)] ring-1 ring-foreground/10 transition-[box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:shadow-[var(--shadow-card-hover)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:hover:-translate-y-0.5">
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-medium text-foreground">{skill.name}</h2>
        <p className="line-clamp-4 text-pretty text-sm leading-normal text-muted-foreground">
          {skill.description}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarFallback className="bg-secondary text-[10px] font-normal text-foreground">
              {initials(skill.author)}
            </AvatarFallback>
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
