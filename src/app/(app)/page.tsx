import { DirectoryContent } from "@/components/directory";
import { getCatalog } from "@/lib/skills";
import { getMetrics } from "@/lib/metrics";

// Re-fetch the registry at most every 5 minutes in production (ISR). View/install
// counts refresh on the same cadence (they only feed the sort order, so a few
// minutes of staleness is fine).
export const revalidate = 300;

export default async function Home() {
  const [{ skills }, metrics] = await Promise.all([getCatalog(), getMetrics()]);
  return <DirectoryContent skills={skills} metrics={metrics} />;
}
