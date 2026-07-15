create table if not exists public.public_explorer_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  approved_display_name text not null default 'Explorer',
  avatar_key text,
  civilization_name text,
  anonymous_attribution boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id)
);

create table if not exists public.universal_objects (
  id uuid primary key default gen_random_uuid(),
  universe_id text not null,
  environment_id text not null,
  universal_object_id text not null,
  entity_type text not null,
  generation_version text not null,
  canonical_discovery_id text,
  canonical_fallback_name text not null,
  registry_version text not null default '1.0.0',
  verified_first_profile_id uuid references public.public_explorer_profiles(id),
  verified_first_civilization_name text,
  verified_first_discovered_at timestamptz,
  public_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint universal_objects_unique_object unique (universe_id, universal_object_id)
);

create table if not exists public.universal_discoveries (
  id uuid primary key default gen_random_uuid(),
  universal_object_id text not null,
  discovery_id text not null,
  entity_type text not null,
  universe_id text not null,
  generation_version text not null,
  first_profile_id uuid references public.public_explorer_profiles(id),
  first_civilization_name text,
  verified_at timestamptz not null default now(),
  request_id uuid not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint universal_discoveries_unique_request unique (request_id),
  constraint universal_discoveries_unique_first unique (universe_id, universal_object_id, discovery_id)
);

create table if not exists public.universal_discovery_milestones (
  id uuid primary key default gen_random_uuid(),
  universe_id text not null,
  universal_object_id text not null,
  milestone_type text not null,
  profile_id uuid references public.public_explorer_profiles(id),
  civilization_name text,
  request_id uuid not null,
  verified_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint universal_milestones_unique_request unique (request_id),
  constraint universal_milestones_unique_first unique (universe_id, universal_object_id, milestone_type)
);

create table if not exists public.universal_names (
  id uuid primary key default gen_random_uuid(),
  universe_id text not null,
  universal_object_id text not null,
  proposed_name text not null,
  proposed_by_profile_id uuid references public.public_explorer_profiles(id),
  moderation_state text not null default 'pending',
  approved_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint universal_names_state check (moderation_state in ('pending','approved','rejected','auto_blocked','reverted'))
);

create table if not exists public.universal_discovery_history (
  id uuid primary key default gen_random_uuid(),
  universe_id text not null,
  universal_object_id text not null,
  event_type text not null,
  public_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.universal_discovery_reports (
  id uuid primary key default gen_random_uuid(),
  universal_object_id text not null,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint universal_reports_status check (status in ('open','reviewing','resolved','dismissed'))
);

create table if not exists public.civilization_discovery_credits (
  id uuid primary key default gen_random_uuid(),
  universe_id text not null,
  universal_object_id text not null,
  civilization_name text not null,
  credit_type text not null,
  awarded_at timestamptz not null default now(),
  public_payload jsonb not null default '{}'::jsonb,
  constraint civilization_discovery_credits_unique unique (universe_id, universal_object_id, civilization_name, credit_type)
);

alter table public.public_explorer_profiles enable row level security;
alter table public.universal_objects enable row level security;
alter table public.universal_discoveries enable row level security;
alter table public.universal_discovery_milestones enable row level security;
alter table public.universal_names enable row level security;
alter table public.universal_discovery_history enable row level security;
alter table public.universal_discovery_reports enable row level security;
alter table public.civilization_discovery_credits enable row level security;

create policy "public can read approved explorer profiles" on public.public_explorer_profiles for select using (true);
create policy "players can manage own explorer profile" on public.public_explorer_profiles for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
create policy "public can read universal objects" on public.universal_objects for select using (true);
create policy "public can read verified discoveries" on public.universal_discoveries for select using (true);
create policy "public can read milestones" on public.universal_discovery_milestones for select using (true);
create policy "public can read approved names" on public.universal_names for select using (moderation_state = 'approved');
create policy "authenticated can propose names" on public.universal_names for insert with check (auth.role() = 'authenticated');
create policy "public can read history" on public.universal_discovery_history for select using (true);
create policy "authenticated can report names" on public.universal_discovery_reports for insert with check (auth.role() = 'authenticated');
create policy "public can read civilization credits" on public.civilization_discovery_credits for select using (true);

create or replace function public.claim_universal_discovery(
  request_id uuid,
  universal_object_id text,
  discovery_id text,
  entity_type text,
  universe_id text,
  generation_version text,
  evidence jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  inserted_record public.universal_discoveries%rowtype;
  existing_record public.universal_discoveries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.public_explorer_profiles(owner_user_id, approved_display_name)
  values (auth.uid(), 'Explorer')
  on conflict(owner_user_id) do update set updated_at = now()
  returning id into profile_id;

  select * into existing_record from public.universal_discoveries d where d.request_id = claim_universal_discovery.request_id;
  if found then
    return jsonb_build_object('universal_object_id', existing_record.universal_object_id, 'discovery_id', existing_record.discovery_id, 'status', 'confirmed');
  end if;

  insert into public.universal_discoveries(universal_object_id, discovery_id, entity_type, universe_id, generation_version, first_profile_id, request_id, evidence)
  values (universal_object_id, discovery_id, entity_type, universe_id, generation_version, profile_id, request_id, coalesce(evidence, '{}'::jsonb))
  on conflict(universe_id, universal_object_id, discovery_id) do nothing
  returning * into inserted_record;

  if inserted_record.id is null then
    select * into existing_record from public.universal_discoveries d
    where d.universe_id = claim_universal_discovery.universe_id
      and d.universal_object_id = claim_universal_discovery.universal_object_id
      and d.discovery_id = claim_universal_discovery.discovery_id;
    return jsonb_build_object('universal_object_id', existing_record.universal_object_id, 'discovery_id', existing_record.discovery_id, 'status', 'already_claimed');
  end if;

  insert into public.universal_discovery_history(universe_id, universal_object_id, event_type, public_payload)
  values (universe_id, universal_object_id, 'first_discovery_confirmed', jsonb_build_object('discovery_id', discovery_id));

  return jsonb_build_object('universal_object_id', inserted_record.universal_object_id, 'discovery_id', inserted_record.discovery_id, 'status', 'confirmed');
end;
$$;
