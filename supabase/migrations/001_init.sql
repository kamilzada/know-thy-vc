-- Know Thy VC: briefs cache and history, plus the founder's startup profile.
-- Sources live inside the brief JSON (plan §0 scope cut).

create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  investor_name text not null,          -- as resolved (display)
  firm text not null,                   -- as resolved (display)
  investor_key text not null,           -- what the user typed, normalised (cache key)
  firm_key text not null,
  profile_hash text not null default '', -- talking points depend on the startup profile
  brief jsonb not null,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists briefs_cache_idx on briefs (investor_key, firm_key, profile_hash, created_at desc);
create index if not exists briefs_recent_idx on briefs (created_at desc);

-- One workspace profile (the app has no accounts), so a fixed key.
create table if not exists startup_profile (
  id text primary key default 'default',
  name text not null,
  one_liner text not null,
  sector text not null,
  stage text not null,
  raise_amount text not null,
  traction text not null,
  updated_at timestamptz not null default now()
);

-- Only the server (service role key) reads and writes. No public access.
alter table briefs enable row level security;
alter table startup_profile enable row level security;
grant all on table briefs, startup_profile to service_role;
