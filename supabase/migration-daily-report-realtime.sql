-- [선택] 일일 리포트: 식단 사진 Storage + Realtime
-- migration-business-reports.sql 실행 후 적용
--
-- ※ migration-rerun-safe.sql 을 이미 실행했다면 이 파일은 실행하지 않아도 됩니다.
--    (rerun-safe.sql 하단에 동일 내용이 포함되어 있습니다)

-- meals 테이블에 사진 URL
alter table public.meals
  add column if not exists photo_url text;

-- diet_logs JSON에도 photo_url 허용 (앱 호환)
comment on column public.meals.photo_url is 'Supabase Storage meal-photos 버킷 public URL';

-- Storage 버킷 (이미 있으면 무시)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS
drop policy if exists "Members upload meal photos" on storage.objects;
create policy "Members upload meal photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members update own meal photos" on storage.objects;
create policy "Members update own meal photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members delete own meal photos" on storage.objects;
create policy "Members delete own meal photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public read meal photos" on storage.objects;
create policy "Public read meal photos"
  on storage.objects for select
  to public
  using (bucket_id = 'meal-photos');

drop policy if exists "Trainers read member meal photos" on storage.objects;
create policy "Trainers read member meal photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'meal-photos'
    and exists (
      select 1 from public.trainer_members tm
      where tm.trainer_id = auth.uid()
        and tm.member_id::text = (storage.foldername(name))[1]
    )
  );

-- Realtime (테이블이 publication에 없을 때만 추가)
do $$
begin
  alter publication supabase_realtime add table public.exercises;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.meals;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.daily_reports;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.workouts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.workout_exercises;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.diet_logs;
exception when duplicate_object then null;
end $$;
