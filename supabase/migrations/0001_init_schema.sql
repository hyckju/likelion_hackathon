-- 먹(MEOK) 1단계: 핵심 테이블 + 최소 RLS
-- Supabase SQL Editor에서 그대로 실행하세요.

create extension if not exists pgcrypto;

-- =========================================================
-- 1. users — auth.users와 1:1, 프로필 정보
-- =========================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text,
  birth_year int,
  gender text,
  created_at timestamptz not null default now()
);

-- auth.users에 새 계정이 생기면 public.users 프로필 행을 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- 2. relationships — user_id가 초대한 사람, relation_type은
--    "partner_id가 user_id에게 무엇인지" (예: 딸이 엄마를 초대하면
--    user_id=딸, partner_id=엄마, relation_type='엄마')
-- =========================================================
create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  partner_id uuid not null references public.users(id) on delete cascade,
  relation_type text not null check (relation_type in ('딸','아들','엄마','아빠','친구')),
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  constraint relationships_no_self check (user_id <> partner_id),
  constraint relationships_unique_pair unique (user_id, partner_id)
);

create index relationships_user_id_idx on public.relationships(user_id);
create index relationships_partner_id_idx on public.relationships(partner_id);

-- 두 사용자가 accepted 관계로 연결되어 있는지 확인하는 헬퍼
-- (security definer로 relationships 자체의 RLS를 우회 — 정책 재귀 방지)
create function public.are_connected(uid1 uuid, uid2 uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.relationships
    where status = 'accepted'
      and ((user_id = uid1 and partner_id = uid2) or (user_id = uid2 and partner_id = uid1))
  );
$$;

-- =========================================================
-- 3. supplements
-- =========================================================
create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  dose_times_per_day int not null default 1 check (dose_times_per_day > 0),
  total_quantity int not null check (total_quantity >= 0),
  start_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index supplements_user_id_idx on public.supplements(user_id);

-- =========================================================
-- 4. schedules
-- =========================================================
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  scheduled_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending','completed','missed')),
  created_at timestamptz not null default now()
);

create index schedules_supplement_id_idx on public.schedules(supplement_id);

-- =========================================================
-- 5. verification_photos
-- =========================================================
create table public.verification_photos (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  photo_url text not null,
  taken_at timestamptz not null default now()
);

create index verification_photos_schedule_id_idx on public.verification_photos(schedule_id);

-- =========================================================
-- 6. nags — sender(관계자) -> receiver(당사자)
-- =========================================================
create table public.nags (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  sent_at timestamptz not null default now()
);

create index nags_schedule_id_idx on public.nags(schedule_id);

-- =========================================================
-- 7. reactions — sender(관계자) -> schedule 소유자에게 리액션
-- =========================================================
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  emoji_or_text text not null,
  sent_at timestamptz not null default now()
);

create index reactions_schedule_id_idx on public.reactions(schedule_id);

-- =========================================================
-- RLS: 본인 데이터 + accepted 관계로 연결된 상대방 데이터만 조회 가능
-- =========================================================
alter table public.users enable row level security;
alter table public.relationships enable row level security;
alter table public.supplements enable row level security;
alter table public.schedules enable row level security;
alter table public.verification_photos enable row level security;
alter table public.nags enable row level security;
alter table public.reactions enable row level security;

-- users
create policy "users_select_own_or_connected"
  on public.users for select
  using (id = auth.uid() or public.are_connected(auth.uid(), id));

create policy "users_update_own"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- relationships
create policy "relationships_select_involved"
  on public.relationships for select
  using (auth.uid() = user_id or auth.uid() = partner_id);

create policy "relationships_insert_as_inviter"
  on public.relationships for insert
  with check (auth.uid() = user_id and status = 'pending');

create policy "relationships_update_accept"
  on public.relationships for update
  using (auth.uid() = partner_id)
  with check (auth.uid() = partner_id and status = 'accepted');

create policy "relationships_delete_own_pending"
  on public.relationships for delete
  using (auth.uid() = user_id and status = 'pending');

-- supplements
create policy "supplements_select_own_or_connected"
  on public.supplements for select
  using (user_id = auth.uid() or public.are_connected(auth.uid(), user_id));

create policy "supplements_insert_own"
  on public.supplements for insert
  with check (user_id = auth.uid());

create policy "supplements_update_own"
  on public.supplements for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "supplements_delete_own"
  on public.supplements for delete
  using (user_id = auth.uid());

-- schedules (소유권은 supplements.user_id를 통해 판단)
create policy "schedules_select_own_or_connected"
  on public.schedules for select
  using (
    exists (
      select 1 from public.supplements s
      where s.id = schedules.supplement_id
        and (s.user_id = auth.uid() or public.are_connected(auth.uid(), s.user_id))
    )
  );

create policy "schedules_insert_own"
  on public.schedules for insert
  with check (
    exists (select 1 from public.supplements s where s.id = supplement_id and s.user_id = auth.uid())
  );

create policy "schedules_update_own"
  on public.schedules for update
  using (
    exists (select 1 from public.supplements s where s.id = schedules.supplement_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.supplements s where s.id = schedules.supplement_id and s.user_id = auth.uid())
  );

create policy "schedules_delete_own"
  on public.schedules for delete
  using (
    exists (select 1 from public.supplements s where s.id = schedules.supplement_id and s.user_id = auth.uid())
  );

-- verification_photos (관계자 외 접근 불가 — NFR)
create policy "verification_photos_select_own_or_connected"
  on public.verification_photos for select
  using (
    exists (
      select 1 from public.schedules sc
      join public.supplements s on s.id = sc.supplement_id
      where sc.id = verification_photos.schedule_id
        and (s.user_id = auth.uid() or public.are_connected(auth.uid(), s.user_id))
    )
  );

create policy "verification_photos_insert_own"
  on public.verification_photos for insert
  with check (
    exists (
      select 1 from public.schedules sc
      join public.supplements s on s.id = sc.supplement_id
      where sc.id = schedule_id and s.user_id = auth.uid()
    )
  );

-- nags (발신자/수신자만 조회, 발신자는 반드시 수신자와 accepted 관계)
create policy "nags_select_involved"
  on public.nags for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "nags_insert_as_connected_sender"
  on public.nags for insert
  with check (
    auth.uid() = sender_id
    and public.are_connected(sender_id, receiver_id)
    and exists (
      select 1 from public.schedules sc
      join public.supplements s on s.id = sc.supplement_id
      where sc.id = schedule_id and s.user_id = receiver_id
    )
  );

-- reactions (발신자 또는 schedule 소유자만 조회)
create policy "reactions_select_involved"
  on public.reactions for select
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.schedules sc
      join public.supplements s on s.id = sc.supplement_id
      where sc.id = reactions.schedule_id and s.user_id = auth.uid()
    )
  );

create policy "reactions_insert_as_connected_sender"
  on public.reactions for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.schedules sc
      join public.supplements s on s.id = sc.supplement_id
      where sc.id = schedule_id and public.are_connected(sender_id, s.user_id)
    )
  );
