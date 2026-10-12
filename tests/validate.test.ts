import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentResult } from "../lib/agents/research";
import type { DraftBrief } from "../lib/agents/synthesize";
import { validateInputs } from "../lib/input";
import type { Entity, SourceRef } from "../lib/types";
import { validateBrief } from "../lib/validate";

const NOW = new Date("2026-10-12T12:00:00Z");

const entity: Entity = {
  found: true,
  fullName: "Asha Rao",
  firm: "Example Ventures",
  role: "Partner",
  suggestions: [],
  sources: [],
};

const sources: SourceRef[] = [
  { id: "S1", url: "https://news.example/deal-a", title: "A raises seed", date: "2026-09-20", snippet: "Example Ventures led the round.", section: "portfolio" },
  { id: "S2", url: "https://news.example/deal-b", title: "B raises", date: "2026-03-01", snippet: "", section: "portfolio" },
  { id: "S3", url: "https://blog.example/thesis", title: "Interview", snippet: 'Rao said "we back founders who own their distribution" in the interview.', section: "thesis" },
  { id: "S4", url: "https://news.example/lawsuit", title: "Lawsuit", snippet: "", section: "context" },
];

const ok = (agent: AgentResult["agent"]): AgentResult => ({ agent, ok: true, sources: [] });
const agents = { portfolio: ok("portfolio"), thesis: ok("thesis"), context: ok("context"), overview: ok("overview") };

function draft(overrides: Partial<DraftBrief> = {}): DraftBrief {
  return {
    portfolioActivity: [],
    thesis: { summary: "Backs consumer brands.", sectors: ["Consumer"], stages: ["Seed"], quotes: [], sourceIds: ["S3"] },
    context: [],
    talkingPoints: [
      { opener: "One", why: "w", evidenceSourceId: "S1" },
      { opener: "Two", why: "w", evidenceSourceId: "S3" },
      { opener: "Three", why: "w", evidenceSourceId: "S4" },
    ],
    notes: [],
    ...overrides,
  };
}

describe("validateBrief", () => {
  it("drops claims citing sources we never fetched", () => {
    const brief = validateBrief({
      draft: draft({ context: [{ point: "Made up", severity: "red_flag", sourceId: "S99" }] }),
      entity, sources, agents, now: NOW,
    });
    assert.equal(brief.context.length, 0);
    assert.equal(brief.validation.droppedClaims, 1);
  });

  it("splits deals at 90 days and drops undated or future ones", () => {
    const brief = validateBrief({
      draft: draft({
        portfolioActivity: [
          { company: "A", type: "investment", date: "2026-09-20", sourceId: "S1" },
          { company: "B", type: "investment", date: "2026-03-01", sourceId: "S2" },
          { company: "C", type: "investment", date: "", sourceId: "S1" },
          { company: "D", type: "exit", date: "2027-01-01", sourceId: "S1" },
          { company: "A", type: "investment", date: "2026-09-21", sourceId: "S1" },
        ],
      }),
      entity, sources, agents, now: NOW,
    });
    assert.deepEqual(brief.portfolioActivity.map((p) => p.company), ["A"]);
    assert.deepEqual(brief.olderActivity.map((p) => p.company), ["B"]);
    assert.equal(brief.portfolioActivity[0].sourceUrl, "https://news.example/deal-a");
  });

  it("notes when no deals are in the 90-day window", () => {
    const brief = validateBrief({ draft: draft(), entity, sources, agents, now: NOW });
    assert.ok(brief.notes.some((n) => n.includes("No public deals found in the last 90 days")));
    assert.equal(brief.confidence.portfolio, "low");
  });

  it("keeps only quotes that appear verbatim in the source", () => {
    const brief = validateBrief({
      draft: draft({
        thesis: {
          summary: "s", sectors: [], stages: [], sourceIds: ["S3"],
          quotes: [
            { text: "We back founders who own their distribution", sourceId: "S3" },
            { text: "We only invest in AI", sourceId: "S3" },
          ],
        },
      }),
      entity, sources, agents, now: NOW,
    });
    assert.equal(brief.thesis.quotes.length, 1);
    assert.equal(brief.thesis.quotes[0].sourceUrl, "https://blog.example/thesis");
  });

  it("sorts red flags first and caps talking points at 3", () => {
    const brief = validateBrief({
      draft: draft({
        context: [
          { point: "New fund", severity: "info", sourceId: "S1" },
          { point: "Lawsuit", severity: "red_flag", sourceId: "S4" },
        ],
        talkingPoints: [...draft().talkingPoints, { opener: "Four", why: "w", evidenceSourceId: "S1" }],
      }),
      entity, sources, agents, now: NOW,
    });
    assert.equal(brief.context[0].severity, "red_flag");
    assert.equal(brief.talkingPoints.length, 3);
  });

  it("marks a section low confidence when its agent failed", () => {
    const brief = validateBrief({
      draft: draft(),
      entity, sources, now: NOW,
      agents: { ...agents, context: { agent: "context", ok: false, error: "timed out", sources: [] } },
    });
    assert.equal(brief.confidence.context, "low");
    assert.ok(brief.notes.some((n) => n.startsWith("Context search was unavailable (timed out)")));
  });

  it("replaces an uncited thesis with an honest message", () => {
    const brief = validateBrief({
      draft: draft({ thesis: { summary: "Invented", sectors: ["X"], stages: [], quotes: [], sourceIds: [] } }),
      entity, sources, agents, now: NOW,
    });
    assert.match(brief.thesis.summary, /Not enough public material/);
    assert.deepEqual(brief.thesis.sectors, []);
    assert.equal(brief.confidence.thesis, "low");
  });
});

describe("validateInputs", () => {
  it("rejects empty and one-word names", () => {
    assert.ok(validateInputs("", "Blume").investor);
    assert.ok(validateInputs("Karthik", "Blume").investor);
    assert.ok(validateInputs("Karthik Reddy", "").firm);
  });
  it("accepts a full name and a one-word firm", () => {
    assert.deepEqual(validateInputs("Karthik Reddy", "Blume"), {});
  });
});
