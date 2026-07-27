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

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Card className="flex flex-col gap-8 rounded-lg border-border p-5 shadow-none transition-colors hover:border-foreground/20">
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-normal text-foreground">{skill.name}</h3>
        <p className="line-clamp-4 text-sm leading-normal text-muted-foreground">
          {skill.description}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="size-4">
            <AvatarFallback className="bg-secondary text-[8px] font-normal text-foreground">
              {initials(skill.author)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-foreground">{skill.author}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {skill.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </div>
    </Card>
  );
}
