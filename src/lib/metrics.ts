// Server-only: per-skill view/install counters, backed by a Redis REST endpoint
// (Vercel KV or Upstash — both speak the same HTTP protocol).
//
// Do NOT import from a Client Component — it reads env tokens and calls fetch.
//
// Degrades gracefully: with no REST env vars set, every write is a no-op and
// getMetrics() reports { configured: false }, so the UI hides the popularity
// sorts instead of showing counts that are all zero. Counters are best-effort —
// a failed increment never breaks the request it's attached to.

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// One Redis hash per metric: field = skill id, value = running count.
const VIEWS_KEY = "skills:views";
const INSTALLS_KEY = "skills:installs";

/** True once a Redis REST endpoint is configured (Vercel KV / Upstash). */
export function metricsConfigured(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

type Command = (string | number)[];

/** Run a single Redis command over the REST API. Always fresh (no caching). */
async function redis(command: Command): Promise<unknown> {
  const res = await fetch(REST_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis command failed (${res.status})`);
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function bump(key: string, id: string): Promise<void> {
  if (!metricsConfigured()) return;
  try {
    await redis(["HINCRBY", key, id, 1]);
  } catch {
    /* best-effort: never fail a page view or download over a counter */
  }
}

/** Count one view of a skill's detail page. */
export const recordView = (id: string): Promise<void> => bump(VIEWS_KEY, id);
/** Count one install of a skill (a .zip download or a CLI-command copy). */
export const recordInstall = (id: string): Promise<void> => bump(INSTALLS_KEY, id);

export type Metrics = {
  configured: boolean;
  views: Record<string, number>;
  installs: Record<string, number>;
};

export type SkillMetrics = { configured: boolean; views: number; installs: number };

/** Read one skill's view + install counts (a light two-field pipeline). */
export async function getSkillMetrics(id: string): Promise<SkillMetrics> {
  if (!metricsConfigured()) return { configured: false, views: 0, installs: 0 };
  try {
    const res = await fetch(`${REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["HGET", VIEWS_KEY, id],
        ["HGET", INSTALLS_KEY, id],
      ]),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`pipeline ${res.status}`);
    const [views, installs] = (await res.json()) as Array<{ result?: unknown }>;
    return {
      configured: true,
      views: Number(views?.result ?? 0) || 0,
      installs: Number(installs?.result ?? 0) || 0,
    };
  } catch {
    return { configured: true, views: 0, installs: 0 };
  }
}

/** Turn Redis HGETALL's flat [field, value, field, value, …] into a map. */
function toMap(flat: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!Array.isArray(flat)) return out;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const field = String(flat[i]);
    const value = Number(flat[i + 1]);
    if (field) out[field] = Number.isFinite(value) ? value : 0;
  }
  return out;
}

/**
 * Read all view + install counts in one pipelined round-trip. Called from the
 * ISR'd home page, so it only runs on background revalidation (~every 5 min),
 * not per request. Returns empty maps (but configured:true) if the read fails.
 */
export async function getMetrics(): Promise<Metrics> {
  if (!metricsConfigured()) return { configured: false, views: {}, installs: {} };
  try {
    const res = await fetch(`${REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["HGETALL", VIEWS_KEY],
        ["HGETALL", INSTALLS_KEY],
      ]),
      // Align with the home page's ISR cadence; regenerated in the background.
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`pipeline ${res.status}`);
    const [views, installs] = (await res.json()) as Array<{ result?: unknown }>;
    return {
      configured: true,
      views: toMap(views?.result),
      installs: toMap(installs?.result),
    };
  } catch {
    return { configured: true, views: {}, installs: {} };
  }
}
