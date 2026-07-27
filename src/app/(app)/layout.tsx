import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getCatalog } from "@/lib/skills";

// Shared shell (sidebar + cream container) for every page in this group.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { skills, sections, tags } = await getCatalog();
  return (
    <AppShell sections={sections} tags={tags} skills={skills}>
      {children}
    </AppShell>
  );
}
