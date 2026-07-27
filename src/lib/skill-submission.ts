// Shared, dependency-free logic for the "Upload a Skill" flow.
// Runs in BOTH the browser (preview/validation before submit) and the API route
// (authoritative re-validation before opening a PR). No node/fetch/DOM here.

export type VisibilityValue = "internal" | "team-only" | "public";
export type SourceValue = "claude.ai" | "claude-code" | "other";

/** A file from the uploaded zip/folder: path relative to the archive root + base64 content. */
export type UploadFile = { path: string; base64: string };

export type NormalizedSkill = {
  /** Frontmatter `name` (falls back to the folder name). This becomes the skill folder. */
  name: string;
  description: string;
  /** The folder name found in the upload (may differ from `name` — we rename to `name`). */
  uploadedFolderName: string;
  /** SKILL.md body text (frontmatter + markdown). */
  skillMd: string;
  /** Files that belong to the skill, paths relative to the skill root, base64 content. */
  files: UploadFile[];
};

export type ValidationResult = { ok: boolean; errors: string[]; warnings: string[] };

export type SubmissionMeta = {
  authorName: string;
  author: string; // email
  team: string;
  visibility: VisibilityValue;
  source: SourceValue;
};

export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const XML_TAG_RE = /<[^>]+>/;
export const RESERVED_WORDS = ["claude", "anthropic"];

/** Decode base64 → UTF-8 string. Works in browser and Node (atob/TextDecoder are global in both). */
export function base64ToText(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Minimal YAML frontmatter reader — enough for our `name`/`description` fields. */
export function parseFrontmatter(md: string): Record<string, string> {
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

/**
 * Turn a raw upload (zip or folder, as {path, base64}[]) into a single normalized
 * skill. Finds the shallowest SKILL.md, treats its directory as the skill root,
 * and keeps only files under that root (dropping __MACOSX/, .DS_Store, etc.).
 * Throws if there's no SKILL.md.
 */
export function normalizeUpload(files: UploadFile[]): NormalizedSkill {
  // Ignore junk the OS/zip tools add.
  const clean = files.filter((f) => {
    const base = f.path.split("/").pop() ?? "";
    return (
      !f.path.startsWith("__MACOSX/") &&
      base !== ".DS_Store" &&
      !f.path.endsWith("/") // directory entries
    );
  });

  const skillMdPaths = clean
    .map((f) => f.path)
    .filter((p) => p === "SKILL.md" || p.endsWith("/SKILL.md"))
    .sort((a, b) => a.split("/").length - b.split("/").length);

  if (skillMdPaths.length === 0) {
    throw new Error("No SKILL.md found in the upload. A skill must contain a SKILL.md file.");
  }

  const skillMdPath = skillMdPaths[0];
  const slash = skillMdPath.lastIndexOf("/");
  const rootPrefix = slash === -1 ? "" : skillMdPath.slice(0, slash + 1); // "" or "my-skill/"
  const uploadedFolderName = rootPrefix ? rootPrefix.slice(0, -1).split("/").pop()! : "";

  const skillFiles = clean
    .filter((f) => f.path.startsWith(rootPrefix))
    .map((f) => ({ path: f.path.slice(rootPrefix.length), base64: f.base64 }));

  const skillMdFile = skillFiles.find((f) => f.path === "SKILL.md")!;
  const skillMd = base64ToText(skillMdFile.base64);
  const fm = parseFrontmatter(skillMd);
  const name = (fm.name || uploadedFolderName || "").trim();

  return {
    name,
    description: (fm.description || "").trim(),
    uploadedFolderName,
    skillMd,
    files: skillFiles,
  };
}

/** Validate a normalized skill against the Agent Skills spec + Anthropic's naming rules. */
export function validateSkill(skill: NormalizedSkill): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = skill.name;
  if (!name) {
    errors.push("SKILL.md frontmatter is missing a `name`.");
  } else {
    if (name.length > 64) errors.push("`name` must be at most 64 characters.");
    if (!NAME_RE.test(name))
      errors.push(
        "`name` must be lowercase letters, numbers, and single hyphens only (no spaces, no leading/trailing/double hyphens).",
      );
    for (const word of RESERVED_WORDS) {
      if (name.includes(word)) errors.push(`\`name\` cannot contain the reserved word "${word}".`);
    }
    if (XML_TAG_RE.test(name)) errors.push("`name` cannot contain angle-bracket tags.");
  }

  const desc = skill.description;
  if (!desc) {
    errors.push("SKILL.md frontmatter is missing a `description`.");
  } else {
    if (desc.length > 1024) errors.push("`description` must be at most 1024 characters.");
    if (XML_TAG_RE.test(desc)) errors.push("`description` cannot contain angle-bracket tags.");
  }

  if (!skill.files.some((f) => f.path === "SKILL.md")) {
    errors.push("Missing SKILL.md at the skill root.");
  }

  if (name && skill.uploadedFolderName && skill.uploadedFolderName !== name) {
    warnings.push(
      `The uploaded folder is "${skill.uploadedFolderName}" but the skill name is "${name}"; it will be filed under "${name}/".`,
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Build the meta.json sidecar for a pending submission. `submittedAt` is an ISO date (server-set).
 * NOTE: the submitter's email is deliberately NOT written here — the registry repo is public,
 * so only the display name (`authorName`) is persisted. The email is still collected for
 * server-side validation but never committed.
 */
export function buildSubmissionMeta(meta: SubmissionMeta, submittedAt: string) {
  return {
    authorName: meta.authorName,
    team: meta.team,
    visibility: meta.visibility,
    source: meta.source,
    status: "pending" as const,
    submittedAt,
  };
}

export const TEAMS = [
  "Creative",
  "Creative Ops",
  "Strategy",
  "Production",
  "QA",
  "PM",
  "Marketing",
  "TPD",
] as const;
