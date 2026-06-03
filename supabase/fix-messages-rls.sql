-- 채팅(messages) RLS: trainer_members + pt_connections 모두 허용
-- Supabase SQL Editor에서 fix-rls-recursion.sql 실행 후 이 파일도 실행

create or replace function public.user_in_message_thread(
  p_trainer_id uuid,
  p_member_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select (auth.uid() = p_trainer_id or auth.uid() = p_member_id)
    and (
      exists (
        select 1 from public.trainer_members tm
        where tm.trainer_id = p_trainer_id and tm.member_id = p_member_id
      )
      or exists (
        select 1 from public.pt_connections pc
        where pc.trainer_id = p_trainer_id
          and pc.member_id = p_member_id
          and pc.status = 'active'
      )
    );
$$;

grant execute on function public.user_in_message_thread(uuid, uuid) to authenticated;

drop policy if exists "Thread participants read messages" on public.messages;
create policy "Thread participants read messages"
  on public.messages for select
  using (public.user_in_message_thread(trainer_id, member_id));

drop policy if exists "Thread participants send messages" on public.messages;
create policy "Thread participants send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.user_in_message_thread(trainer_id, member_id)
  );

-- Realtime (이미 있으면 무시)
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
