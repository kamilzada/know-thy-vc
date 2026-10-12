import type { StartupProfile } from "./types";

/** Priya's startup. The home page lets her edit this; edits are sent with each request. */
export const DEFAULT_STARTUP_PROFILE: StartupProfile = {
  name: "Kulhad Co.",
  oneLiner: "A D2C brand selling clean-label regional Indian snacks and beverages online and in modern trade.",
  sector: "D2C consumer brand (food & beverage)",
  stage: "Seed, raising Series A",
  raiseAmount: "₹25 crore Series A",
  traction: "₹1.8 crore monthly revenue, 40% repeat purchase rate, 3x YoY growth",
};

const LIMIT = 300;

/** Accepts a client-supplied profile, falling back to the default for anything missing. */
export function sanitizeProfile(input: unknown): StartupProfile {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const pick = (key: keyof StartupProfile) => {
    const value = raw[key];
    return typeof value === "string" && value.trim() ? value.trim().slice(0, LIMIT) : DEFAULT_STARTUP_PROFILE[key];
  };
  return {
    name: pick("name"),
    oneLiner: pick("oneLiner"),
    sector: pick("sector"),
    stage: pick("stage"),
    raiseAmount: pick("raiseAmount"),
    traction: pick("traction"),
  };
}
