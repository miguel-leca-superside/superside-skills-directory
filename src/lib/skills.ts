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
          author:
            (raw.meta.authorName as string) ||
            (raw.meta.author as string) ||
            "Unknown",
          tags,
          section,
          subcategory: sub,
          status: (raw.meta.status as string) || "approved",
          visibility: (raw.meta.visibility as string) || "internal",
          source: (raw.meta.source as string) || "",
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
        raws.push({ section, sub, slug, md, meta });
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

async function fetchBlob(owner: string, repo: string, sha: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
    { headers: ghHeaders() },
  );
  if (!res.ok) {
    throw new Error(`GitHub blob fetch failed (${res.status}) for ${sha}`);
  }
  const data = (await res.json()) as { content: string; encoding: BufferEncoding };
  return Buffer.from(data.content, data.encoding || "base64").toString("utf8");
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
      return { section, sub, slug, md, meta };
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
export async function getCatalog(): Promise<Catalog> {
  if (TOKEN) {
    return assemble(await readFromGitHub(), "github");
  }
  return assemble(await readFromLocal(), "local");
}
