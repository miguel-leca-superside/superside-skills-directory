import { DirectoryContent } from "@/components/directory";
import { getCatalog } from "@/lib/skills";

// Re-fetch the registry at most every 5 minutes in production (ISR).
export const revalidate = 300;

export default async function Home() {
  const { skills } = await getCatalog();
  return <DirectoryContent skills={skills} />;
}
