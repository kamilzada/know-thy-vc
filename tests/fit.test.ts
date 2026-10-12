import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeFit } from "../lib/fit";
import { DEFAULT_STARTUP_PROFILE } from "../lib/startupProfile";
import type { Brief } from "../lib/types";

function brief(overrides: Partial<Brief> = {}): Brief {
  return {
    investor: { name: "Asha Rao", firm: "Example Ventures" },
    generatedAt: "2026-10-12T00:00:00Z",
    portfolioActivity: [],
    olderActivity: [],
    thesis: { summary: "", sectors: [], stages: [], quotes: [], sourceUrls: [] },
    context: [],
    talkingPoints: [],
    confidence: { portfolio: "high", thesis: "high", context: "high" },
    sources: [],
    notes: [],
    validation: { droppedClaims: 0, droppedReasons: [] },
    ...overrides,
  };
}

const deal = { company: "A", type: "investment" as const, date: "2026-10-01", sourceUrl: "https://x.example" };

describe("computeFit", () => {
  it("scores a consumer seed/Series A investor that's deploying as a strong fit", () => {
    const fit = computeFit(
      brief({
        thesis: { summary: "Backs Indian consumer brands", sectors: ["D2C", "Food & beverage"], stages: ["Seed", "Series A"], quotes: [], sourceUrls: [] },
        portfolioActivity: [deal, { ...deal, company: "B" }],
      }),
      DEFAULT_STARTUP_PROFILE,
    );
    assert.equal(fit.score, 100);
    assert.equal(fit.label, "Strong fit");
  });

  it("scores a SaaS growth investor with a red flag as a long shot", () => {
    const fit = computeFit(
      brief({
        thesis: { summary: "", sectors: ["SaaS"], stages: ["Series C", "Growth"], quotes: [], sourceUrls: [] },
        context: [{ point: "Lawsuit", severity: "red_flag", sourceUrl: "https://x.example" }],
      }),
      DEFAULT_STARTUP_PROFILE,
    );
    assert.equal(fit.score, 5);
    assert.equal(fit.label, "Long shot");
  });

  it("doesn't count pre-series a as series a", () => {
    const fit = computeFit(
      brief({ thesis: { summary: "", sectors: [], stages: ["Pre-Series A"], quotes: [], sourceUrls: [] } }),
      { ...DEFAULT_STARTUP_PROFILE, stage: "Series A" },
    );
    assert.equal(fit.parts.find((p) => p.label === "Stage")?.points, 0);
  });
});
