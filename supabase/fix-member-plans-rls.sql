-- 트레이너가 회원 운동·식단 가이드(member_*_plans)를 저장할 수 있도록 RLS·권한 수정
-- Supabase SQL Editor에서 실행 (migration-member-plans.sql 실행 후에도 재실행 가능)

create or replace function public.is_trainer_of_member(p_member_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trainer_members tm
    where tm.trainer_id = auth.uid() and tm.member_id = p_member_id
  )
  or exists (
    select 1 from public.pt_connections pc
    where pc.trainer_id = auth.uid()
      and pc.member_id = p_member_id
      and pc.status = 'active'
  );
$$;

grant execute on function public.is_trainer_of_member(uuid) to authenticated;

-- 테이블 없으면 생성 (migration-member-plans.sql 과 동일)
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

alter table public.member_workout_plans enable row level security;
alter table public.member_diet_plans enable row level security;
alter table public.member_active_workout enable row level security;

grant select, insert, update, delete on public.member_workout_plans to authenticated;
grant select, insert, update, delete on public.member_diet_plans to authenticated;
grant select, insert, update, delete on public.member_active_workout to authenticated;

-- 회원: 가이드는 읽기만 (일일 기록은 diet_logs / workouts)
drop policy if exists "Members manage own workout plan" on public.member_workout_plans;
drop policy if exists "Members read own workout plan" on public.member_workout_plans;
create policy "Members read own workout plan"
  on public.member_workout_plans for select
  using (member_id = auth.uid());

drop policy if exists "Trainers manage member workout plan" on public.member_workout_plans;
create policy "Trainers manage member workout plan"
  on public.member_workout_plans for all
  using (public.is_trainer_of_member(member_id))
  with check (public.is_trainer_of_member(member_id));

drop policy if exists "Members manage own diet plan" on public.member_diet_plans;
drop policy if exists "Members read own diet plan" on public.member_diet_plans;
create policy "Members read own diet plan"
  on public.member_diet_plans for select
  using (member_id = auth.uid());

drop policy if exists "Trainers manage member diet plan" on public.member_diet_plans;
create policy "Trainers manage member diet plan"
  on public.member_diet_plans for all
  using (public.is_trainer_of_member(member_id))
  with check (public.is_trainer_of_member(member_id));

drop policy if exists "Members manage own active workout" on public.member_active_workout;
create policy "Members manage own active workout"
  on public.member_active_workout for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

drop policy if exists "Trainers read member active workout" on public.member_active_workout;
create policy "Trainers read member active workout"
  on public.member_active_workout for select
  using (public.is_trainer_of_member(member_id));
