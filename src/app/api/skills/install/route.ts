// POST /api/skills/install — count one install of a skill (the CLI-command
// copy path). The .zip download path is counted server-side in the download
// route itself. Body: { id: "<section>/<subcategory>/<name>" }. Best-effort.

import { recordInstall } from "@/lib/metrics";

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
  await recordInstall(id);
  return Response.json({ ok: true });
}
