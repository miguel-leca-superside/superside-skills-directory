"use client";

import { Bookmark } from "lucide-react";
import { useSavedSkills } from "@/lib/saved-skills";
import { cn } from "@/lib/utils";

/**
 * Toggle a skill's saved/bookmarked state. Two looks:
 *  - default: a bare icon button (for skill cards)
 *  - showLabel: a bordered "Save"/"Saved" button (for the detail page)
 * Stops click propagation so it works on top of a card's stretched link.
 */
export function BookmarkButton({
  id,
  showLabel = false,
  className,
}: {
  id: string;
  showLabel?: boolean;
  className?: string;
}) {
  const { isSaved, toggle } = useSavedSkills();
  const saved = isSaved(id);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(id);
  };

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
          saved
            ? "border-foreground/20 bg-secondary text-foreground"
            : "border-border bg-background text-foreground hover:bg-secondary",
          className,
        )}
      >
        <Bookmark className={cn("size-4", saved && "fill-current")} strokeWidth={1.5} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save skill"}
      className={cn(
        "rounded-md p-1 transition-colors hover:bg-secondary",
        saved ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Bookmark className={cn("size-4", saved && "fill-current")} strokeWidth={1.5} />
    </button>
  );
}
