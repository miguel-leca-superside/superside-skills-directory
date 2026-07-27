export type Skill = {
  id: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
};

export const NAV_ITEMS = [
  { label: "Search", icon: "search" },
  { label: "Import a Skill", icon: "import" },
  { label: "Request a Skill", icon: "plus" },
  { label: "Saved", icon: "bookmark" },
  { label: "Created by me", icon: "layout" },
] as const;

export const CATEGORIES = [
  "Creative Skills",
  "Operational",
  "Strategy",
  "Concepting and Exploration",
  "Production",
  "Delivery & Quality",
] as const;

export const FOLDERS: { label: string; children: string[] }[] = [
  { label: "PM", children: ["Scoping", "Account"] },
  { label: "Marketing", children: ["Branding", "Presentation"] },
  { label: "TPD", children: ["Design Systems", "Motion"] },
];

export const TAGS = [
  "Illustration",
  "Presentation",
  "Video",
  "Motion",
  "Krea",
  "Flora",
  "3D",
  "Design Systems",
  "Branding",
  "Scoping",
  "Account",
] as const;

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.";

/** Shown as the page sub-headline when a category has no dedicated copy. */
export const DEFAULT_DESCRIPTION = LOREM;

/** Sub-headline copy keyed by the sidebar selection breadcrumb ("Prefix / Item"). */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Creative / Operational":
    "Eliminate platform fragmentation, tool overload, and manual administrative drag. This pillar focuses on project setup, finding information, and automating communication across Asana, Notion, Slack, and Superspace.",
  "Creative / Strategy":
    "Unpack strategic intent from messy, fragmented multi-platform data streams (Slack, Loom, docs) and deliver clear, actionable creative direction without operational friction.",
  "Creative / Concepting and Exploration": `Accelerate the early-stage "blank page" ideation phase, reducing high-ambiguity friction and messy, bloated exploration environments (like 40+ page Figma boards).`,
  "Creative / Production":
    "Automate highly repetitive, mind-numbing production execution and high-volume asset variations. The largest pillar—organized into 5 focused capabilities. Each capability has its own database with dedicated skills, leads, and champions.",
  "Creative / Delivery & Quality":
    "Remove QA/QC, brand compliance, and review bottlenecks that slow creatives down. This is the automated gatekeeper layer designed to catch errors before human review.",
};

const SKILL_TAGS: string[][] = [
  ["Illustration", "3D", "Motion"],
  ["Presentation", "Branding"],
  ["Video", "Motion", "3D"],
  ["Krea", "Illustration", "3D"],
  ["Flora", "3D"],
  ["Design Systems", "Branding", "Presentation"],
  ["Scoping", "Account"],
  ["Motion", "Video"],
  ["Presentation", "Illustration", "Branding"],
];

export const SKILLS: Skill[] = SKILL_TAGS.map((tags, i) => ({
  id: `skill-${i + 1}`,
  name: "Skill Name",
  description: LOREM,
  author: "Miguel Leça",
  tags,
}));
