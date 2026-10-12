import type { Brief, StartupProfile } from "./types";

export type FitScore = {
  score: number;
  label: "Strong fit" | "Possible fit" | "Long shot";
  parts: { label: string; points: number; max: number; reason: string }[];
};

/** Words that mean the same sector to an investor. Matching is on these groups, not raw strings. */
const SECTOR_GROUPS = [
  ["d2c", "direct-to-consumer", "direct to consumer", "consumer brand", "consumer brands", "brands"],
  ["consumer", "consumer internet", "consumer tech", "consumer products", "retail", "e-commerce", "ecommerce"],
  ["food", "beverage", "f&b", "snack", "fmcg", "packaged", "cpg"],
  ["fintech", "financial services", "payments", "lending", "insurtech"],
  ["saas", "b2b software", "enterprise software", "software"],
  ["health", "healthtech", "healthcare", "wellness"],
  ["edtech", "education"],
  ["climate", "cleantech", "sustainability", "ev"],
  ["ai", "artificial intelligence", "deep tech", "deeptech"],
  ["logistics", "supply chain", "mobility"],
];

const STAGES = ["pre-seed", "seed", "pre-series a", "series a", "series b", "series c", "growth"];
const STAGE_LABEL: Record<string, string> = {
  "pre-seed": "Pre-seed",
  seed: "Seed",
  "pre-series a": "Pre-Series A",
  "series a": "Series A",
  "series b": "Series B",
  "series c": "Series C",
  growth: "Growth",
};
const stageList = (stages: Iterable<string>) => [...stages].map((s) => STAGE_LABEL[s] ?? s).join(", ");

function groupsIn(text: string): Set<number> {
  const t = ` ${text.toLowerCase()} `;
  const hits = new Set<number>();
  SECTOR_GROUPS.forEach((words, i) => {
    if (words.some((w) => t.includes(w))) hits.add(i);
  });
  return hits;
}

function stagesIn(text: string): Set<string> {
  const t = text.toLowerCase().replace(/series-/g, "series ");
  // Longest names first so "pre-series a" isn't also counted as "series a".
  const found = new Set<string>();
  let rest = t;
  for (const s of [...STAGES].sort((a, b) => b.length - a.length)) {
    if (rest.includes(s)) {
      found.add(s);
      rest = rest.split(s).join(" ");
    }
  }
  return found;
}

/**
 * How well this investor matches the founder's startup, computed in code (no model) from the
 * validated brief, so the number is explainable and the same every time.
 */
export function computeFit(brief: Brief, profile: StartupProfile): FitScore {
  const parts: FitScore["parts"] = [];

  // Sector: 40 points.
  const ours = groupsIn(`${profile.sector} ${profile.oneLiner}`);
  const theirs = groupsIn([...brief.thesis.sectors, brief.thesis.summary].join(" "));
  const shared = [...ours].filter((g) => theirs.has(g));
  const sectorPoints = ours.size === 0 ? 0 : Math.round((40 * Math.min(shared.length, 2)) / Math.min(ours.size, 2));
  parts.push({
    label: "Sector",
    points: sectorPoints,
    max: 40,
    reason: shared.length
      ? `Their focus includes ${shared.map((g) => SECTOR_GROUPS[g][0]).join(" and ")}, like yours.`
      : theirs.size
        ? "Their stated sectors don't overlap with yours."
        : "Their sector focus isn't clear from public sources.",
  });

  // Stage: 30 points.
  const ourStages = stagesIn(profile.stage);
  const theirStages = stagesIn(brief.thesis.stages.join(" ") + " " + brief.thesis.summary);
  const stageMatch = [...ourStages].some((s) => theirStages.has(s));
  parts.push({
    label: "Stage",
    points: stageMatch ? 30 : theirStages.size ? 0 : 10,
    max: 30,
    reason: stageMatch
      ? `They invest at ${stageList([...ourStages].filter((s) => theirStages.has(s)))}, where you are.`
      : theirStages.size
        ? `They focus on ${stageList(theirStages)}; you're ${profile.stage}.`
        : "Their stage focus isn't clear, so this is partial credit.",
  });

  // Recent activity: 20 points. An investor who's deploying is easier to raise from.
  const recent = brief.portfolioActivity.filter((p) => p.type === "investment").length;
  parts.push({
    label: "Deploying now",
    points: recent >= 2 ? 20 : recent === 1 ? 12 : 0,
    max: 20,
    reason: recent ? `${recent} new investment${recent > 1 ? "s" : ""} in the last 90 days.` : "No new investments found in the last 90 days.",
  });

  // Red flags: 10 points, minus 5 per flag.
  const flags = brief.context.filter((c) => c.severity === "red_flag").length;
  parts.push({
    label: "No red flags",
    points: Math.max(0, 10 - flags * 5),
    max: 10,
    reason: flags ? `${flags} red flag${flags > 1 ? "s" : ""} to probe before the meeting.` : "No red flags found in public sources.",
  });

  const score = parts.reduce((sum, p) => sum + p.points, 0);
  return { score, label: score >= 70 ? "Strong fit" : score >= 45 ? "Possible fit" : "Long shot", parts };
}
