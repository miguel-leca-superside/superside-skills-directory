// POST /api/submit — receives an uploaded skill + metadata, re-validates it, and
// opens a pull request that adds it to `submissions/<name>/` in the registry repo.
//
// Requires SKILLS_SUBMIT_TOKEN: a token with contents:write + pull-requests:write
// on the registry repo. In v2 this becomes a GitHub App; a PAT is fine for now.

import {
  buildSubmissionMeta,
  normalizeUpload,
  validateSkill,
  type SubmissionMeta,
  type UploadFile,
  type VisibilityValue,
  type SourceValue,
} from "@/lib/skill-submission";

const REPO = process.env.SKILLS_REPO || "miguel-leca-superside/superside-skills";
const BASE_BRANCH = process.env.SKILLS_REPO_REF || "main";
const TOKEN = process.env.SKILLS_SUBMIT_TOKEN;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024; // 5 MB guard

const VISIBILITIES: VisibilityValue[] = ["internal", "team-only", "public"];
const SOURCES: SourceValue[] = ["claude.ai", "claude-code", "other"];

function bad(status: number, error: string, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}

async function gh(path: string, init: RequestInit = {}) {
  const [owner, repo] = REPO.split("/");
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "superside-skills-directory",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub ${init.method || "GET"} ${path} failed (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function POST(request: Request) {
  if (!TOKEN) {
    return bad(
      500,
      "Uploads aren't configured yet: set SKILLS_SUBMIT_TOKEN (a token with write access to the registry repo).",
    );
  }

  let body: { files?: UploadFile[]; meta?: Partial<SubmissionMeta> };
  try {
    body = await request.json();
  } catch {
    return bad(400, "Invalid JSON body.");
  }

  const files = body.files;
  const meta = body.meta;
  if (!Array.isArray(files) || files.length === 0) {
    return bad(400, "No files uploaded.");
  }

  const totalBytes = files.reduce((sum, f) => sum + (f.base64?.length ?? 0) * 0.75, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return bad(413, "Upload is too large (max 5 MB).");
  }

  // Validate metadata from the form.
  if (!meta || typeof meta.authorName !== "string" || !meta.authorName.trim()) {
    return bad(400, "Missing submitter name.");
  }
  if (typeof meta.author !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(meta.author)) {
    return bad(400, "A valid submitter email is required.");
  }
  if (typeof meta.team !== "string" || !meta.team.trim()) {
    return bad(400, "Please choose an owning team.");
  }
  if (!VISIBILITIES.includes(meta.visibility as VisibilityValue)) {
    return bad(400, "Invalid visibility.");
  }
  const source: SourceValue = SOURCES.includes(meta.source as SourceValue)
    ? (meta.source as SourceValue)
    : "other";

  // Normalize + authoritatively re-validate the skill (never trust the client).
  let skill;
  try {
    skill = normalizeUpload(files);
  } catch (e) {
    return bad(400, e instanceof Error ? e.message : "Could not read the uploaded skill.");
  }
  const validation = validateSkill(skill);
  if (!validation.ok) {
    return bad(422, "The skill didn't pass validation.", { errors: validation.errors });
  }

  const name = skill.name;
  const submittedAt = new Date().toISOString().slice(0, 10);
  const metaJson = buildSubmissionMeta(
    {
      authorName: meta.authorName.trim(),
      author: meta.author.trim(),
      team: meta.team.trim(),
      visibility: meta.visibility as VisibilityValue,
      source,
    },
    submittedAt,
  );

  // Files to commit: the skill's own files (minus any bundled meta.json) + our sidecar.
  const toCommit: { path: string; base64: string }[] = skill.files
    .filter((f) => f.path !== "meta.json")
    .map((f) => ({ path: `submissions/${name}/${f.path}`, base64: f.base64 }));
  toCommit.push({
    path: `submissions/${name}/meta.json`,
    base64: btoa(JSON.stringify(metaJson, null, 2) + "\n"),
  });

  try {
    // 1. Base commit + tree.
    const baseRef = await gh(`/git/ref/heads/${BASE_BRANCH}`);
    const baseSha: string = baseRef.object.sha;
    const baseCommit = await gh(`/git/commits/${baseSha}`);
    const baseTreeSha: string = baseCommit.tree.sha;

    // 2. Blobs → tree.
    const tree = await Promise.all(
      toCommit.map(async (f) => {
        const blob = await gh(`/git/blobs`, {
          method: "POST",
          body: JSON.stringify({ content: f.base64, encoding: "base64" }),
        });
        return { path: f.path, mode: "100644", type: "blob", sha: blob.sha as string };
      }),
    );
    const newTree = await gh(`/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: baseTreeSha, tree }),
    });

    // 3. Commit → branch.
    const commit = await gh(`/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message: `Submit skill: ${name}`,
        tree: newTree.sha,
        parents: [baseSha],
      }),
    });
    const branch = `submission/${name}-${Date.now()}`;
    await gh(`/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
    });

    // 4. Pull request.
    const prBody = [
      `**New skill submission: \`${name}\`**`,
      "",
      skill.description,
      "",
      "| Field | Value |",
      "| --- | --- |",
      `| Submitted by | ${metaJson.authorName} (${metaJson.author}) |`,
      `| Team | ${metaJson.team} |`,
      `| Visibility | ${metaJson.visibility} |`,
      `| Source | ${metaJson.source} |`,
      "",
      "**To approve:** move the folder into `skills/<section>/<subcategory>/`, add `tags` and set `status: approved` in `meta.json`, then merge.",
    ].join("\n");

    const pr = await gh(`/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: `Submit skill: ${name}`,
        head: branch,
        base: BASE_BRANCH,
        body: prBody,
      }),
    });

    return Response.json({ ok: true, prUrl: pr.html_url as string, name });
  } catch (e) {
    return bad(502, e instanceof Error ? e.message : "Failed to open the pull request.");
  }
}
