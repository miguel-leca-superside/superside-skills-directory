// GET /api/skills/download/<section>/<sub>/<name> — streams the skill folder as a
// .zip (SKILL.md + any sibling files), so people can grab a skill without the CLI.

import { zipSync } from "fflate";
import { getSkillArchiveFiles } from "@/lib/skills";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  if (slug.length !== 3) {
    return new Response("Not found", { status: 404 });
  }
  const [section, sub, name] = slug;

  const files = await getSkillArchiveFiles(section, sub, name);
  if (files.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  // Nest everything under a top-level <name>/ folder so the unzip lands cleanly.
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    entries[`${name}/${f.path}`] = f.content;
  }
  const zipped = zipSync(entries);
  // Copy into a fresh ArrayBuffer-backed view so the body is a clean BodyInit.
  const body = new Uint8Array(zipped);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}.zip"`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=300",
    },
  });
}
