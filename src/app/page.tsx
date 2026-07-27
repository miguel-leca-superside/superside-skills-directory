import { Directory } from "@/components/directory";
import { getCatalog } from "@/lib/skills";

// Re-fetch the registry at most every 5 minutes in production (ISR), so a skill
// approved in the superside-skills repo shows up here on its own — no redeploy.
export const revalidate = 300;

export default async function Home() {
  const { skills, sections, tags } = await getCatalog();
  return <Directory skills={skills} sections={sections} tags={tags} />;
}
