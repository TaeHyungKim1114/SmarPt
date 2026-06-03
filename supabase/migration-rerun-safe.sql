-- 이미 migration-business-reports.sql 을 일부 실행한 뒤 오류(42710 policy exists)가 난 경우
-- 이 파일만 SQL Editor에서 실행하세요. (RLS 정책 + Storage + Realtime)

-- ========== RLS policies (idempotent) ==========
alter table public.gyms enable row level security;
alter table public.pt_connections enable row level security;
alter table public.exercises enable row level security;
alter table public.meals enable row level security;
alter table public.daily_reports
  add column if not exists trainer_workout_memo text,
  add column if not exists trainer_diet_memo text;

alter table public.monthly_reports
  add column if not exists trainer_summary text;

-- weekly_reports: migration-growth-reports.sql 참고

alter table public.daily_reports enable row level security;
alter table public.monthly_reports enable row level security;

drop policy if exists "Owners manage own gyms" on public.gyms;
create policy "Owners manage own gyms" on public.gyms for all using (owner_id = auth.uid());

-- 순환 참조 방지: fix-rls-recursion.sql 의 함수 필요 (아래 create function 블록 참고)
create or replace function public.is_trainer_of_member(p_member_id uuid)
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (select 1 from public.trainer_members tm where tm.trainer_id = auth.uid() and tm.member_id = p_member_id)
  or exists (select 1 from public.pt_connections pc where pc.trainer_id = auth.uid() and pc.member_id = p_member_id and pc.status = 'active');
$$;
create or replace function public.user_can_read_gym(p_gym_id uuid)
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (select 1 from public.gyms g where g.id = p_gym_id and g.owner_id = auth.uid())
  or exists (select 1 from public.pt_connections pc where pc.gym_id = p_gym_id and (pc.trainer_id = auth.uid() or pc.member_id = auth.uid()));
$$;
create or replace function public.user_owns_gym_for_connection(p_gym_id uuid)
returns boolean language sql security definer set search_path = public stable
as $$
  select p_gym_id is null or exists (select 1 from public.gyms g where g.id = p_gym_id and g.owner_id = auth.uid());
$$;
grant execute on function public.is_trainer_of_member(uuid) to authenticated;
grant execute on function public.user_can_read_gym(uuid) to authenticated;
grant execute on function public.user_owns_gym_for_connection(uuid) to authenticated;

drop policy if exists "Staff read gyms via connection" on public.gyms;
create policy "Staff read gyms via connection" on public.gyms for select
  using (owner_id = auth.uid() or public.user_can_read_gym(id));

drop policy if exists "Participants read own connections" on public.pt_connections;
create policy "Participants read own connections" on public.pt_connections for select using (trainer_id = auth.uid() or member_id = auth.uid());

drop policy if exists "Trainers manage connections" on public.pt_connections;
create policy "Trainers manage connections" on public.pt_connections for all using (trainer_id = auth.uid());

drop policy if exists "Owners read gym connections" on public.pt_connections;
create policy "Owners read gym connections" on public.pt_connections for select
  using (public.user_owns_gym_for_connection(gym_id));

drop policy if exists "Members join connection" on public.pt_connections;
create policy "Members join connection" on public.pt_connections for insert with check (member_id = auth.uid());

drop policy if exists "Users manage own exercises" on public.exercises;
create policy "Users manage own exercises" on public.exercises for all using (user_id = auth.uid());

drop policy if exists "Trainers read member exercises" on public.exercises;
create policy "Trainers read member exercises" on public.exercises for select
  using (public.is_trainer_of_member(exercises.user_id));

drop policy if exists "Users manage own meals" on public.meals;
create policy "Users manage own meals" on public.meals for all using (user_id = auth.uid());

drop policy if exists "Trainers read member meals" on public.meals;
create policy "Trainers read member meals" on public.meals for select
  using (public.is_trainer_of_member(meals.user_id));

drop policy if exists "Members read own daily reports" on public.daily_reports;
create policy "Members read own daily reports" on public.daily_reports for select using (member_id = auth.uid());

drop policy if exists "Trainers manage member daily reports" on public.daily_reports;
create policy "Trainers manage member daily reports" on public.daily_reports for all using (
  trainer_id = auth.uid() or public.is_trainer_of_member(daily_reports.member_id)
);

drop policy if exists "Owners read gym daily reports" on public.daily_reports;
create policy "Owners read gym daily reports" on public.daily_reports for select using (
  gym_id is not null and public.user_owns_gym_for_connection(gym_id)
);

drop policy if exists "Members read own monthly reports" on public.monthly_reports;
create policy "Members read own monthly reports" on public.monthly_reports for select using (member_id = auth.uid());

drop policy if exists "Trainers manage member monthly reports" on public.monthly_reports;
create policy "Trainers manage member monthly reports" on public.monthly_reports for all using (
  trainer_id = auth.uid() or public.is_trainer_of_member(monthly_reports.member_id)
);

drop policy if exists "Owners read gym monthly reports" on public.monthly_reports;
create policy "Owners read gym monthly reports" on public.monthly_reports for select using (
  gym_id is not null and public.user_owns_gym_for_connection(gym_id)
);

-- ========== 일일 리포트 Storage + Realtime ==========
alter table public.meals add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members upload meal photos" on storage.objects;
create policy "Members upload meal photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members update own meal photos" on storage.objects;
create policy "Members update own meal photos" on storage.objects for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members delete own meal photos" on storage.objects;
create policy "Members delete own meal photos" on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Public read meal photos" on storage.objects;
create policy "Public read meal photos" on storage.objects for select to public using (bucket_id = 'meal-photos');

drop policy if exists "Trainers read member meal photos" on storage.objects;
create policy "Trainers read member meal photos" on storage.objects for select to authenticated using (
  bucket_id = 'meal-photos' and exists (
    select 1 from public.trainer_members tm
    where tm.trainer_id = auth.uid() and tm.member_id::text = (storage.foldername(name))[1]
  )
);

do $$ begin alter publication supabase_realtime add table public.exercises; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.meals; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.daily_reports; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.workouts; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.workout_exercises; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.diet_logs; exception when duplicate_object then null; end $$;
