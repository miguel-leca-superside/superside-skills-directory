"use client";

import { useState } from "react";
import {
  Bookmark,
  Copy,
  FileUp,
  FolderClosed,
  FolderOpen,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoMark } from "@/components/icons";
import { Tag } from "@/components/tag";
import { FOLDERS, TAGS } from "@/lib/data";

const NAV: { label: string; icon: LucideIcon }[] = [
  { label: "Search", icon: Search },
  { label: "Import a Skill", icon: FileUp },
  { label: "Request a Skill", icon: Plus },
  { label: "Saved", icon: Bookmark },
  { label: "Created by me", icon: Copy },
];

const CATEGORIES: { label: string; children: string[] }[] = [
  {
    label: "Creative Skills",
    children: [
      "Operational",
      "Strategy",
      "Concepting and Exploration",
      "Production",
      "Delivery & Quality",
    ],
  },
];

const ITEM =
  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent";
const SECTION = "px-2 text-sm text-muted-foreground";

function CollapsibleFolder({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = open ? FolderOpen : FolderClosed;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={ITEM}
      >
        <Icon className="size-4 shrink-0" strokeWidth={1} />
        <span className="truncate">{label}</span>
      </button>
      {open && children.length > 0 && (
        <div className="flex flex-col">
          {children.map((child) => (
            <a
              key={child}
              href="#"
              className={`${ITEM} pl-8 text-muted-foreground`}
            >
              {child}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="flex w-[236px] shrink-0 flex-col justify-between overflow-y-auto py-3">
      <div className="flex flex-col gap-8">
        {/* Brand */}
        <div className="flex items-center gap-2 px-2">
          <LogoMark className="h-[13px] w-4 text-foreground" />
          <span className="text-sm">Superside Skills Directory</span>
        </div>

        {/* Primary nav */}
        <nav className="flex flex-col">
          {NAV.map(({ label, icon: Icon }) => (
            <a key={label} href="#" className={ITEM}>
              <Icon className="size-4 shrink-0" strokeWidth={1} />
              {label}
            </a>
          ))}
        </nav>

        {/* Categories + folders */}
        <div className="flex flex-col gap-3">
          <span className={SECTION}>Categories</span>
          <div className="flex flex-col">
            {CATEGORIES.map((category) => (
              <CollapsibleFolder
                key={category.label}
                label={category.label}
                children={category.children}
                defaultOpen
              />
            ))}
          </div>
          <div className="flex flex-col">
            {FOLDERS.map((folder) => (
              <CollapsibleFolder
                key={folder.label}
                label={folder.label}
                children={folder.children}
              />
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-3">
          <span className={SECTION}>Tags</span>
          <div className="flex flex-wrap gap-1 px-2">
            {TAGS.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
      </div>

      {/* User */}
      <div className="flex items-center gap-2 px-2 pt-6">
        <Avatar className="size-4">
          <AvatarFallback className="bg-secondary text-[8px] font-normal text-foreground">
            ML
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">Miguel Leça</span>
      </div>
    </aside>
  );
}
