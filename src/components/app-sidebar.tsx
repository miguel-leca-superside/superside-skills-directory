"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { useFilters } from "@/components/app-shell";
import { useSavedSkills } from "@/lib/saved-skills";
import { avatarColor, CURRENT_USER, type SectionNode } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadSkill } from "@/components/upload-skill";

const NAV: {
  label: string;
  icon: LucideIcon;
  modal?: boolean;
  href?: string;
  command?: "search" | "saved" | "created";
}[] = [
  { label: "Search", icon: Search, command: "search" },
  { label: "Upload a Skill", icon: FileUp, modal: true },
  { label: "Request a Skill", icon: Plus, href: "/requests" },
  { label: "Saved", icon: Bookmark, command: "saved" },
  { label: "Created by me", icon: Blocks, command: "created" },
];

const ITEM =
  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent";
const SECTION = "px-2 text-sm text-muted-foreground";

function CollapsibleSection({
  section,
  selected,
  onSelect,
  defaultOpen = false,
}: {
  section: SectionNode;
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
        <span className="truncate">{section.label}</span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-[var(--ease-out)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="flex flex-col">
            {section.subcategories.map((sub) => {
              const value = `${section.slug}/${sub.slug}`;
              const active = selected === value;
              return (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() => onSelect(value)}
                  aria-current={active ? "true" : undefined}
                  className={`${ITEM} justify-between pl-8 ${
                    active
                      ? "bg-sidebar-accent font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="truncate">{sub.label}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {sub.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({ sections, tags }: { sections: SectionNode[]; tags: string[] }) {
  const { selected, setSelected, activeTags, toggleTag, openSearch, view, setView } = useFilters();
  const { saved } = useSavedSkills();
  const router = useRouter();
  const pathname = usePathname();

  // Filtering happens on the home directory, so selecting from another page
  // updates the filter and navigates home to show it.
  const goHomeIfNeeded = () => {
    if (pathname !== "/") router.push("/");
  };
  const selectCategory = (value: string) => {
    setSelected(value);
    setView("all");
    goHomeIfNeeded();
  };
  const goHome = () => {
    setSelected("");
    setView("all");
    goHomeIfNeeded();
  };
  const onToggleTag = (tag: string) => {
    toggleTag(tag);
    goHomeIfNeeded();
  };
  const selectView = (v: "saved" | "created") => {
    setView(v);
    setSelected("");
    goHomeIfNeeded();
  };

  return (
    <aside className="no-scrollbar flex w-[236px] shrink-0 flex-col justify-between overflow-y-auto py-3">
      <div className="flex flex-col gap-8">
        {/* Brand — returns to the full directory (home) */}
        <button
          type="button"
          onClick={goHome}
          className="flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-sidebar-accent"
        >
          <LogoMark className="h-[13px] w-4 text-foreground" />
          <span className="text-sm">Superside Skills Directory</span>
        </button>

        {/* Primary nav */}
        <nav className="flex flex-col">
          {NAV.map(({ label, icon: Icon, modal, href, command }) =>
            command === "search" ? (
              <button
                key={label}
                type="button"
                onClick={openSearch}
                className={`${ITEM} justify-between`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                  {label}
                </span>
                <kbd className="rounded border border-sidebar-border bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            ) : command === "saved" || command === "created" ? (
              <button
                key={label}
                type="button"
                onClick={() => selectView(command)}
                aria-current={view === command ? "true" : undefined}
                className={`${ITEM} justify-between ${
                  view === command ? "bg-sidebar-accent font-medium text-foreground" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                  {label}
                </span>
                {command === "saved" && saved.length > 0 && (
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {saved.length}
                  </span>
                )}
              </button>
            ) : modal ? (
              <Dialog key={label}>
                <DialogTrigger className={ITEM}>
                  <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                  {label}
                </DialogTrigger>
                <DialogContent>
                  <div className="flex flex-col gap-2 pr-8">
                    <DialogTitle>Upload a Skill</DialogTitle>
                    <DialogDescription>
                      Built a skill in Claude? Drop the export here to submit it. An admin reviews
                      it before it appears in the catalog — you don&apos;t need to categorize it or
                      touch any code.
                    </DialogDescription>
                  </div>
                  <div className="mt-6">
                    <UploadSkill />
                  </div>
                </DialogContent>
              </Dialog>
            ) : href ? (
              <Link key={label} href={href} className={ITEM}>
                <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                {label}
              </Link>
            ) : (
              <button key={label} type="button" className={ITEM}>
                <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                {label}
              </button>
            ),
          )}
        </nav>

        {/* Categories — one collapsible per section, driven by the catalog */}
        <div className="flex flex-col gap-3">
          <span className={SECTION}>Categories</span>
          <div className="flex flex-col">
            {sections.map((section) => (
              <CollapsibleSection
                key={section.slug}
                section={section}
                selected={selected}
                onSelect={selectCategory}
              />
            ))}
          </div>
        </div>

        {/* Tags — derived from the skills actually in the catalog */}
        {tags.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className={SECTION}>Tags</span>
            <div className="flex flex-wrap gap-1 px-2">
              {tags.map((tag) => (
                <Tag key={tag} active={activeTags.includes(tag)} onClick={() => onToggleTag(tag)}>
                  {tag}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User */}
      <div className="flex items-center gap-2 px-2 pt-6">
        <Avatar className="size-5">
          <AvatarFallback style={{ backgroundColor: avatarColor(CURRENT_USER) }} />
        </Avatar>
        <span className="text-sm">{CURRENT_USER}</span>
      </div>
    </aside>
  );
}
