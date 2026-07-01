# 골때리는 건강 가이드 스튜디오

음식 이름이나 간단한 아이디어를 입력하면 zrok으로 공개된 텍스트, 이미지, TTS API로 유튜브 숏츠용 음식 캐릭터 상황극을 생성하는 MVP입니다.

## 구조

- `apps/api`: Next.js Route Handlers 기반 백엔드 API, zrok 텍스트 생성, zrok 이미지 생성, zrok TTS, 로컬 파일 저장
- `apps/web`: Next.js App Router 프론트엔드 워크플로우 UI
- `packages/shared`: API 요청/응답 타입과 Zod 스키마

## 환경변수

백엔드 환경변수는 `apps/api/.env.local`에 둡니다. 이 파일은 Git에 커밋되지 않습니다.

```env
OPENAI_API_KEY=
TEXT_AI_PROVIDER=zrok
ZROK_AI_BASE_URL=https://ym1mvbhf9e0w.shares.zrok.io
ZROK_TEXT_MODEL=local-qwen-4b
ZROK_REQUEST_TIMEOUT_MS=30000
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TEXT_MODEL=qwen3:4b
OLLAMA_REQUEST_TIMEOUT_MS=180000
OPENAI_TEXT_MODEL=gpt-5.4-mini
IMAGE_PROVIDER=local
LOCAL_IMAGE_BASE_URL=https://zghikrizu48i.shares.zrok.io
LOCAL_IMAGE_MODEL=LlamaGen GPT-XL Text-to-Image
LOCAL_IMAGE_SIZE=256x256
LOCAL_IMAGE_SEED=42
LOCAL_IMAGE_CFG_SCALE=7.5
LOCAL_IMAGE_TEMPERATURE=1.0
LOCAL_IMAGE_TIMEOUT_MS=180000
IMAGE_CONCURRENCY=1
OPENAI_IMAGE_MODEL=gpt-image-1.5
OPENAI_IMAGE_QUALITY=low
OPENAI_IMAGE_CONCURRENCY=4
TTS_PROVIDER=local
LOCAL_TTS_BASE_URL=https://ym1mvbhf9e0w.shares.zrok.io
LOCAL_TTS_VOICE=Microsoft Heami Desktop
LOCAL_TTS_LANGUAGE=ko-KR
LOCAL_TTS_RATE=1
LOCAL_TTS_VOLUME=100
LOCAL_TTS_TIMEOUT_MS=60000
TTS_CONCURRENCY=1
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

텍스트 생성은 기본적으로 zrok 공유 URL `https://ym1mvbhf9e0w.shares.zrok.io`의 `local-qwen-4b` 모델을 사용합니다. 로컬 Ollama로 되돌리고 싶으면 `TEXT_AI_PROVIDER=ollama`로 바꾸면 됩니다.
zrok 텍스트 endpoint가 60초 안에 응답하지 않으면 gateway timeout이 날 수 있으므로 모델 서버 상태와 Qwen `/no_think` 설정을 확인하세요.
이미지 생성은 기본적으로 zrok 공유 URL `https://zghikrizu48i.shares.zrok.io/generate_file`의 `LlamaGen GPT-XL Text-to-Image` 모델을 사용합니다. 요청 payload는 `prompt`, `seed`, `cfg_scale`, `temperature`, `size` 형식을 따르고, 서버가 해당 형식을 받지 않으면 `/v1/images/generations` JSON base64 API로 fallback합니다. OpenAI 이미지 모델로 되돌리고 싶으면 `IMAGE_PROVIDER=openai`로 바꾸면 됩니다.
TTS는 기본적으로 zrok 공유 URL `https://ym1mvbhf9e0w.shares.zrok.io/tts`의 Windows System.Speech `Microsoft Heami Desktop` 음성을 사용합니다. OpenAI TTS로 되돌리고 싶으면 `TTS_PROVIDER=openai`로 바꾸면 됩니다.

프론트엔드 환경변수는 `apps/web/.env.local`에 둡니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

API 키 없이 화면 흐름만 테스트하려면 `USE_MOCK_AI=true`로 실행할 수 있습니다. 이미지 생성이 느리면 `IMAGE_CONCURRENCY`를 `1`에서 `5` 사이로 조절하세요. 영상 합성이 느리면 `TTS_CONCURRENCY`와 `VIDEO_SEGMENT_CONCURRENCY`를 조절할 수 있고, 기본 영상 출력은 속도를 위해 `720x1280`/`24fps`입니다.

## 실행

```bash
npm install
npm run dev
```

로컬에서 zrok 공유 서버를 직접 띄울 때는 Windows PowerShell에서 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\local-llm\Start-LocalLLM.ps1
.\local-llm\Start-LocalLLMApi.ps1 -HostAddress 0.0.0.0 -Port 8088
```

이미지 API 서버는 zrok 공유 URL 또는 로컬 `http://127.0.0.1:8010`에서 실행될 수 있습니다.

```text
GET  /health
POST /generate_file
POST /v1/images/generations
```

- 웹: `http://localhost:3000`
- API: `http://localhost:3001`

## 주요 API

- `POST /api/topics`: zrok 텍스트 API로 음식/아이디어 기반 숏츠 주제 후보 5개 생성
- `POST /api/script`: zrok 텍스트 API로 선택한 주제 기반 30~60초 숏츠 스크립트 생성
- `POST /api/images`: zrok LlamaGen 이미지 API로 씬별 캐릭터 이미지 생성 후 `apps/api/public/generated/{jobId}`에 저장
- `POST /api/video`: 씬별 이미지, 대사, 자막을 zrok TTS 오디오와 MP4 숏츠 영상으로 합성

## 문제 해결

- `429 You exceeded your current quota`: OpenAI API 계정의 크레딧, 결제수단, 또는 월 사용 한도를 확인해야 합니다. 코드 문제가 아니라 OpenAI Billing/Usage 제한입니다. 개발이나 시연 흐름만 확인하려면 `USE_MOCK_AI=true`로 전환하면 외부 API 호출 없이 mock 응답으로 테스트할 수 있습니다.
- `zrok 텍스트 요청 실패 (504)`: `https://ym1mvbhf9e0w.shares.zrok.io/health`가 열리는지, `local-qwen-4b`가 60초 안에 응답하는지 확인하세요.
- `로컬 이미지 서버에 연결하지 못했습니다`: `LOCAL_IMAGE_BASE_URL`의 `/health`가 열리는지 확인하세요. 이 프로젝트는 이미지 API의 `/generate_file`을 우선 사용하고, 필요하면 `/v1/images/generations`만 fallback으로 사용합니다.
- `로컬 TTS 서버에 연결하지 못했습니다`: `LOCAL_TTS_BASE_URL`의 `/health`, `/tts/voices`가 열리는지 확인하세요. 이 프로젝트는 TTS 생성에는 `/tts`와 `/audio/{filename}.wav`만 사용합니다.

## MVP 범위

로그인, 결제, DB는 제외했습니다. 생성 파일은 로컬에서는 `apps/api/public/generated`, Vercel에서는 임시 런타임 저장소에 저장됩니다. 운영용 장기 보관은 S3, Supabase Storage, Vercel Blob 같은 영구 스토리지로 바꾸기 쉽게 저장 로직을 분리했습니다.
