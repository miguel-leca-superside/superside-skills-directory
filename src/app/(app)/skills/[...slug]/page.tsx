import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillDetail } from "@/components/skill-detail";
import { getCatalog } from "@/lib/skills";
import { getSkillMetrics } from "@/lib/metrics";

// Match the home page's ISR cadence so a newly-approved skill's page appears
// on its own within ~5 minutes, no redeploy needed.
export const revalidate = 300;

type Params = { slug: string[] };

// Prerender a page for every skill in the catalog at build time.
export async function generateStaticParams() {
  const { skills } = await getCatalog();
  return skills.map((skill) => ({ slug: skill.id.split("/") }));
}

async function findSkill(slug: string[]) {
  const id = slug.join("/");
  const { skills } = await getCatalog();
  return skills.find((s) => s.id === id) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = await findSkill(slug);
  if (!skill) return { title: "Skill not found — Superside Skills Directory" };
  return {
    title: `${skill.name} — Superside Skills Directory`,
    description: skill.description,
  };
}

export default async function SkillPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const skill = await findSkill(slug);
  if (!skill) notFound();
  const metrics = await getSkillMetrics(skill.id);
  return <SkillDetail skill={skill} metrics={metrics} />;
}
