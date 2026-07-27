// Types + presentation config for the skills catalog.
// This module is client-safe: types, plain constants, and pure functions only.
// The actual catalog data is read from the filesystem in `src/lib/skills.ts`
// (server-only) and passed down as props.

export type Skill = {
  /** Stable unique id: "<section>/<subcategory>/<slug>". */
  id: string;
  /** The SKILL.md frontmatter `name` (== the skill's folder name). */
  slug: string;
  /** Human display name derived from the slug, e.g. "Asana Project Setup". */
  name: string;
  description: string;
  /** SKILL.md body (frontmatter stripped) — the markdown shown on the detail page. */
  body: string;
  /** Other files shipped with the skill (relative paths; excludes SKILL.md and meta.json). */
  files: string[];
  /** Display name of the author (from meta.json `authorName`). */
  author: string;
  /** Owning team (from meta.json `team`). */
  team: string;
  tags: string[];
  /** Section slug, from the folder path (e.g. "creative-skills"). */
  section: string;
  /** Subcategory slug, from the folder path (e.g. "operational"). */
  subcategory: string;
  status: string;
  visibility: string;
  source: string;
  /** ISO date the skill was submitted (from meta.json), if known. */
  submittedAt?: string;
  /** ISO date the skill was approved (from meta.json), if known. */
  approvedAt?: string;
};

export type SubcategoryNode = { slug: string; label: string; count: number };
export type SectionNode = {
  slug: string;
  label: string;
  subcategories: SubcategoryNode[];
};

/** Primary nav — static links (behavior wired up separately). */
export const NAV_ITEMS = [
  { label: "Search", icon: "search" },
  { label: "Upload a Skill", icon: "import" },
  { label: "Request a Skill", icon: "plus" },
  { label: "Saved", icon: "bookmark" },
  { label: "Created by me", icon: "layout" },
] as const;

/** Preferred display order of sections; anything unlisted is appended A→Z. */
export const SECTION_ORDER = ["creative-skills", "pm", "marketing", "tpd"];

/** Preferred display order of subcategories within each section. */
export const SUBCATEGORY_ORDER: Record<string, string[]> = {
  "creative-skills": [
    "operational",
    "strategy",
    "concepting-and-exploration",
    "production",
    "delivery-and-quality",
  ],
  pm: ["scoping", "account"],
  marketing: ["branding", "presentation"],
  tpd: ["brand-brain", "brand-models", "superads"],
};

/** Exact labels for known section/subcategory slugs. New slugs fall back to titleCase(). */
const LABEL_OVERRIDES: Record<string, string> = {
  "creative-skills": "Creative Skills",
  operational: "Operational",
  strategy: "Strategy",
  "concepting-and-exploration": "Concepting and Exploration",
  production: "Production",
  "delivery-and-quality": "Delivery & Quality",
  pm: "PM",
  scoping: "Scoping",
  account: "Account",
  marketing: "Marketing",
  branding: "Branding",
  presentation: "Presentation",
  tpd: "TPD",
  "brand-brain": "Brand Brain",
  "brand-models": "Brand Models",
  superads: "SuperAds",
};

const ACRONYMS: Record<string, string> = {
  qbr: "QBR",
  qa: "QA",
  ui: "UI",
  ai: "AI",
  pm: "PM",
  tpd: "TPD",
  superads: "SuperAds",
};
const SMALL_WORDS = new Set(["and", "or", "the", "of", "to", "for", "a", "an", "in", "on"]);

/** Turn a kebab slug into a display string: "qbr-deck-prep" → "QBR Deck Prep". */
export function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((word, i) => {
      if (ACRONYMS[word]) return ACRONYMS[word];
      if (i > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/** Display label for a section/subcategory slug (override first, else titleCase). */
export function slugToLabel(slug: string): string {
  return LABEL_OVERRIDES[slug] ?? titleCase(slug);
}

/** Display title for a skill, derived from its slug/`name` (e.g. "asana-project-setup"). */
export function skillTitleFromSlug(slug: string): string {
  return titleCase(slug);
}

/**
 * Strip a leading YAML frontmatter block (`---\n…\n---`) from a SKILL.md string,
 * returning just the markdown body. Mirrors the frontmatter regex used by the
 * loader's `parseFrontmatter`. If there's no frontmatter, returns the input trimmed.
 */
export function stripFrontmatter(md: string): string {
  return md.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/, "").trim();
}

/** Shown as the page sub-headline when a category has no dedicated copy. */
export const DEFAULT_DESCRIPTION =
  "Browse the skills in this category below, or use the tags to narrow things down.";

/** Sub-headline copy keyed by the "<section>/<subcategory>" slug path. */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "creative-skills/operational":
    "Eliminate platform fragmentation, tool overload, and manual administrative drag. This pillar focuses on project setup, finding information, and automating communication across Asana, Notion, Slack, and Superspace.",
  "creative-skills/strategy":
    "Unpack strategic intent from messy, fragmented multi-platform data streams (Slack, Loom, docs) and deliver clear, actionable creative direction without operational friction.",
  "creative-skills/concepting-and-exploration": `Accelerate the early-stage "blank page" ideation phase, reducing high-ambiguity friction and messy, bloated exploration environments (like 40+ page Figma boards).`,
  "creative-skills/production":
    "Automate highly repetitive, mind-numbing production execution and high-volume asset variations. The largest pillar—organized into 5 focused capabilities. Each capability has its own database with dedicated skills, leads, and champions.",
  "creative-skills/delivery-and-quality":
    "Remove QA/QC, brand compliance, and review bottlenecks that slow creatives down. This is the automated gatekeeper layer designed to catch errors before human review.",
};
