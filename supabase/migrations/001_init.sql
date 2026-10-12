-- Know Thy VC: briefs cache and history.
-- Sources live inside the brief JSON (plan §0 scope cut), and the startup profile
-- lives in lib/startupProfile.ts plus the editable panel on the home page.

create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  investor_name text not null,          -- as resolved (display)
  firm text not null,                   -- as resolved (display)
  investor_key text not null,           -- what the user typed, normalised (cache key)
  firm_key text not null,
  brief jsonb not null,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists briefs_cache_idx on briefs (investor_key, firm_key, created_at desc);
create index if not exists briefs_recent_idx on briefs (created_at desc);

-- Only the server (service role key) reads and writes. No public access.
alter table briefs enable row level security;
