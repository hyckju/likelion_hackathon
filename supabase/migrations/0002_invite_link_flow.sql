-- 먹(MEOK) 2단계: 초대 링크 흐름에 맞춘 RLS 조정
-- Supabase SQL Editor에서 그대로 실행하세요.

-- 초대 링크는 inviter_id + relation_type만 담고 있고, relationships 행은
-- 아직 없다. 초대받은 사람(partner_id)이 링크를 열고 "수락"하는 순간
-- 본인이 직접 status='accepted' 행을 생성한다 (그 행위 자체가 동의).
drop policy "relationships_insert_as_inviter" on public.relationships;

create policy "relationships_insert_on_accept"
  on public.relationships for insert
  with check (auth.uid() = partner_id and status = 'accepted');

-- 초대 수락 화면에서 "OO님이 당신을 초대했어요"를 보여주려면
-- 아직 관계가 없는 상태에서도 초대한 사람의 이름 정도는 조회할 수 있어야 한다.
-- users 테이블 전체를 열지 않고, 이름만 반환하는 함수로 최소 공개한다.
create function public.get_invite_profile(inviter_id uuid)
returns table(name text)
language sql
stable
security definer set search_path = public
as $$
  select name from public.users where id = inviter_id;
$$;

grant execute on function public.get_invite_profile(uuid) to authenticated;
