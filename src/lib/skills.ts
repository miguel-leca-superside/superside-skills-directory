// Server-only: loads the skills catalog for the gallery.
// Do NOT import this from a Client Component — it uses node:fs and env vars.
//
// The catalog lives in a SEPARATE repo (the registry): miguel-leca-superside/superside-skills.
// This module reads it two ways:
//   • Production / anywhere with SKILLS_REPO_TOKEN set → fetch from GitHub at build ("fetch-at-build").
//   • Local dev (no token)                             → read the local sibling checkout of the registry.
// Either way it returns the same shape, so the UI never changes.
//
// Registry layout it reads:  skills/<section>/<subcategory>/<skill-name>/SKILL.md (+ meta.json)
// section/subcategory come from the folder PATH; SKILL.md stays pristine; meta.json is the sidecar.

import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type SectionNode,
  type Skill,
  type SubcategoryNode,
  SECTION_ORDER,
  SUBCATEGORY_ORDER,
  skillTitleFromSlug,
  slugToLabel,
  stripFrontmatter,
} from "@/lib/data";

const REPO = process.env.SKILLS_REPO || "miguel-leca-superside/superside-skills";
const REF = process.env.SKILLS_REPO_REF || "main";
const TOKEN = process.env.SKILLS_REPO_TOKEN || process.env.GITHUB_TOKEN;
// Where a local checkout of the registry lives, relative to the app (dev fallback).
const LOCAL_PATH =
  process.env.SKILLS_LOCAL_PATH || path.join(process.cwd(), "..", "superside-skills");

/** One skill as read from a source, before parsing/shaping. */
type RawSkill = {
  section: string;
  sub: string;
  slug: string;
  md: string;
  meta: Record<string, unknown>;
  /** All files in the skill folder, relative to it (includes SKILL.md/meta.json). */
  files: string[];
};

export type Catalog = {
  skills: Skill[];
  sections: SectionNode[];
  tags: string[];
  /** Which source the catalog came from — handy for debugging. */
  source: "github" | "local";
};

// ---------------------------------------------------------------------------
// Parsing helpers (shared by both sources)
// ---------------------------------------------------------------------------

/** Minimal YAML frontmatter reader — enough for our `name`/`description` fields. */
function parseFrontmatter(md: string): Record<string, string> {
  const match = md.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const out: Record<string, string> = {};
  if (!match) return out;
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

function tagsOf(meta: Record<string, unknown>): string[] {
  return Array.isArray(meta.tags)
    ? (meta.tags as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
}

/** Sort `items` by their position in `order`; unlisted items go last, A→Z. */
function byOrder(items: string[], order: string[] = []): string[] {
  return [...items].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

/** Turn raw entries into the ordered, labeled catalog the UI expects. */
function assemble(raws: RawSkill[], source: Catalog["source"]): Catalog {
  const bySection = new Map<string, Map<string, RawSkill[]>>();
  for (const raw of raws) {
    if (!bySection.has(raw.section)) bySection.set(raw.section, new Map());
    const subMap = bySection.get(raw.section)!;
    if (!subMap.has(raw.sub)) subMap.set(raw.sub, []);
    subMap.get(raw.sub)!.push(raw);
  }

  const skills: Skill[] = [];
  const sections: SectionNode[] = [];
  const tagSet = new Set<string>();

  for (const section of byOrder([...bySection.keys()], SECTION_ORDER)) {
    const subMap = bySection.get(section)!;
    const subNodes: SubcategoryNode[] = [];

    for (const sub of byOrder([...subMap.keys()], SUBCATEGORY_ORDER[section])) {
      const list = subMap
        .get(sub)!
        .sort((a, b) => a.slug.localeCompare(b.slug));

      for (const raw of list) {
        const fm = parseFrontmatter(raw.md);
        const name = fm.name || raw.slug;
        const tags = tagsOf(raw.meta);
        tags.forEach((t) => tagSet.add(t));

        skills.push({
          id: `${section}/${sub}/${name}`,
          slug: name,
          name: skillTitleFromSlug(name),
          description: fm.description || "",
          body: stripFrontmatter(raw.md),
          files: raw.files
            .filter((f) => f !== "SKILL.md" && f !== "meta.json")
            .sort((a, b) => a.localeCompare(b)),
          author:
            (raw.meta.authorName as string) ||
            (raw.meta.author as string) ||
            "Unknown",
          team: (raw.meta.team as string) || "",
          tags,
          section,
          subcategory: sub,
          status: (raw.meta.status as string) || "approved",
          visibility: (raw.meta.visibility as string) || "internal",
          source: (raw.meta.source as string) || "",
          submittedAt: (raw.meta.submittedAt as string) || undefined,
          approvedAt: (raw.meta.approvedAt as string) || undefined,
        });
      }

      subNodes.push({ slug: sub, label: slugToLabel(sub), count: list.length });
    }

    sections.push({
      slug: section,
      label: slugToLabel(section),
      subcategories: subNodes,
    });
  }

  return {
    skills,
    sections,
    tags: [...tagSet].sort((a, b) => a.localeCompare(b)),
    source,
  };
}

// ---------------------------------------------------------------------------
// Source: local filesystem checkout (dev fallback)
// ---------------------------------------------------------------------------

async function readSubdirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/** List every file under `dir`, as paths relative to `dir` (skips OS junk). */
async function listFilesRecursive(dir: string, prefix = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(path.join(dir, entry.name), rel)));
    } else {
      out.push(rel);
    }
  }
  return out;
}

async function readFromLocal(): Promise<RawSkill[]> {
  const skillsRoot = path.join(LOCAL_PATH, "skills");
  const raws: RawSkill[] = [];

  for (const section of await readSubdirs(skillsRoot)) {
    for (const sub of await readSubdirs(path.join(skillsRoot, section))) {
      for (const slug of await readSubdirs(path.join(skillsRoot, section, sub))) {
        const dir = path.join(skillsRoot, section, sub, slug);
        let md: string;
        try {
          md = await fs.readFile(path.join(dir, "SKILL.md"), "utf8");
        } catch {
          continue; // not a skill folder
        }
        let meta: Record<string, unknown> = {};
        try {
          meta = JSON.parse(await fs.readFile(path.join(dir, "meta.json"), "utf8"));
        } catch {
          /* no/invalid meta.json — treat as empty */
        }
        const files = await listFilesRecursive(dir);
        raws.push({ section, sub, slug, md, meta, files });
      }
    }
  }
  return raws;
}

// ---------------------------------------------------------------------------
// Source: GitHub (fetch-at-build)
// ---------------------------------------------------------------------------

function ghHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "superside-skills-directory",
  };
}

async function fetchBlobRaw(owner: string, repo: string, sha: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
    { headers: ghHeaders() },
  );
  if (!res.ok) {
    throw new Error(`GitHub blob fetch failed (${res.status}) for ${sha}`);
  }
  const data = (await res.json()) as { content: string; encoding: BufferEncoding };
  return Buffer.from(data.content, data.encoding || "base64");
}

async function fetchBlob(owner: string, repo: string, sha: string): Promise<string> {
  return (await fetchBlobRaw(owner, repo, sha)).toString("utf8");
}

async function readFromGitHub(): Promise<RawSkill[]> {
  const [owner, repo] = REPO.split("/");
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${REF}?recursive=1`,
    { headers: ghHeaders() },
  );
  if (!treeRes.ok) {
    throw new Error(
      `GitHub tree fetch failed (${treeRes.status}) for ${REPO}@${REF}. ` +
        `Check SKILLS_REPO_TOKEN has read access to the private repo.`,
    );
  }
  const tree = (await treeRes.json()) as {
    truncated: boolean;
    tree: { path: string; type: string; sha: string }[];
  };
  if (tree.truncated) {
    throw new Error("Skills repo tree is truncated — too many files for one request.");
  }

  const shaByPath = new Map<string, string>();
  for (const item of tree.tree) {
    if (item.type === "blob") shaByPath.set(item.path, item.sha);
  }

  // Match exactly skills/<section>/<subcategory>/<slug>/SKILL.md (ignores submissions/, templates/, etc.)
  const skillMdPaths = [...shaByPath.keys()].filter((p) =>
    /^skills\/[^/]+\/[^/]+\/[^/]+\/SKILL\.md$/.test(p),
  );

  const allPaths = [...shaByPath.keys()];

  return Promise.all(
    skillMdPaths.map(async (mdPath) => {
      const [, section, sub, slug] = mdPath.split("/");
      const md = await fetchBlob(owner, repo, shaByPath.get(mdPath)!);
      const metaSha = shaByPath.get(`skills/${section}/${sub}/${slug}/meta.json`);
      let meta: Record<string, unknown> = {};
      if (metaSha) {
        try {
          meta = JSON.parse(await fetchBlob(owner, repo, metaSha));
        } catch {
          /* invalid meta.json — treat as empty */
        }
      }
      // Files in this skill's folder, relative to it — derived from the tree we already have.
      const folder = `skills/${section}/${sub}/${slug}/`;
      const files = allPaths
        .filter((p) => p.startsWith(folder))
        .map((p) => p.slice(folder.length));
      return { section, sub, slug, md, meta, files };
    }),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read the approved catalog from the registry. Fetches from GitHub when a
 * token is configured (production), otherwise reads the local sibling
 * checkout (dev). Returns the same shape either way.
 */
export const getCatalog = cache(async (): Promise<Catalog> => {
  if (TOKEN) {
    return assemble(await readFromGitHub(), "github");
  }
  return assemble(await readFromLocal(), "local");
});

/** A single file's bytes, path relative to the skill folder. */
export type ArchiveFile = { path: string; content: Uint8Array };

// URL segments are untrusted — allow only plain slug characters (no "/" or "..").
const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

/**
 * Read every file belonging to one skill folder (SKILL.md + siblings), for zipping
 * into a download. Returns paths relative to the skill folder with raw bytes.
 * Returns an empty array when the folder doesn't exist or a segment is unsafe.
 */
export async function getSkillArchiveFiles(
  section: string,
  sub: string,
  slug: string,
): Promise<ArchiveFile[]> {
  if (![section, sub, slug].every((s) => SAFE_SEGMENT.test(s))) return [];

  if (TOKEN) {
    const [owner, repo] = REPO.split("/");
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${REF}?recursive=1`,
      { headers: ghHeaders() },
    );
    if (!treeRes.ok) return [];
    const tree = (await treeRes.json()) as {
      tree: { path: string; type: string; sha: string }[];
    };
    const folder = `skills/${section}/${sub}/${slug}/`;
    const blobs = tree.tree.filter((i) => i.type === "blob" && i.path.startsWith(folder));
    return Promise.all(
      blobs.map(async (b) => ({
        path: b.path.slice(folder.length),
        content: new Uint8Array(await fetchBlobRaw(owner, repo, b.sha)),
      })),
    );
  }

  const dir = path.join(LOCAL_PATH, "skills", section, sub, slug);
  const rels = await listFilesRecursive(dir);
  return Promise.all(
    rels.map(async (rel) => ({
      path: rel,
      content: new Uint8Array(await fs.readFile(path.join(dir, rel))),
    })),
  );
}
