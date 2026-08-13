# 먹(MEOK)

가족·지인이 함께 영양제 복용을 챙겨주는 습관 형성 웹앱(PWA)입니다.

배포 URL: https://likelion-hackathon-six.vercel.app

기획 배경과 요구사항은 아래 문서를 참고하세요.
- [기획안](./먹(MEOK)_기획안.md)
- [MVP 요구사항명세서](./먹(MEOK)_MVP_요구사항명세서.md)

## 구현된 기능

- 이메일 매직링크 회원가입/로그인, 온보딩(프로필 입력)
- 초대 링크로 가족·친구 관계 맺기 (관계 타입별 톤)
- 영양제 등록 + 홈 화면 오늘의 복용 일정
- 카메라 촬영으로 복용 인증 (`getUserMedia`, Storage 업로드)
- 예정 시간 + 60분 경과 시 관계자에게 잔소리 카드 (관계 톤 반영, 1일 3회 제한)
- 복용 완료 시 이모지 리액션 주고받기
- 연속 복용일수(스트릭) + 마일스톤 축하
- 잔여량 추적 + 재구매 링크
- 주간 리포트 (복용률, 놓친 날짜, 요약 공유)
- PWA manifest (홈 화면에 추가 가능)

**MVP 범위 밖**: 실시간 Web Push(대신 홈 화면 배너/카드 방식), AI 사진 판별, 위젯 테마 다양화

## 기술 스택

- **프레임워크**: Next.js (App Router, TypeScript)
- **스타일링**: Tailwind CSS
- **DB / 인증 / 파일 저장소**: Supabase (Postgres + Auth + Storage)
- **배포**: Vercel

## 로컬 개발 환경 세팅

```bash
npm install
cp .env.local.example .env.local   # 아래 환경변수 채우기
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 환경변수

`.env.local.example`을 복사해 `.env.local`을 만들고 Supabase 프로젝트 값을 채워주세요.

| 변수명 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (Project Settings > API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key (Project Settings > API) |

`.env.local`은 `.gitignore`에 포함되어 있어 커밋되지 않습니다.

이미 Vercel 프로젝트와 연동된 상태라면, 아래처럼 CLI로 값을 바로 받아올 수도 있습니다.

```bash
npx vercel link      # 최초 1회, 이 저장소를 Vercel 프로젝트와 연결
npx vercel env pull .env.local
```

## Supabase 연동

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. Project Settings > API에서 URL과 anon key 확인 후 `.env.local`에 입력
3. **SQL Editor에서 `supabase/migrations/` 안의 파일들을 번호 순서대로(0001 → 0002 → 0003 → 0004) 전부 실행**해주세요. 스키마, RLS, Storage 버킷이 여기 다 들어있습니다.
4. **이메일 발송(매직링크 로그인) 설정이 꼭 필요합니다.** Supabase 기본 이메일은 시간당 발송 한도가 매우 낮아서(2~4건) 실사용/데모에서 바로 막혀요. Authentication → SMTP Settings에서 커스텀 SMTP를 등록하세요.
   - **SendGrid 추천** — 도메인 구매/인증 없이 [Single Sender Verification](https://app.sendgrid.com)만으로 아무 이메일 주소에나 발송 가능 (무료 티어 하루 100통). Settings → Sender Authentication에서 발신용 이메일 하나를 인증하고, Settings → API Keys에서 키 발급.
     - Host: `smtp.sendgrid.net` / Port: `587` / Username: `apikey` (문자 그대로) / Password: 발급받은 `SG.`로 시작하는 API 키
   - Gmail(앱 비밀번호)이나 Resend(도메인 인증 필요)도 대안이 될 수 있지만, 여러 계정으로 테스트하려면 SendGrid 쪽이 제일 간단합니다.
   - Port는 **587**만 지원되니 오타(예: 585) 없이 정확히 입력하세요 — 잘못된 포트는 에러 없이 `context deadline exceeded` 타임아웃만 나서 원인 찾기 어렵습니다.
5. **무료 티어는 7일간 활동이 없으면 프로젝트가 일시정지됩니다.** 팀원이 주기적으로 대시보드에 접속해 활성 상태를 유지해주세요.

## Vercel 배포

1. [vercel.com](https://vercel.com)에서 이 GitHub 레포를 Import
2. Project Settings > Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등록
   - **Production, Preview, Development 세 환경 모두 체크**해야 합니다. 하나라도 빠지면 그 환경에서 "Your project's URL and Key are required..." 500 에러가 납니다.
3. 값 등록/변경 후에는 기존 배포가 자동으로 재빌드되지 않으니, Deployments 탭에서 **Redeploy**를 한 번 실행해주세요.
4. main 브랜치에 push하면 이후에는 자동으로 재배포됩니다.

CLI로도 동일하게 처리할 수 있습니다.

```bash
npx vercel login
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview
npx vercel env add NEXT_PUBLIC_SUPABASE_URL development
# NEXT_PUBLIC_SUPABASE_ANON_KEY도 동일하게 반복
npx vercel deploy --prod
```
