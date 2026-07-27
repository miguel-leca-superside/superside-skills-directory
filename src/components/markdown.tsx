import type { ReactNode } from "react";

// Minimal, dependency-free markdown renderer for the SKILL.md subset we actually
// ship: #–#### headings, paragraphs, ordered/unordered lists, **bold**,
// `inline code`, ```fenced``` blocks, [links](url), and --- rules. It builds React
// elements (never dangerouslySetInnerHTML), so all text is escaped by React and
// there's no XSS surface. Anything fancier degrades gracefully to plain text.

const HEADING_CLS: Record<number, string> = {
  1: "text-xl font-semibold tracking-tight text-foreground",
  2: "text-lg font-semibold tracking-tight text-foreground",
  3: "text-base font-semibold text-foreground",
  4: "text-sm font-semibold text-foreground",
};

// Only allow safe link protocols; anything else renders as plain text.
const SAFE_HREF = /^(https?:\/\/|mailto:|\/|#)/i;

/** Render inline spans: `code`, **bold**, and [text](url). Non-nested (enough for SKILL.md). */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const patterns: {
    re: RegExp;
    render: (m: RegExpExecArray, key: string) => ReactNode;
  }[] = [
    {
      re: /`([^`]+)`/,
      render: (m, key) => (
        <code
          key={key}
          className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {m[1]}
        </code>
      ),
    },
    {
      re: /\*\*([^*]+)\*\*/,
      render: (m, key) => (
        <strong key={key} className="font-semibold text-foreground">
          {m[1]}
        </strong>
      ),
    },
    {
      re: /\[([^\]]+)\]\(([^)]+)\)/,
      render: (m, key) =>
        SAFE_HREF.test(m[2]) ? (
          <a
            key={key}
            href={m[2]}
            target={m[2].startsWith("http") ? "_blank" : undefined}
            rel={m[2].startsWith("http") ? "noreferrer" : undefined}
            className="text-foreground underline underline-offset-2 hover:opacity-70"
          >
            {m[1]}
          </a>
        ) : (
          m[0]
        ),
    },
  ];

  const nodes: ReactNode[] = [];
  let remaining = text;
  let n = 0;
  while (remaining.length > 0) {
    let best: RegExpExecArray | null = null;
    let bestPat: (typeof patterns)[number] | null = null;
    for (const p of patterns) {
      const m = p.re.exec(remaining);
      if (m && (!best || m.index < best.index)) {
        best = m;
        bestPat = p;
      }
    }
    if (!best || !bestPat) {
      nodes.push(remaining);
      break;
    }
    if (best.index > 0) nodes.push(remaining.slice(0, best.index));
    nodes.push(bestPat.render(best, `${keyPrefix}-${n++}`));
    remaining = remaining.slice(best.index + best[0].length);
  }
  return nodes;
}

function isBlockStart(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("```") ||
    /^#{1,4}\s+/.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(t) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line)
  );
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip.
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block.
    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // consume closing fence
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-lg border border-border bg-secondary p-4"
        >
          <code className="font-mono text-[13px] leading-relaxed text-foreground">
            {buf.join("\n")}
          </code>
        </pre>,
      );
      continue;
    }

    // Heading.
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      blocks.push(
        <Tag key={key++} className={HEADING_CLS[level]}>
          {renderInline(h[2].trim(), `h${key}`)}
        </Tag>,
      );
      i++;
      continue;
    }

    // Horizontal rule.
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="border-border" />);
      i++;
      continue;
    }

    // Unordered list.
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul
          key={key++}
          className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-foreground/40"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ul${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol
          key={key++}
          className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-foreground/40"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ol${key}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph — gather until a blank line or the next block starts.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={key++} className="text-sm leading-relaxed text-muted-foreground">
        {renderInline(para.join(" "), `p${key}`)}
      </p>,
    );
  }

  return <div className="flex flex-col gap-4">{blocks}</div>;
}
