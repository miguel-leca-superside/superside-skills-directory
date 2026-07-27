// Server-only: skill requests are GitHub Issues (labeled `skill-request`) in the
// registry repo. Reading needs a read token; creating needs a write token.
// Do NOT import from a Client Component — uses env tokens + fetch to GitHub.

const REPO = process.env.SKILLS_REPO || "miguel-leca-superside/superside-skills";
const READ_TOKEN = process.env.SKILLS_REPO_TOKEN || process.env.SKILLS_SUBMIT_TOKEN;
const WRITE_TOKEN = process.env.SKILLS_SUBMIT_TOKEN;
export const REQUEST_LABEL = "skill-request";

export type SkillRequest = {
  number: number;
  title: string;
  description: string;
  requester: string;
  createdAt: string;
  upvotes: number;
  url: string;
};

const REQUESTER_RE = /\n*<!--\s*superside-request name="([^"]*)"(?:\s+email="([^"]*)")?\s*-->\s*$/;

/** Embed submitter attribution as an HTML comment (invisible in GitHub's rendered markdown). */
export function encodeRequestBody(description: string, name: string, email: string): string {
  const marker = `<!-- superside-request name="${name.replace(/"/g, "")}" email="${email.replace(/"/g, "")}" -->`;
  return `${description.trim()}\n\n${marker}`;
}

function decodeRequest(issue: {
  number: number;
  title: string;
  body: string | null;
  user: { login: string } | null;
  created_at: string;
  html_url: string;
  reactions?: { "+1"?: number };
}): SkillRequest {
  const rawBody = issue.body ?? "";
  const match = rawBody.match(REQUESTER_RE);
  const requester = match?.[1]?.trim() || issue.user?.login || "Someone";
  const description = rawBody.replace(REQUESTER_RE, "").trim();
  return {
    number: issue.number,
    title: issue.title,
    description,
    requester,
    createdAt: issue.created_at,
    upvotes: issue.reactions?.["+1"] ?? 0,
    url: issue.html_url,
  };
}

async function gh(path: string, token: string | undefined, init: RequestInit = {}) {
  const [owner, repo] = REPO.split("/");
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "superside-skills-directory",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  return res;
}

export type RequestsResult = { configured: boolean; requests: SkillRequest[]; error?: string };

/** List open skill requests, newest first. */
export async function getRequests(): Promise<RequestsResult> {
  if (!READ_TOKEN) return { configured: false, requests: [] };
  try {
    const res = await gh(
      `/issues?labels=${REQUEST_LABEL}&state=open&sort=created&direction=desc&per_page=100`,
      READ_TOKEN,
    );
    if (!res.ok) {
      return { configured: true, requests: [], error: `GitHub returned ${res.status}` };
    }
    const issues = (await res.json()) as Array<Parameters<typeof decodeRequest>[0] & { pull_request?: unknown }>;
    // The issues endpoint also returns PRs — drop them.
    const requests = issues.filter((i) => !i.pull_request).map(decodeRequest);
    return { configured: true, requests };
  } catch (e) {
    return { configured: true, requests: [], error: e instanceof Error ? e.message : "fetch failed" };
  }
}

/** Ensure the `skill-request` label exists (idempotent), then create the request issue. */
export async function createRequest(input: {
  title: string;
  description: string;
  name: string;
  email: string;
}): Promise<{ url: string; number: number }> {
  if (!WRITE_TOKEN) {
    throw new Error(
      "Requests aren't configured yet: set SKILLS_SUBMIT_TOKEN (a token with issues:write on the registry repo).",
    );
  }

  // Create the label if it's missing (ignore "already exists").
  const labelRes = await gh(`/labels`, WRITE_TOKEN, {
    method: "POST",
    body: JSON.stringify({
      name: REQUEST_LABEL,
      color: "a2eeef",
      description: "A skill someone has requested",
    }),
  });
  if (!labelRes.ok && labelRes.status !== 422) {
    throw new Error(`Could not ensure the ${REQUEST_LABEL} label (${labelRes.status}).`);
  }

  const res = await gh(`/issues`, WRITE_TOKEN, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      body: encodeRequestBody(input.description, input.name, input.email),
      labels: [REQUEST_LABEL],
    }),
  });
  if (!res.ok) {
    throw new Error(`GitHub could not create the issue (${res.status}): ${await res.text()}`);
  }
  const issue = (await res.json()) as { html_url: string; number: number };
  return { url: issue.html_url, number: issue.number };
}
