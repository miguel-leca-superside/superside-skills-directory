"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SearchModal } from "@/components/search-modal";
import type { SectionNode, Skill } from "@/lib/data";

/** Top-level directory view: browse all/by-category, saved bookmarks, or my own skills. */
export type DirectoryView = "all" | "saved" | "created";

type Filters = {
  /** "" = home (all skills). Otherwise a "<section>/<subcategory>" slug path. */
  selected: string;
  setSelected: (value: string) => void;
  activeTags: string[];
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  /** Open the command-palette search modal (from the sidebar or ⌘K). */
  openSearch: () => void;
  /** Which special view is active (or "all" for normal browsing). */
  view: DirectoryView;
  setView: (view: DirectoryView) => void;
};

const FilterContext = createContext<Filters | null>(null);

/** Read the directory's category/tag filter state. Must be used inside <AppShell>. */
export function useFilters(): Filters {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within <AppShell>");
  return ctx;
}

/**
 * The app shell: sidebar + the cream container. Lives in the (app) route-group
 * layout, so the directory, requests, and upload pages all render *inside* the
 * same container. Filter state is held here (and persists across navigations)
 * so the sidebar works from any route.
 */
export function AppShell({
  sections,
  tags,
  skills,
  children,
}: {
  sections: SectionNode[];
  tags: string[];
  skills: Skill[];
  children: ReactNode;
}) {
  const [selected, setSelected] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [view, setView] = useState<DirectoryView>("all");

  const toggleTag = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  const clearTags = () => setActiveTags([]);
  const openSearch = () => setSearchOpen(true);

  // ⌘K / Ctrl+K toggles search from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <FilterContext.Provider
      value={{
        selected,
        setSelected,
        activeTags,
        toggleTag,
        clearTags,
        openSearch,
        view,
        setView,
      }}
    >
      <div className="flex h-dvh gap-4 bg-background p-3">
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-foreground focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:text-background"
        >
          Skip to content
        </a>
        <AppSidebar sections={sections} tags={tags} totalCount={skills.length} />
        <main id="main" className="no-scrollbar flex-1 overflow-y-auto">
          <div className="min-h-full rounded-2xl border border-border bg-muted">
            {children}
          </div>
        </main>
      </div>
      <SearchModal skills={skills} open={searchOpen} onOpenChange={setSearchOpen} />
    </FilterContext.Provider>
  );
}
