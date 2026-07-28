// POST /api/skills/view — count one view of a skill's detail page.
// Body: { id: "<section>/<subcategory>/<name>" }. Fired as a beacon from the
// detail page (deduped per session client-side). Best-effort; never throws.

import { recordView } from "@/lib/metrics";

// A skill id is three plain slug segments joined by "/". Validate before it
// becomes a Redis hash field, so the endpoint can't be used to write junk keys.
const SKILL_ID = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

export async function POST(request: Request) {
  let id = "";
  try {
    const body = (await request.json()) as { id?: string };
    id = (body.id ?? "").trim();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!SKILL_ID.test(id)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  await recordView(id);
  return Response.json({ ok: true });
}
