// POST /api/requests — opens a GitHub Issue (labeled skill-request) in the registry.

import { createRequest } from "@/lib/requests";

function bad(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  let body: { title?: string; description?: string; name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return bad(400, "Invalid request body.");
  }

  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();

  if (title.length < 4 || title.length > 120) {
    return bad(400, "Give your request a short title (4–120 characters).");
  }
  if (description.length < 10 || description.length > 4000) {
    return bad(400, "Describe the skill you want (at least 10 characters).");
  }
  if (!name) {
    return bad(400, "Please add your name.");
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return bad(400, "That email doesn't look right.");
  }

  try {
    const { url, number } = await createRequest({ title, description, name, email });
    return Response.json({ ok: true, url, number });
  } catch (e) {
    return bad(502, e instanceof Error ? e.message : "Failed to create the request.");
  }
}
