-- 먹(MEOK) 3단계: 영양제별 복용 시각 저장
-- Supabase SQL Editor에서 그대로 실행하세요.

alter table public.supplements
  add column dose_times time[] not null default '{}';

alter table public.supplements
  add constraint supplements_dose_times_count
  check (array_length(dose_times, 1) = dose_times_per_day);
