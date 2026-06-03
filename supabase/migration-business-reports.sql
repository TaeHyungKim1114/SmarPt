  -- =============================================================================
  -- SmarPt: 비즈니스 대시보드 · 저녁 리포트 · 월간 PT 리포트 확장 스키마
  -- Supabase SQL Editor에 붙여넣기 (기존 schema.sql 실행 후 이 파일 실행)
  --
  -- ⚠️ 현재 웹앱은 trainer_members, workouts, diet_logs 를 사용 중입니다.
  --    이 마이그레이션은 Gemini 기획용 테이블을 추가하며, 기존 테이블은 유지합니다.
  -- =============================================================================

  -- -----------------------------------------------------------------------------
  -- 0. 공통: updated_at 자동 갱신
  -- -----------------------------------------------------------------------------
  create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

  -- -----------------------------------------------------------------------------
  -- 1. profiles — owner 역할, updated_at
  -- -----------------------------------------------------------------------------
  alter table public.profiles
    add column if not exists updated_at timestamptz not null default now();

  alter table public.profiles
    drop constraint if exists profiles_role_check;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('trainer', 'member', 'owner'));

  drop trigger if exists profiles_set_updated_at on public.profiles;
  create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

  -- -----------------------------------------------------------------------------
  -- 2. gyms + pt_connections (기존 trainer_members 보완)
  -- -----------------------------------------------------------------------------
  create table if not exists public.gyms (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    owner_id uuid references public.profiles(id) on delete set null,
    address text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  drop trigger if exists gyms_set_updated_at on public.gyms;
  create trigger gyms_set_updated_at
    before update on public.gyms
    for each row execute function public.set_updated_at();

  create table if not exists public.pt_connections (
    id uuid primary key default gen_random_uuid(),
    trainer_id uuid not null references public.profiles(id) on delete cascade,
    member_id uuid not null references public.profiles(id) on delete cascade,
    gym_id uuid references public.gyms(id) on delete set null,
    status text not null default 'active'
      check (status in ('active', 'paused', 'ended')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (trainer_id, member_id)
  );

  create index if not exists idx_pt_connections_gym on public.pt_connections (gym_id);
  create index if not exists idx_pt_connections_member on public.pt_connections (member_id);

  drop trigger if exists pt_connections_set_updated_at on public.pt_connections;
  create trigger pt_connections_set_updated_at
    before update on public.pt_connections
    for each row execute function public.set_updated_at();

  -- 기존 trainer_members → pt_connections 이관 (gym_id 없음)
  insert into public.pt_connections (trainer_id, member_id, gym_id)
  select tm.trainer_id, tm.member_id, null
  from public.trainer_members tm
  on conflict (trainer_id, member_id) do nothing;

  -- -----------------------------------------------------------------------------
  -- 3. exercises / meals (날짜별 · user_id 기준 — 리포트·대시보드 집계용)
  --    앱 입력은 workouts/diet_logs 유지 가능. 필요 시 동기화 함수로 채움.
  -- -----------------------------------------------------------------------------
  create table if not exists public.exercises (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    exercise_date date not null,
    exercise_name text not null,
    set_number int not null default 1 check (set_number > 0),
    weight_kg numeric(8, 2),
    reps int check (reps is null or reps >= 0),
    memo text,
    source_workout_exercise_id uuid references public.workout_exercises(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create index if not exists idx_exercises_user_date
    on public.exercises (user_id, exercise_date);

  drop trigger if exists exercises_set_updated_at on public.exercises;
  create trigger exercises_set_updated_at
    before update on public.exercises
    for each row execute function public.set_updated_at();

  create table if not exists public.meals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    meal_date date not null,
    meal_type text not null
      check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
    foods text not null default '',
    calories int check (calories is null or calories >= 0),
    memo text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create index if not exists idx_meals_user_date
    on public.meals (user_id, meal_date);

  drop trigger if exists meals_set_updated_at on public.meals;
  create trigger meals_set_updated_at
    before update on public.meals
    for each row execute function public.set_updated_at();

  -- -----------------------------------------------------------------------------
  -- 4. daily_reports — 저녁 회원별 하루 요약
  -- -----------------------------------------------------------------------------
  create table if not exists public.daily_reports (
    id uuid primary key default gen_random_uuid(),
    member_id uuid not null references public.profiles(id) on delete cascade,
    trainer_id uuid references public.profiles(id) on delete set null,
    gym_id uuid references public.gyms(id) on delete set null,
    report_date date not null,
    total_workout_volume_kg numeric(12, 2) not null default 0,
    exercise_count int not null default 0,
    diet_score numeric(5, 2) check (diet_score is null or (diet_score >= 0 and diet_score <= 100)),
    meals_logged int not null default 0,
    trainer_memo text,
    trainer_workout_memo text,
    trainer_diet_memo text,
    member_summary text,
    stats jsonb not null default '{}'::jsonb,
    generated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (member_id, report_date)
  );

  create index if not exists idx_daily_reports_date
    on public.daily_reports (report_date desc);

  drop trigger if exists daily_reports_set_updated_at on public.daily_reports;
  create trigger daily_reports_set_updated_at
    before update on public.daily_reports
    for each row execute function public.set_updated_at();

  -- -----------------------------------------------------------------------------
  -- 5. monthly_reports — 월간 PT 성장 리포트
  -- -----------------------------------------------------------------------------
  create table if not exists public.monthly_reports (
    id uuid primary key default gen_random_uuid(),
    member_id uuid not null references public.profiles(id) on delete cascade,
    trainer_id uuid references public.profiles(id) on delete set null,
    gym_id uuid references public.gyms(id) on delete set null,
    report_year int not null check (report_year >= 2000),
    report_month int not null check (report_month between 1 and 12),
    total_attendance_days int not null default 0,
    total_workout_volume_kg numeric(14, 2) not null default 0,
    weight_change_kg numeric(8, 2),
    weight_change_rate_pct numeric(8, 2),
    avg_diet_score numeric(5, 2),
    highlights jsonb not null default '[]'::jsonb,
    stats jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (member_id, report_year, report_month)
  );

  create index if not exists idx_monthly_reports_period
    on public.monthly_reports (report_year, report_month);

  drop trigger if exists monthly_reports_set_updated_at on public.monthly_reports;
  create trigger monthly_reports_set_updated_at
    before update on public.monthly_reports
    for each row execute function public.set_updated_at();

  -- -----------------------------------------------------------------------------
  -- 6. 리포트 생성 헬퍼 (저녁 배치 / Edge Function에서 호출)
  -- -----------------------------------------------------------------------------
  create or replace function public.generate_daily_report(
    p_member_id uuid,
    p_report_date date default current_date
  )
  returns uuid
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_trainer_id uuid;
    v_gym_id uuid;
    v_volume numeric(12, 2);
    v_ex_count int;
    v_meals int;
    v_report_id uuid;
  begin
    select pc.trainer_id, pc.gym_id
    into v_trainer_id, v_gym_id
    from public.pt_connections pc
    where pc.member_id = p_member_id and pc.status = 'active'
    limit 1;

    if v_trainer_id is null then
      select tm.trainer_id into v_trainer_id
      from public.trainer_members tm
      where tm.member_id = p_member_id
      limit 1;
    end if;

    select
      coalesce(sum(coalesce(e.weight_kg, 0) * coalesce(e.reps, 0)), 0),
      count(*)::int
    into v_volume, v_ex_count
    from public.exercises e
    where e.user_id = p_member_id and e.exercise_date = p_report_date;

    if v_ex_count = 0 then
      select
        coalesce(sum(
          (elem->>'weight')::numeric * (elem->>'reps')::numeric
        ), 0),
        count(*)::int
      into v_volume, v_ex_count
      from public.workouts w
      join public.workout_exercises we on we.workout_id = w.id
      cross join lateral jsonb_array_elements(we.sets) elem
      where w.member_id = p_member_id
        and w.workout_date = p_report_date
        and (elem->>'reps') is not null;
    end if;

    select count(*)::int into v_meals
    from public.meals m
    where m.user_id = p_member_id and m.meal_date = p_report_date and m.foods <> '';

    if v_meals = 0 then
      select case
        when dl.meals is not null then jsonb_array_length(dl.meals)
        else 0
      end into v_meals
      from public.diet_logs dl
      where dl.member_id = p_member_id and dl.log_date = p_report_date;
    end if;

    insert into public.daily_reports (
      member_id, trainer_id, gym_id, report_date,
      total_workout_volume_kg, exercise_count, meals_logged,
      diet_score, stats, generated_at
    )
    values (
      p_member_id, v_trainer_id, v_gym_id, p_report_date,
      v_volume, v_ex_count, v_meals,
      least(100, v_meals * 25),
      jsonb_build_object(
        'source', 'generate_daily_report',
        'computed_at', now()
      ),
      now()
    )
    on conflict (member_id, report_date) do update set
      trainer_id = excluded.trainer_id,
      gym_id = excluded.gym_id,
      total_workout_volume_kg = excluded.total_workout_volume_kg,
      exercise_count = excluded.exercise_count,
      meals_logged = excluded.meals_logged,
      diet_score = excluded.diet_score,
      stats = excluded.stats,
      generated_at = now(),
      updated_at = now()
    returning id into v_report_id;

    return v_report_id;
  end;
  $$;

  -- -----------------------------------------------------------------------------
  -- 7. RLS
  -- -----------------------------------------------------------------------------
  alter table public.gyms enable row level security;
  alter table public.pt_connections enable row level security;
  alter table public.exercises enable row level security;
  alter table public.meals enable row level security;
  alter table public.daily_reports enable row level security;
  alter table public.monthly_reports enable row level security;

  -- gyms (재실행 시 policy 중복 방지)
  drop policy if exists "Owners manage own gyms" on public.gyms;
  create policy "Owners manage own gyms"
    on public.gyms for all
    using (owner_id = auth.uid());

  drop policy if exists "Staff read gyms via connection" on public.gyms;
  create policy "Staff read gyms via connection"
    on public.gyms for select
    using (
      exists (
        select 1 from public.pt_connections pc
        where pc.gym_id = gyms.id
          and (pc.trainer_id = auth.uid() or pc.member_id = auth.uid())
      )
      or owner_id = auth.uid()
    );

  -- pt_connections
  drop policy if exists "Participants read own connections" on public.pt_connections;
  create policy "Participants read own connections"
    on public.pt_connections for select
    using (trainer_id = auth.uid() or member_id = auth.uid());

  drop policy if exists "Trainers manage connections" on public.pt_connections;
  create policy "Trainers manage connections"
    on public.pt_connections for all
    using (trainer_id = auth.uid());

  drop policy if exists "Owners read gym connections" on public.pt_connections;
  create policy "Owners read gym connections"
    on public.pt_connections for select
    using (
      exists (
        select 1 from public.gyms g
        where g.id = pt_connections.gym_id and g.owner_id = auth.uid()
      )
    );

  drop policy if exists "Members join connection" on public.pt_connections;
  create policy "Members join connection"
    on public.pt_connections for insert
    with check (member_id = auth.uid());

  -- exercises / meals
  drop policy if exists "Users manage own exercises" on public.exercises;
  create policy "Users manage own exercises"
    on public.exercises for all
    using (user_id = auth.uid());

  drop policy if exists "Trainers read member exercises" on public.exercises;
  create policy "Trainers read member exercises"
    on public.exercises for select
    using (
      exists (
        select 1 from public.pt_connections pc
        where pc.trainer_id = auth.uid() and pc.member_id = exercises.user_id
      )
      or exists (
        select 1 from public.trainer_members tm
        where tm.trainer_id = auth.uid() and tm.member_id = exercises.user_id
      )
    );

  drop policy if exists "Users manage own meals" on public.meals;
  create policy "Users manage own meals"
    on public.meals for all
    using (user_id = auth.uid());

  drop policy if exists "Trainers read member meals" on public.meals;
  create policy "Trainers read member meals"
    on public.meals for select
    using (
      exists (
        select 1 from public.pt_connections pc
        where pc.trainer_id = auth.uid() and pc.member_id = meals.user_id
      )
      or exists (
        select 1 from public.trainer_members tm
        where tm.trainer_id = auth.uid() and tm.member_id = meals.user_id
      )
    );

  -- daily_reports
  drop policy if exists "Members read own daily reports" on public.daily_reports;
  create policy "Members read own daily reports"
    on public.daily_reports for select
    using (member_id = auth.uid());

  drop policy if exists "Trainers manage member daily reports" on public.daily_reports;
  create policy "Trainers manage member daily reports"
    on public.daily_reports for all
    using (
      trainer_id = auth.uid()
      or exists (
        select 1 from public.pt_connections pc
        where pc.trainer_id = auth.uid() and pc.member_id = daily_reports.member_id
      )
      or exists (
        select 1 from public.trainer_members tm
        where tm.trainer_id = auth.uid() and tm.member_id = daily_reports.member_id
      )
    );

  drop policy if exists "Owners read gym daily reports" on public.daily_reports;
  create policy "Owners read gym daily reports"
    on public.daily_reports for select
    using (
      exists (
        select 1 from public.gyms g
        where g.id = daily_reports.gym_id and g.owner_id = auth.uid()
      )
    );

  -- monthly_reports
  drop policy if exists "Members read own monthly reports" on public.monthly_reports;
  create policy "Members read own monthly reports"
    on public.monthly_reports for select
    using (member_id = auth.uid());

  drop policy if exists "Trainers manage member monthly reports" on public.monthly_reports;
  create policy "Trainers manage member monthly reports"
    on public.monthly_reports for all
    using (
      trainer_id = auth.uid()
      or exists (
        select 1 from public.pt_connections pc
        where pc.trainer_id = auth.uid() and pc.member_id = monthly_reports.member_id
      )
      or exists (
        select 1 from public.trainer_members tm
        where tm.trainer_id = auth.uid() and tm.member_id = monthly_reports.member_id
      )
    );

  drop policy if exists "Owners read gym monthly reports" on public.monthly_reports;
  create policy "Owners read gym monthly reports"
    on public.monthly_reports for select
    using (
      exists (
        select 1 from public.gyms g
        where g.id = monthly_reports.gym_id and g.owner_id = auth.uid()
      )
    );

  -- handle_new_user: owner 역할 허용 (기존 트리거는 schema.sql에 있음 — role만 확장됨)
