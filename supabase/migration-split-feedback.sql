-- 운동 / 식단 피드백 분리 (daily_reports)
-- Supabase SQL Editor에서 실행

alter table public.daily_reports
  add column if not exists trainer_workout_memo text,
  add column if not exists trainer_diet_memo text;

comment on column public.daily_reports.trainer_workout_memo is '트레이너 운동 피드백';
comment on column public.daily_reports.trainer_diet_memo is '트레이너 식단 피드백';
