-- 트레이너 → 회원 운동·식단 루틴 + 운동 중 상태 (트레이너 루틴 수정 잠금)
-- Supabase SQL Editor에서 실행 (fix-rls-recursion.sql 의 is_trainer_of_member 필요)

create table if not exists public.member_workout_plans (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.member_diet_plans (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  meals jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.member_active_workout (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  session_date date not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists member_workout_plans_set_updated_at on public.member_workout_plans;
create trigger member_workout_plans_set_updated_at
  before update on public.member_workout_plans
  for each row execute function public.set_updated_at();

drop trigger if exists member_diet_plans_set_updated_at on public.member_diet_plans;
create trigger member_diet_plans_set_updated_at
  before update on public.member_diet_plans
  for each row execute function public.set_updated_at();

alter table public.member_workout_plans enable row level security;
alter table public.member_diet_plans enable row level security;
alter table public.member_active_workout enable row level security;

-- workout plans
drop policy if exists "Members manage own workout plan" on public.member_workout_plans;
create policy "Members manage own workout plan"
  on public.member_workout_plans for all
  using (member_id = auth.uid());

drop policy if exists "Trainers manage member workout plan" on public.member_workout_plans;
create policy "Trainers manage member workout plan"
  on public.member_workout_plans for all
  using (public.is_trainer_of_member(member_id));

-- diet plans
drop policy if exists "Members manage own diet plan" on public.member_diet_plans;
create policy "Members manage own diet plan"
  on public.member_diet_plans for all
  using (member_id = auth.uid());

drop policy if exists "Trainers manage member diet plan" on public.member_diet_plans;
create policy "Trainers manage member diet plan"
  on public.member_diet_plans for all
  using (public.is_trainer_of_member(member_id));

-- active workout (member writes, trainer reads)
drop policy if exists "Members manage own active workout" on public.member_active_workout;
create policy "Members manage own active workout"
  on public.member_active_workout for all
  using (member_id = auth.uid());

drop policy if exists "Trainers read member active workout" on public.member_active_workout;
create policy "Trainers read member active workout"
  on public.member_active_workout for select
  using (public.is_trainer_of_member(member_id));
