"use client";

import { useState } from "react";
import {
  Blocks,
  Bookmark,
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
  { label: "Created by me", icon: Blocks },
];

const CATEGORIES: { label: string; prefix: string; children: string[] }[] = [
  {
    label: "Creative Skills",
    prefix: "Creative",
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
  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent";
const SECTION = "px-2 text-sm text-muted-foreground";

function CollapsibleFolder({
  label,
  prefix,
  children,
  selected,
  onSelect,
  defaultOpen = false,
}: {
  label: string;
  prefix: string;
  children: string[];
  selected: string;
  onSelect: (value: string) => void;
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
        <Icon className="size-4 shrink-0" strokeWidth={1.5} />
        <span className="truncate">{label}</span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-[var(--ease-out)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="flex flex-col">
            {children.map((child) => {
              const value = `${prefix} / ${child}`;
              const active = selected === value;
              return (
                <button
                  key={child}
                  type="button"
                  onClick={() => onSelect(value)}
                  aria-current={active ? "true" : undefined}
                  className={`${ITEM} pl-8 ${
                    active
                      ? "bg-sidebar-accent font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="truncate">{child}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({
  selected,
  onSelect,
  activeTags,
  onToggleTag,
}: {
  selected: string;
  onSelect: (value: string) => void;
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}) {
  return (
    <aside className="no-scrollbar flex w-[236px] shrink-0 flex-col justify-between overflow-y-auto py-3">
      <div className="flex flex-col gap-8">
        {/* Brand — returns to the full directory (home) */}
        <button
          type="button"
          onClick={() => onSelect("")}
          className="flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-sidebar-accent"
        >
          <LogoMark className="h-[13px] w-4 text-foreground" />
          <span className="text-sm">Superside Skills Directory</span>
        </button>

        {/* Primary nav */}
        <nav className="flex flex-col">
          {NAV.map(({ label, icon: Icon }) => (
            <button key={label} type="button" className={ITEM}>
              <Icon className="size-4 shrink-0" strokeWidth={1.5} />
              {label}
            </button>
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
                prefix={category.prefix}
                children={category.children}
                selected={selected}
                onSelect={onSelect}
              />
            ))}
            {FOLDERS.map((folder) => (
              <CollapsibleFolder
                key={folder.label}
                label={folder.label}
                prefix={folder.label}
                children={folder.children}
                selected={selected}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-3">
          <span className={SECTION}>Tags</span>
          <div className="flex flex-wrap gap-1 px-2">
            {TAGS.map((tag) => (
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
      </div>

      {/* User */}
      <div className="flex items-center gap-2 px-2 pt-6">
        <Avatar className="size-5">
          <AvatarFallback className="bg-secondary text-[10px] font-normal text-foreground">
            ML
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">Miguel Leça</span>
      </div>
    </aside>
  );
}
