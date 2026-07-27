import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Tag/chip primitive — matches Figma: #f6f8f1 fill, rgba(11,30,29,0.05) border, 8px radius, 4/8 padding, 12px Geist Regular */
export function Tag({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border border-foreground/5 bg-secondary px-2 py-1 text-xs font-normal leading-[14px] text-foreground",
        className,
      )}
      {...props}
    />
  );
}
