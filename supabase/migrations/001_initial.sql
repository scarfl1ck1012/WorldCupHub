-- World Cup Hub — initial schema

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  favorite_team text,
  country_code text default 'US',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id text not null,
  pick text not null check (pick in ('home', 'draw', 'away')),
  score_home int,
  score_away int,
  points int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, match_id)
);

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  match_id text not null,
  team_code text not null,
  created_at timestamptz default now(),
  unique (user_id, match_id)
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text default 'My Bracket',
  bracket jsonb not null,
  champion text,
  created_at timestamptz default now()
);

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  game_type text not null,
  score int not null default 0,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.bingo_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  cells jsonb not null,
  marked jsonb default '[]',
  completed boolean default false,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Leaderboard view
create or replace view public.prediction_leaderboard with (security_invoker = true) as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  coalesce(sum(pr.points), 0) as total_points,
  count(pr.id) as predictions_count
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
group by p.id, p.display_name, p.avatar_url
order by total_points desc;

-- RLS
alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.user_favorites enable row level security;
alter table public.simulations enable row level security;
alter table public.game_scores enable row level security;
alter table public.bingo_cards enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Predictions viewable by everyone"
  on public.predictions for select using (true);

create policy "Users manage own predictions"
  on public.predictions for all using (auth.uid() = user_id);

create policy "Favorites viewable by owner"
  on public.user_favorites for select using (auth.uid() = user_id);

create policy "Users manage own favorites"
  on public.user_favorites for all using (auth.uid() = user_id);

create policy "Simulations viewable by everyone"
  on public.simulations for select using (true);

create policy "Users manage own simulations"
  on public.simulations for all using (auth.uid() = user_id);

create policy "Game scores viewable by everyone"
  on public.game_scores for select using (true);

create policy "Users manage own game scores"
  on public.game_scores for all using (auth.uid() = user_id);

create policy "Bingo cards by owner"
  on public.bingo_cards for all using (auth.uid() = user_id);
