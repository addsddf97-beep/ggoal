# 골때리는 건강 가이드 스튜디오

음식 이름이나 간단한 아이디어를 입력하면 OpenAI API로 유튜브 숏츠용 음식 캐릭터 상황극을 생성하는 MVP입니다.

## 구조

- `apps/api`: Next.js Route Handlers 기반 백엔드 API, OpenAI 호출, 로컬 이미지 저장
- `apps/web`: Next.js App Router 프론트엔드 워크플로우 UI
- `packages/shared`: API 요청/응답 타입과 Zod 스키마

## 환경변수

백엔드 환경변수는 `apps/api/.env.local`에 둡니다. 이 파일은 Git에 커밋되지 않습니다.

```env
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.4-mini
OPENAI_IMAGE_MODEL=gpt-image-1.5
USE_MOCK_AI=false
```

프론트엔드 환경변수는 `apps/web/.env.local`에 둡니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

API 키 없이 화면 흐름만 테스트하려면 `USE_MOCK_AI=true`로 실행할 수 있습니다.

## 실행

```bash
npm install
npm run dev
```

- 웹: `http://localhost:3000`
- API: `http://localhost:3001`

## 주요 API

- `POST /api/topics`: 음식/아이디어로 숏츠 주제 후보 5개 생성
- `POST /api/script`: 선택한 주제로 30~60초 숏츠 스크립트 생성
- `POST /api/images`: 씬별 캐릭터 이미지 생성 후 `apps/api/public/generated/{jobId}`에 저장

## MVP 범위

로그인, 결제, DB, 영상 렌더링, 실제 음성 파일 생성은 제외했습니다. 이미지 저장과 AI 호출 로직은 추후 S3, Supabase Storage, TTS, 영상 렌더링으로 확장하기 쉽도록 분리했습니다.
