import type { FitScore } from "./fit";
import type { Brief } from "./types";

/** Plain Markdown version of the brief for pasting into notes or email. */
export function briefToMarkdown(brief: Brief, fit: FitScore): string {
  const { investor: inv } = brief;
  const lines: string[] = [
    `# ${inv.name}, ${[inv.role, inv.firm].filter(Boolean).join(", ")}`,
    `_Know Thy VC brief · ${brief.generatedAt.slice(0, 10)} · Fit ${fit.score}/100 (${fit.label})_`,
    "",
    "## Recent portfolio activity (last 90 days)",
    ...(brief.portfolioActivity.length
      ? brief.portfolioActivity.map(
          (p) => `- **${p.company}**${p.type === "exit" ? " (exit)" : ""}: ${[p.round, p.amount].filter(Boolean).join(", ") || "undisclosed"} · ${p.date} · [source](${p.sourceUrl})`,
        )
      : ["- No public deals found in the last 90 days."]),
    ...(brief.olderActivity.length ? ["", "Older:", ...brief.olderActivity.map((p) => `- ${p.company} · ${p.date} · [source](${p.sourceUrl})`)] : []),
    "",
    "## Investment thesis",
    brief.thesis.summary,
    ...(brief.thesis.sectors.length ? [`- Sectors: ${brief.thesis.sectors.join(", ")}`] : []),
    ...(brief.thesis.stages.length ? [`- Stages: ${brief.thesis.stages.join(", ")}`] : []),
    ...(brief.thesis.checkSize ? [`- Cheque size: ${brief.thesis.checkSize}`] : []),
    ...brief.thesis.quotes.map((q) => `> "${q.text}" ([source](${q.sourceUrl}))`),
    "",
    "## Context and red flags",
    ...(brief.context.length
      ? brief.context.map((c) => `- **${c.severity === "red_flag" ? "Red flag" : c.severity === "watch" ? "Watch" : "Info"}**: ${c.point} ([source](${c.sourceUrl}))`)
      : ["- None found in public sources."]),
    "",
    "## Talking points",
    ...brief.talkingPoints.map((t, i) => `${i + 1}. **${t.opener}**\n   ${t.why} ([evidence](${t.evidenceUrl}))`),
    "",
    "## Sources",
    ...brief.sources.map((s) => `- [${s.title || s.url}](${s.url})${s.date ? ` · ${s.date}` : ""}`),
  ];
  if (brief.notes.length) lines.push("", "## Caveats", ...brief.notes.map((n) => `- ${n}`));
  return lines.join("\n");
}
