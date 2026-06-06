import { ReactNode } from "react";

// Minimal markdown renderer: ## H2, ### H3, "- " ul, "1. " ol, blank lines = paragraph.
export function renderMarkdown(src: string): ReactNode {
  const lines = (src || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const inline = (text: string) => {
    // bold **x** and italic *x*
    const parts: ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const t = m[0];
      if (t.startsWith("**")) parts.push(<strong key={parts.length}>{t.slice(2, -2)}</strong>);
      else parts.push(<em key={parts.length}>{t.slice(1, -1)}</em>);
      last = m.index + t.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("### ")) {
      blocks.push(<h3 key={key++} className="text-xl font-bold mt-8 mb-3">{inline(line.slice(4))}</h3>);
      i++;
    } else if (line.startsWith("## ")) {
      blocks.push(<h2 key={key++} className="text-2xl md:text-3xl font-black mt-10 mb-4">{inline(line.slice(3))}</h2>);
      i++;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-6 space-y-1.5 my-4 text-foreground/90">
          {items.map((it, ix) => <li key={ix}>{inline(it)}</li>)}
        </ol>
      );
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-6 space-y-1.5 my-4 text-foreground/90">
          {items.map((it, ix) => <li key={ix}>{inline(it)}</li>)}
        </ul>
      );
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("##") && !lines[i].startsWith("- ") && !/^\d+\.\s/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      blocks.push(
        <p key={key++} className="leading-relaxed my-4 text-foreground/85">
          {inline(para.join(" "))}
        </p>
      );
    }
  }
  return <>{blocks}</>;
}

export function slugify(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}