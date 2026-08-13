-- 먹(MEOK) 4단계: 복용 인증 사진 저장용 Storage 버킷 + RLS
-- Supabase SQL Editor에서 그대로 실행하세요.

insert into storage.buckets (id, name, public)
values ('verification-photos', 'verification-photos', false);

-- 업로드 경로 규칙: {업로드한 사용자 id}/{schedule_id}-{timestamp}.jpg
-- 폴더명(첫 경로 조각)이 곧 소유자 id이므로, 본인 폴더에만 쓸 수 있고
-- 본인 또는 accepted 관계로 연결된 사람만 읽을 수 있도록 제한한다.
create policy "verification_photos_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "verification_photos_storage_select_own_or_connected"
  on storage.objects for select
  using (
    bucket_id = 'verification-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.are_connected(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
