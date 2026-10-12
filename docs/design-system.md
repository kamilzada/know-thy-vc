# Design System: Minimalist Modern, applied to Know Thy VC

Companion to `claude/investor-brief-plan.md`. Set up tokens and primitives in **Milestone 1** and build every screen with them in **Milestone 5**. Don't write one-off hex values or ad-hoc styles in components.

**Personality in one line:** a calm, airy canvas, one electric-blue gradient used sparingly, Calistoga headlines, and slow motion that makes the page feel alive. For Priya it should feel like a private analyst's briefing, not a generic AI chat box.

---

## 0. Brand

- **Name:** Know Thy VC. The name nods to "Know thyself" and "Know thy enemy": old wisdom, delivered with a wink.
- **Wordmark:** Calistoga, `text-xl`, "Know Thy **VC**". Only *VC* gets the signature gradient (`.gradient-text`).
- **Tagline:** *Know thy VC. Walk in prepared.*
- **Favicon / app icon:** a rounded square (`rounded-xl`) in `bg-signature-diag` with a white Calistoga "VC"
- **Page titles:** `Know Thy VC`, `{Investor} · Know Thy VC`, `History · Know Thy VC`
- **Meta description:** "Sourced pre-meeting investor briefs in under two minutes, powered by Gemini Flash."
- **Voice:** confident, brief, and slightly witty in headlines; plain and factual inside the brief itself

---

## 1. Stack additions

- Tailwind CSS v4 (tokens in `@theme` inside `app/globals.css`)
- `class-variance-authority`, `tailwind-merge`, `clsx` → `lib/cn.ts`
- `framer-motion` for entrance and continuous motion
- `lucide-react` icons
- Fonts via `next/font/google`: Calistoga, Inter (400–700), JetBrains Mono (400, 500)

---

## 2. Tokens (single source of truth)

`app/globals.css`
```css
@import "tailwindcss";

@theme {
  --color-background: #FAFAFA;
  --color-foreground: #0F172A;
  --color-muted: #F1F5F9;
  --color-muted-foreground: #64748B;
  --color-accent: #0052FF;
  --color-accent-secondary: #4D7CFF;
  --color-accent-foreground: #FFFFFF;
  --color-border: #E2E8F0;
  --color-card: #FFFFFF;
  --color-ring: #0052FF;
  /* App-specific addition: used ONLY for red-flag severity, never decoration */
  --color-danger: #DC2626;

  --font-display: var(--font-calistoga), Georgia, serif;
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.08);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.1);
  --shadow-accent: 0 4px 14px rgba(0,82,255,0.25);
  --shadow-accent-lg: 0 8px 24px rgba(0,82,255,0.35);

  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

@layer utilities {
  .bg-signature { background-image: linear-gradient(to right, var(--color-accent), var(--color-accent-secondary)); }
  .bg-signature-diag { background-image: linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary)); }
  .gradient-text { background-image: linear-gradient(to right, var(--color-accent), var(--color-accent-secondary));
                   -webkit-background-clip: text; background-clip: text; color: transparent; }
  .dot-pattern { background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 32px 32px; opacity: .03; }
}

body { @apply bg-background text-foreground font-sans antialiased; }

@media print { /* the brief must print or export cleanly */
  .no-print { display: none !important; }
  * { animation: none !important; box-shadow: none !important; }
}
```

**Why `danger`:** the problem statement asks for "red flags". The palette is near-monochrome by design, so red is allowed in exactly one place, the red-flag severity chip. Everything else stays slate and blue.

---

## 3. Primitives (`components/ui/`)

| Component | Variants (cva) | Notes |
|---|---|---|
| `Button` | `primary` (gradient, shadow-accent on hover, lift −0.5, arrow slides right) · `secondary` (outline → muted) · `ghost` | `h-12`/`h-14`, `rounded-xl`, `active:scale-[0.98]`, focus `ring-2 ring-accent ring-offset-2` |
| `Card` | `default` · `elevated` · `featured` (2px gradient border via nested div) | `rounded-2xl`, hover gets a `from-accent/[0.03]` overlay |
| `Input` | default | `h-14 rounded-xl`, placeholder `muted-foreground/50`, visible `<label>` |
| `SectionLabel` | `pulse?: boolean` | pill + dot + mono uppercase `tracking-[0.15em]` |
| `Badge` | `info` (accent) · `watch` (slate) · `red_flag` (danger) · `confidence-high/med/low` | maps straight onto the `Brief` JSON enums |
| `GradientText` | `underline?: boolean` | last word of a headline |
| `SourceChip` | default | mono domain plus date; opens in a new tab |
| `Reveal` / `Stagger` | none | framer-motion wrappers: fadeInUp 0.7s, stagger 0.1, `viewport={{ once:true, amount:.15, margin:"-60px" }}` |

Wrap the app in `<MotionConfig reducedMotion="user">` so every continuous animation honours `prefers-reduced-motion`.

---

## 4. Screen-by-screen application

### A. Home / Generate (`app/page.tsx`)
- **Hero**, `grid lg:grid-cols-[1.1fr_0.9fr]`, `py-28 md:py-44`
  - SectionLabel (pulsing): `LIVE INVESTOR INTEL`
  - H1 in Calistoga at `text-[2.75rem] md:text-6xl lg:text-[5.25rem]` with `leading-[1.05]`: "Walk into every pitch **prepared.**" (gradient text plus underline bar on *prepared.*)
  - Sub copy in Inter, `text-lg text-muted-foreground`: "Name and firm in. A sourced investor brief out, in under two minutes."
  - **The form lives in the hero:** two `Input`s (Investor name, Firm) and a primary `Button` "Know thy VC →". They stack on mobile and sit in a row on `sm+`.
  - Small mono line under the form: `Brief for: {startup.name} · {stage} · {sector}` with an `Edit` ghost link to Settings
- **Hero graphic** (`hidden lg:block`): a rotating dashed ring (60s), with two floating mini-cards bobbing ±10px (5s/4s). One reads "Led Seed · 14 days ago", the other is a red-flag chip. Add a 3×3 dot grid, an accent corner block, and a radial accent glow at 8%.

### B. Generating state (same page, replaces the hero right column / scrolls into view)
- A horizontal **timeline** on md+ (vertical on mobile) with the steps *Resolve → Portfolio · Thesis · Context → Extract → Write → Verify*
  - Steps are joined by small circular accent badges with arrow icons
  - The active step has a pulsing dot. Finished steps get a gradient check icon container. Failed steps get a muted "low data" state.
- A mono **elapsed timer** `00:34 / 02:00`. It quietly proves the "under two minutes" requirement.

### C. Brief view (`components/brief/*`)
1. **Header:** investor name in Calistoga, firm and role in Inter, confidence `Badge`s, and action buttons (Copy Markdown, Download PDF, Regenerate), all `.no-print`
2. **Stats strip, inverted** (`bg-foreground text-background` with `.dot-pattern` and a corner radial glow): `Deals · 90d` / `Sources` / `Generated in` / `Overall confidence`. Numbers in Calistoga `text-4xl`, labels in mono. 2 columns on mobile, 4 on desktop.
3. **Portfolio activity** with SectionLabel `PORTFOLIO · LAST 90 DAYS`: a card grid (1 → 2 → 3 columns, first card spans 2). Each card shows company, round, amount, a relative date, and a SourceChip. Exits get a small `exit` badge. If nothing turns up, an honest empty-state card.
4. **Investment thesis** with SectionLabel `THESIS`: asymmetric `grid-cols-[1.2fr_0.8fr]`. Left is the summary plus sector and stage pills. Right is a quote card with a 120px Calistoga quote mark in `accent/10`, a gradient accent bar, and `rounded-tl-[4rem] rounded-br-[4rem]`.
5. **Context and red flags** with SectionLabel `CONTEXT`: a list of rows, each with a severity Badge (info / watch / red_flag), the point, and a SourceChip. Red flags sort first.
6. **Talking points, inverted section** with SectionLabel `OPEN WITH`, the brief's emotional peak. Three cards; the middle one is offset `md:translate-y-8` and uses the **featured gradient border**. Big Calistoga `01 / 02 / 03` numerals, the opener in `text-xl font-semibold`, "why" in muted text, and an evidence link.
7. **Sources:** a compact list of mono SourceChips grouped by section.
8. **Print/PDF header:** a small "Know Thy VC" wordmark and the generation date, shown only in print.

### D. History (`app/history`)
A grid of standard cards: investor, firm, date, and a deal count. Hover lifts the card and deepens the shadow. Mono search input on top.

### E. Settings (`app/settings`)
One elevated card with startup profile inputs (name, one-liner, sector, stage, raise, traction) and a primary "Save profile" button.

### Nav and footer
A sticky top bar with `bg-background/80 backdrop-blur` and a bottom border. On the left is the **Know Thy VC** wordmark (gradient on *VC*). Links: Generate · History · Settings. Footer in mono: `Know Thy VC · Powered by Gemini Flash · Live data via Tavily & Google Search`. This also signals compliance to examiners.

---

## 5. Motion map

| Element | Motion |
|---|---|
| Sections on scroll | fadeInUp 0.7s, children stagger 0.1s |
| Hero ring | rotate 360° / 60s linear ∞ |
| Hero mini-cards | y ±10px, 5s and 4s easeInOut ∞ |
| Label dots / active step | scale [1,1.3,1], opacity [1,.7,1], 2s ∞ |
| Brief sections arriving | stagger in as each section completes (streamed) |
| Buttons and cards | 200ms lift; cards 300ms shadow deepen |

All continuous motion is off under reduced-motion and in print.

---

## 6. Accessibility checklist
- Accent `#0052FF` on white passes AA. Never put gradient text on body copy, only on headline words and the wordmark's *VC*.
- Every input has a visible label. Errors use `aria-live="polite"`. The progress timeline uses `aria-live` to announce step changes.
- Touch targets are ≥ 44px (`h-12`+); focus rings are always visible.
- Severity is never shown by colour alone: badges carry text ("Red flag").
- Talking-point numerals are decorative (`aria-hidden`), and the list is a real `<ol>`.

---

## 7. Folder additions
```
components/
├─ brand/     Wordmark, Logo
├─ ui/        Button, Card, Input, Badge, SectionLabel, GradientText, SourceChip
├─ motion/    Reveal, Stagger, Float, Pulse
├─ hero/      Hero, HeroGraphic, BriefForm
├─ progress/  ProgressTimeline, ElapsedTimer
└─ brief/     BriefHeader, StatsStrip, PortfolioGrid, ThesisSection,
              ContextList, TalkingPoints, SourcesList
lib/cn.ts
```
