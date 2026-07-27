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

export const SKILLS: Skill[] = Array.from({ length: 9 }).map((_, i) => ({
  id: `skill-${i + 1}`,
  name: "Skill Name",
  description: LOREM,
  author: "Miguel Leça",
  tags: ["Illustration", "3D"],
}));
