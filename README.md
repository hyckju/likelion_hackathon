# 먹(MEOK)

가족·지인이 함께 영양제 복용을 챙겨주는 습관 형성 웹앱(PWA)입니다.

기획 배경과 요구사항은 아래 문서를 참고하세요.
- [기획안](./먹(MEOK)_기획안.md)
- [MVP 요구사항명세서](./먹(MEOK)_MVP_요구사항명세서.md)

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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key (Project Settings > API) |

`.env.local`은 `.gitignore`에 포함되어 있어 커밋되지 않습니다.

## Supabase 연동

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. Project Settings > API에서 URL과 anon key 확인 후 `.env.local`에 입력
3. **무료 티어는 7일간 활동이 없으면 프로젝트가 일시정지됩니다.** 해커톤 제출 기한까지는 팀원이 주기적으로 대시보드에 접속해 활성 상태를 유지해주세요.

## Vercel 배포

1. [vercel.com](https://vercel.com)에서 이 GitHub 레포를 Import
2. Project Settings > Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등록 (코드에 하드코딩하지 않음)
3. main 브랜치에 push할 때마다 자동으로 재배포됩니다
