-- RLS 무한 재귀 수정 (gyms ↔ pt_connections 순환 참조)
-- 오류: infinite recursion detected in policy for relation "pt_connections"
-- Supabase SQL Editor에서 실행

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

create or replace function public.user_can_read_gym(p_gym_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.gyms g
    where g.id = p_gym_id and g.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.pt_connections pc
    where pc.gym_id = p_gym_id
      and (pc.trainer_id = auth.uid() or pc.member_id = auth.uid())
  );
$$;

create or replace function public.user_owns_gym_for_connection(p_gym_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_gym_id is null
    or exists (
      select 1 from public.gyms g
      where g.id = p_gym_id and g.owner_id = auth.uid()
    );
$$;

grant execute on function public.is_trainer_of_member(uuid) to authenticated;
grant execute on function public.user_can_read_gym(uuid) to authenticated;
grant execute on function public.user_owns_gym_for_connection(uuid) to authenticated;

-- gyms
drop policy if exists "Staff read gyms via connection" on public.gyms;
create policy "Staff read gyms via connection"
  on public.gyms for select
  using (owner_id = auth.uid() or public.user_can_read_gym(id));

-- pt_connections
drop policy if exists "Owners read gym connections" on public.pt_connections;
create policy "Owners read gym connections"
  on public.pt_connections for select
  using (public.user_owns_gym_for_connection(gym_id));

-- exercises
drop policy if exists "Trainers read member exercises" on public.exercises;
create policy "Trainers read member exercises"
  on public.exercises for select
  using (public.is_trainer_of_member(exercises.user_id));

-- meals
drop policy if exists "Trainers read member meals" on public.meals;
create policy "Trainers read member meals"
  on public.meals for select
  using (public.is_trainer_of_member(meals.user_id));

-- daily_reports
drop policy if exists "Trainers manage member daily reports" on public.daily_reports;
create policy "Trainers manage member daily reports"
  on public.daily_reports for all
  using (
    trainer_id = auth.uid()
    or public.is_trainer_of_member(daily_reports.member_id)
  );

drop policy if exists "Owners read gym daily reports" on public.daily_reports;
create policy "Owners read gym daily reports"
  on public.daily_reports for select
  using (
    gym_id is not null and public.user_owns_gym_for_connection(gym_id)
  );

-- monthly_reports
drop policy if exists "Trainers manage member monthly reports" on public.monthly_reports;
create policy "Trainers manage member monthly reports"
  on public.monthly_reports for all
  using (
    trainer_id = auth.uid()
    or public.is_trainer_of_member(monthly_reports.member_id)
  );

drop policy if exists "Owners read gym monthly reports" on public.monthly_reports;
create policy "Owners read gym monthly reports"
  on public.monthly_reports for select
  using (
    gym_id is not null and public.user_owns_gym_for_connection(gym_id)
  );
