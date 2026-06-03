-- 주간/월간 PT 성장 리포트 (회원 조회 + 트레이너 종합 코멘트)
-- Supabase SQL Editor에서 실행

alter table public.monthly_reports
  add column if not exists trainer_summary text;

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  week_start date not null,
  trainer_summary text,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, week_start)
);

create index if not exists idx_weekly_reports_member_week
  on public.weekly_reports (member_id, week_start desc);

drop trigger if exists weekly_reports_set_updated_at on public.weekly_reports;
create trigger weekly_reports_set_updated_at
  before update on public.weekly_reports
  for each row execute function public.set_updated_at();

alter table public.weekly_reports enable row level security;

drop policy if exists "Members read own weekly reports" on public.weekly_reports;
create policy "Members read own weekly reports"
  on public.weekly_reports for select
  using (member_id = auth.uid());

drop policy if exists "Trainers manage member weekly reports" on public.weekly_reports;
create policy "Trainers manage member weekly reports"
  on public.weekly_reports for all
  using (
    trainer_id = auth.uid()
    or public.is_trainer_of_member(weekly_reports.member_id)
  );
