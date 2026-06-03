-- SmarPt Supabase schema
-- Run in Supabase SQL Editor after creating a project

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null check (role in ('trainer', 'member')),
  invite_code text unique,
  created_at timestamptz not null default now()
);

-- Trainer ↔ Member relationship
create table if not exists public.trainer_members (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trainer_id, member_id)
);

-- One workout log per member per day
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  workout_date date not null,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, workout_date)
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  name text not null,
  sets jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  memo text,
  created_at timestamptz not null default now()
);

-- Diet log per day
create table if not exists public.diet_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null,
  meals jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, log_date)
);

-- Chat messages (trainer ↔ member thread)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_thread on public.messages (trainer_id, member_id, created_at);
create index if not exists idx_workouts_member_date on public.workouts (member_id, workout_date);
create index if not exists idx_diet_member_date on public.diet_logs (member_id, log_date);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
  user_name text;
  trainer_code text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'member');
  user_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  if user_role = 'trainer' then
    trainer_code := upper(substr(md5(random()::text), 1, 6));
  end if;

  insert into public.profiles (id, email, full_name, role, invite_code)
  values (new.id, new.email, user_name, user_role, trainer_code)
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;

  -- Link member to trainer if invite code provided
  if user_role = 'member' and (new.raw_user_meta_data->>'invite_code') is not null then
    insert into public.trainer_members (trainer_id, member_id)
    select p.id, new.id
    from public.profiles p
    where p.invite_code = upper(new.raw_user_meta_data->>'invite_code')
      and p.role = 'trainer'
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.trainer_members enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.diet_logs enable row level security;
alter table public.messages enable row level security;

-- Profiles policies
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Trainers can read their members profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.trainer_members tm
      where tm.trainer_id = auth.uid() and tm.member_id = profiles.id
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Members can read their trainer profile"
  on public.profiles for select
  using (
    exists (
      select 1 from public.trainer_members tm
      where tm.member_id = auth.uid() and tm.trainer_id = profiles.id
    )
  );

create policy "Anyone can lookup trainer by invite code"
  on public.profiles for select
  using (role = 'trainer' and invite_code is not null);

-- Trainer members
create policy "Trainers manage their members"
  on public.trainer_members for all
  using (trainer_id = auth.uid());

create policy "Members see their trainer link"
  on public.trainer_members for select
  using (member_id = auth.uid());

create policy "Members can join via invite"
  on public.trainer_members for insert
  with check (member_id = auth.uid());

-- Workouts
create policy "Members manage own workouts"
  on public.workouts for all
  using (member_id = auth.uid());

create policy "Trainers read member workouts"
  on public.workouts for select
  using (
    exists (
      select 1 from public.trainer_members tm
      where tm.trainer_id = auth.uid() and tm.member_id = workouts.member_id
    )
  );

-- Workout exercises
create policy "Members manage own exercises"
  on public.workout_exercises for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id and w.member_id = auth.uid()
    )
  );

create policy "Trainers read member exercises"
  on public.workout_exercises for select
  using (
    exists (
      select 1 from public.workouts w
      join public.trainer_members tm on tm.member_id = w.member_id
      where w.id = workout_exercises.workout_id and tm.trainer_id = auth.uid()
    )
  );

-- Diet logs
create policy "Members manage own diet"
  on public.diet_logs for all
  using (member_id = auth.uid());

create policy "Trainers read member diet"
  on public.diet_logs for select
  using (
    exists (
      select 1 from public.trainer_members tm
      where tm.trainer_id = auth.uid() and tm.member_id = diet_logs.member_id
    )
  );

-- Messages
create policy "Thread participants read messages"
  on public.messages for select
  using (
    (trainer_id = auth.uid() or member_id = auth.uid())
    and exists (
      select 1 from public.trainer_members tm
      where tm.trainer_id = messages.trainer_id and tm.member_id = messages.member_id
    )
  );

create policy "Thread participants send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (trainer_id = auth.uid() or member_id = auth.uid())
    and exists (
      select 1 from public.trainer_members tm
      where tm.trainer_id = messages.trainer_id and tm.member_id = messages.member_id
    )
  );

-- Realtime for chat
alter publication supabase_realtime add table public.messages;
