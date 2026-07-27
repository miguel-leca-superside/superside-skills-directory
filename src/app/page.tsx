import { AppSidebar } from "@/components/app-sidebar";
import { SkillCard } from "@/components/skill-card";
import { SKILLS } from "@/lib/data";

export default function Home() {
  return (
    <div className="flex h-dvh gap-4 bg-background p-3">
      <AppSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center gap-[38px] rounded-lg border border-border bg-muted px-6 py-12">
          <header className="flex w-full flex-col items-center gap-6 text-center">
            <h1 className="text-2xl font-normal text-foreground">
              Creative / Operational
            </h1>
            <p className="max-w-[600px] text-sm leading-normal text-muted-foreground">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
              ad minim veniam, quis nostrud exercitation ullamco.
            </p>
          </header>

          <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {SKILLS.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
