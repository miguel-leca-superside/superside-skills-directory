import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Tag/chip primitive. Resting state matches Figma: #f6f8f1 fill,
 * rgba(11,30,29,0.05) border, 8px radius, 4/8 padding, 12px Geist Regular.
 * Renders as a button so tags act as toggle filters; `active` inverts it.
 */
export function Tag({
  active = false,
  className,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center rounded-lg border px-2 py-1 text-xs font-normal leading-[14px] transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.96]",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/5 bg-secondary text-foreground hover:border-foreground/20",
        className,
      )}
      {...props}
    />
  );
}
