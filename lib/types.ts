export type Section = "portfolio" | "thesis" | "context";
export type Confidence = "high" | "medium" | "low";
export type Severity = "info" | "watch" | "red_flag";

export type StartupProfile = {
  name: string;
  oneLiner: string;
  sector: string;
  stage: string;
  raiseAmount: string;
  traction: string;
};

/** What the resolver learned about the person before research starts. */
export type Entity = {
  found: boolean;
  fullName: string;
  firm: string;
  role?: string;
  firmUrl?: string;
  linkedinUrl?: string;
  /** Set when several people share the name, or the person isn't at that firm. */
  disambiguation?: string;
  /** "Did you mean…" options when the person couldn't be confirmed at the firm. */
  suggestions: string[];
  sources: SourceRef[];
};

/** One raw search hit, numbered so the model can cite it as [S3]. */
export type SourceRef = {
  id: string;
  url: string;
  title: string;
  date?: string;
  snippet: string;
  section: Section | "overview" | "resolver";
};

export type PortfolioItem = {
  company: string;
  type: "investment" | "exit";
  round?: string;
  amount?: string;
  date: string;
  sourceUrl: string;
};

export type Brief = {
  investor: { name: string; firm: string; role?: string; firmUrl?: string; linkedinUrl?: string };
  generatedAt: string;
  portfolioActivity: PortfolioItem[];
  /** Deals found but older than 90 days, labelled as older in the UI. */
  olderActivity: PortfolioItem[];
  thesis: {
    summary: string;
    sectors: string[];
    stages: string[];
    checkSize?: string;
    quotes: { text: string; sourceUrl: string }[];
    sourceUrls: string[];
  };
  context: { point: string; severity: Severity; sourceUrl: string }[];
  talkingPoints: { opener: string; why: string; evidenceUrl: string }[];
  confidence: Record<Section, Confidence>;
  sources: { url: string; title: string; date?: string; section: Section | "overview" | "resolver" }[];
  notes: string[];
  validation: { droppedClaims: number; droppedReasons: string[] };
};

export type StepId = "resolve" | "portfolio" | "thesis" | "context" | "overview" | "write" | "verify";
export type StepStatus = "active" | "done" | "low" | "error";

/** Server-sent events emitted by /api/brief. */
export type BriefEvent =
  | { type: "step"; step: StepId; status: StepStatus; detail?: string; ms?: number }
  | { type: "resolved"; entity: Entity }
  | { type: "brief"; brief: Brief; cached: boolean; durationMs: number; id?: string }
  | { type: "error"; code: ErrorCode; message: string; suggestions?: string[] };

export type ErrorCode =
  | "invalid_input"
  | "not_found"
  | "missing_config"
  | "rate_limited"
  | "bad_model_output"
  | "upstream"
  | "internal";
