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
OPENAI_IMAGE_QUALITY=low
OPENAI_IMAGE_CONCURRENCY=4
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=verse
OPENAI_TTS_CONCURRENCY=3
VIDEO_SEGMENT_CONCURRENCY=2
VIDEO_WIDTH=720
VIDEO_HEIGHT=1280
VIDEO_FPS=24
USE_MOCK_AI=false
WEB_ORIGIN=http://localhost:3000
```

프론트엔드 환경변수는 `apps/web/.env.local`에 둡니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

API 키 없이 화면 흐름만 테스트하려면 `USE_MOCK_AI=true`로 실행할 수 있습니다. 이미지 생성이 느리거나 rate limit이 생기면 `OPENAI_IMAGE_CONCURRENCY`를 `1`에서 `5` 사이로 조절하세요. 영상 합성이 느리면 `OPENAI_TTS_CONCURRENCY`와 `VIDEO_SEGMENT_CONCURRENCY`를 조절할 수 있고, 기본 영상 출력은 속도를 위해 `720x1280`/`24fps`입니다.

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
- `POST /api/video`: 씬별 이미지, 대사, 자막을 TTS 오디오와 MP4 숏츠 영상으로 합성

## 문제 해결

- `429 You exceeded your current quota`: OpenAI API 계정의 크레딧, 결제수단, 또는 월 사용 한도를 확인해야 합니다. 코드 문제가 아니라 OpenAI Billing/Usage 제한입니다. 개발이나 시연 흐름만 확인하려면 `USE_MOCK_AI=true`로 전환하면 외부 API 호출 없이 mock 응답으로 테스트할 수 있습니다.

## MVP 범위

로그인, 결제, DB는 제외했습니다. 생성 파일은 로컬에서는 `apps/api/public/generated`, Vercel에서는 임시 런타임 저장소에 저장됩니다. 운영용 장기 보관은 S3, Supabase Storage, Vercel Blob 같은 영구 스토리지로 바꾸기 쉽게 저장 로직을 분리했습니다.
