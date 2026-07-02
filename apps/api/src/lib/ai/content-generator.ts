import { z } from "zod";
import { scriptSchema, topicCandidateSchema, type TopicCandidate } from "@food-shorts/shared";
import { getServerConfig } from "@/lib/env";
import { createMockScript, createMockTopics } from "@/lib/ai/mock";
import { createOpenAiClient } from "@/lib/ai/openai-client";
import { generateOllamaText } from "@/lib/ai/ollama-client";
import type { OllamaMessage } from "@/lib/ai/ollama-client";
import { generateZrokText } from "@/lib/ai/zrok-text-client";
import type { ZrokMessage } from "@/lib/ai/zrok-text-client";
import { buildScriptPrompt, buildTopicsPrompt, systemPrompt } from "@/lib/ai/prompts";
import { scriptJsonSchema, topicCandidatesJsonSchema } from "@/lib/ai/json-schema";
import { parseJsonFromText, readOutputText } from "@/lib/ai/response-parser";

type TopicModelResponse = {
  topics: Array<Omit<TopicCandidate, "id">>;
};

const topicModelResponseSchema = z.object({
  topics: z.array(topicCandidateSchema.omit({ id: true })).length(5)
});

const ollamaSystemPrompt = [
  "너는 한국 숏츠 음식 콘텐츠 PD다.",
  "웃긴 밈 톤으로 쓰되 음식의 장점과 주의점을 균형 있게 말한다.",
  "질병, 치료, 공포 조장, 무조건식 표현은 금지다.",
  "응답은 반드시 JSON만 출력한다."
].join("\n");

const topicOutputShape = `{
  "topics": [
    {
      "title": "짧은 제목",
      "hook": "한 줄 훅",
      "foodCharacter": "음식 캐릭터",
      "nutritionPoint": "균형 잡힌 영양 포인트",
      "direction": "웃긴 연출 방향",
      "tone": "분노형"
    }
  ]
}`;

const scriptOutputShape = `{
  "title": "숏츠 제목",
  "hook": "강한 한 줄 훅",
  "totalDuration": "30초",
  "scenes": [
    {
      "sceneIndex": 1,
      "duration": "5초",
      "sceneTitle": "씬 제목",
      "character": "음식 캐릭터",
      "dialogue": "짧은 한국어 대사",
      "subtitle": "짧은 한국어 자막",
      "visualDirection": "화면 연출",
      "cameraDirection": "카메라 연출",
      "soundEffect": "효과음",
      "voiceTone": "목소리 톤",
      "nutritionPoint": "영양 포인트",
      "healthBalanceNote": "균형 잡힌 건강 메모",
      "imagePrompt": "English prompt: cute food-item sticker mascot with only a face, no human body, no text"
    }
  ]
}`;

export async function generateTopicCandidates(idea: string) {
  const config = getServerConfig();

  if (config.mockAi) {
    return createMockTopics(idea);
  }

  if (config.textProvider === "zrok") {
    return generateTopicCandidatesWithZrok(idea);
  }

  if (config.textProvider === "ollama") {
    return generateTopicCandidatesWithOllama(idea);
  }

  if (config.useMockAi) {
    return createMockTopics(idea);
  }

  const { client } = createOpenAiClient();
  const response = await client.responses.create({
    model: config.textModel,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildTopicsPrompt(idea) }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "topic_candidates",
        strict: true,
        schema: topicCandidatesJsonSchema
      }
    }
  } as never);

  const parsed = parseJsonFromText<TopicModelResponse>(readOutputText(response));
  const topics = parsed.topics.map((topic, index) =>
    topicCandidateSchema.parse({
      ...topic,
      id: `topic-${index + 1}`
    })
  );

  return topics;
}

export async function generateShortsScript(idea: string, topic: TopicCandidate) {
  const config = getServerConfig();

  if (config.mockAi) {
    return createMockScript(idea, topic);
  }

  if (config.textProvider === "zrok") {
    return generateShortsScriptWithZrok(idea, topic);
  }

  if (config.textProvider === "ollama") {
    return generateShortsScriptWithOllama(idea, topic);
  }

  if (config.useMockAi) {
    return createMockScript(idea, topic);
  }

  const { client } = createOpenAiClient();
  const response = await client.responses.create({
    model: config.textModel,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildScriptPrompt(idea, JSON.stringify(topic, null, 2)) }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "shorts_script",
        strict: true,
        schema: scriptJsonSchema
      }
    }
  } as never);

  return scriptSchema.parse(parseJsonFromText(readOutputText(response)));
}

async function generateTopicCandidatesWithOllama(idea: string) {
  const parsed = await generateOllamaJson({
    userPrompt: buildOllamaJsonPrompt(buildOllamaTopicsPrompt(idea), topicOutputShape, [
      "topics 배열은 정확히 5개다.",
      "각 후보의 title, hook, direction은 서로 다르게 쓴다.",
      "각 문자열은 가능하면 35자 이내로 짧게 쓴다."
    ]),
    numPredict: 800,
    parse: (value) => topicModelResponseSchema.parse(value)
  });

  return parsed.topics.map((topic, index) =>
    topicCandidateSchema.parse({
      ...topic,
      id: `topic-${index + 1}`
    })
  );
}

async function generateTopicCandidatesWithZrok(idea: string) {
  try {
    const parsed = await generateZrokJson({
      userPrompt: buildZrokTopicsPrompt(idea),
      maxTokens: 420,
      parse: (value) => topicModelResponseSchema.parse(value)
    });

    return parsed.topics.map((topic, index) =>
      topicCandidateSchema.parse({
        ...topic,
        id: `topic-${index + 1}`
      })
    );
  } catch (error) {
    console.warn(`zrok 주제 생성 실패, 대체 생성 사용: ${describeGenerationError(error)}`);
    return createMockTopics(idea);
  }
}

async function generateShortsScriptWithOllama(idea: string, topic: TopicCandidate) {
  return generateOllamaJson({
    userPrompt: buildOllamaJsonPrompt(buildOllamaScriptPrompt(idea, topic), scriptOutputShape, [
      "scenes 배열은 4개로 만든다.",
      "각 대사와 자막은 짧고 말맛 있게 쓴다.",
      "imagePrompt는 영어 한 문장으로 쓴다.",
      "imagePrompt에는 음식 자체에 눈과 입만 붙은 스티커 마스코트, 표정, 음식 재료, 밝은 배경을 포함한다.",
      "imagePrompt에는 사람 머리, 피부, 머리카락, 옷, 몸통, 손, 팔, 다리, 말풍선, 아이콘, 읽을 수 있는 글자, 숫자를 넣지 않는다."
    ]),
    numPredict: 2200,
    parse: (value) => scriptSchema.parse(value)
  });
}

async function generateShortsScriptWithZrok(idea: string, topic: TopicCandidate) {
  try {
    return await generateZrokJson({
      userPrompt: buildZrokScriptPrompt(idea, topic),
      maxTokens: 1200,
      parse: (value) => scriptSchema.parse(value)
    });
  } catch (error) {
    console.warn(`zrok 대본 생성 실패, 대체 생성 사용: ${describeGenerationError(error)}`);
    return createMockScript(idea, topic);
  }
}

async function generateOllamaJson<T>({
  userPrompt,
  numPredict,
  parse
}: {
  userPrompt: string;
  numPredict: number;
  parse: (value: unknown) => T;
}) {
  const messages: OllamaMessage[] = [
    {
      role: "system" as const,
      content: [
        ollamaSystemPrompt,
        "/no_think",
        "반드시 순수 JSON 객체만 반환한다.",
        "마크다운 코드블록, 설명문, <think> 태그, JSON 밖의 텍스트를 절대 포함하지 않는다."
      ].join("\n")
    },
    { role: "user" as const, content: userPrompt }
  ];
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const output = await generateOllamaText({ messages, numPredict });

    try {
      return parse(parseJsonFromText<unknown>(output));
    } catch (error) {
      lastError = error;
      messages.push(
        { role: "assistant", content: output },
        {
          role: "user",
          content: [
            "방금 응답은 필요한 JSON 형식 검증에 실패했다.",
            `오류: ${describeGenerationError(error)}`,
            "이전 내용을 고쳐서 순수 JSON 객체만 다시 출력해라. 다른 설명은 쓰지 마라."
          ].join("\n")
        }
      );
    }
  }

  throw new Error(`Ollama JSON 응답 형식이 올바르지 않습니다: ${describeGenerationError(lastError)}`);
}

async function generateZrokJson<T>({
  userPrompt,
  maxTokens,
  parse
}: {
  userPrompt: string;
  maxTokens: number;
  parse: (value: unknown) => T;
}) {
  const messages: ZrokMessage[] = [
    {
      role: "system" as const,
      content: [
        ollamaSystemPrompt,
        "/no_think",
        "반드시 순수 JSON 객체만 반환한다.",
        "마크다운 코드블록, 설명문, <think> 태그, JSON 밖의 텍스트를 절대 포함하지 않는다."
      ].join("\n")
    },
    { role: "user" as const, content: userPrompt }
  ];
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const output = await generateZrokText({ messages, maxTokens });

    try {
      return parse(parseJsonFromText<unknown>(output));
    } catch (error) {
      lastError = error;
      messages.push(
        { role: "assistant", content: output },
        {
          role: "user",
          content: [
            "방금 응답은 필요한 JSON 형식 검증에 실패했다.",
            `오류: ${describeGenerationError(error)}`,
            "이전 내용을 고쳐서 순수 JSON 객체만 다시 출력해라. 다른 설명은 쓰지 마라."
          ].join("\n")
        }
      );
    }
  }

  throw new Error(`zrok JSON 응답 형식이 올바르지 않습니다: ${describeGenerationError(lastError)}`);
}

function buildOllamaJsonPrompt(taskPrompt: string, outputShape: string, rules: string[]) {
  return [
    taskPrompt,
    "",
    "순수 JSON 객체만 반환해라. JSON 밖의 설명은 금지다.",
    "출력 형태:",
    outputShape,
    "",
    "추가 규칙:",
    ...rules.map((rule) => `- ${rule}`)
  ].join("\n");
}

function buildOllamaTopicsPrompt(idea: string) {
  return [
    `음식 또는 아이디어: ${idea}`,
    "유튜브 숏츠용 음식 캐릭터 상황극 주제 후보 5개를 만들어라.",
    "필드는 제목, 한 줄 훅, 음식 캐릭터, 균형 잡힌 영양 포인트, 웃긴 연출 방향, 톤이다.",
    "톤 예시: 분노형, 억울형, 허세형, 자폭형, 상담형."
  ].join("\n");
}

function buildOllamaScriptPrompt(idea: string, topic: TopicCandidate) {
  return [
    `음식 또는 아이디어: ${idea}`,
    `선택 주제: ${topic.title}`,
    `훅: ${topic.hook}`,
    `캐릭터: ${topic.foodCharacter}`,
    `영양 포인트: ${topic.nutritionPoint}`,
    `연출 방향: ${topic.direction}`,
    `톤: ${topic.tone}`,
    "",
    "30초 내외 유튜브 숏츠 스크립트를 만든다.",
    "흐름은 강한 훅, 음식 자기소개, 핵심 영양정보, 과장된 상황극, 균형 잡힌 마무리다.",
    "이미지 프롬프트는 영어로 쓰고 이미지 안 텍스트는 금지한다.",
    "각 imagePrompt는 음식 자체에 단순한 눈과 입만 붙은 스티커 마스코트 느낌이어야 한다.",
    "사람 머리, 피부, 머리카락, 옷, 몸통, 손, 팔, 다리, 말풍선, 아이콘, 글자, 숫자는 금지한다.",
    "자기소개 느낌은 음식 캐릭터의 표정, 입 모양, 기울어진 포즈, 김, 반짝임, 재료 표현으로만 구성한다."
  ].join("\n");
}

function buildZrokTopicsPrompt(idea: string) {
  return [
    "/no_think",
    `음식: ${idea}`,
    "아래 JSON만 출력한다. 설명 금지.",
    topicOutputShape,
    "topics는 정확히 5개.",
    "모든 문자열은 짧게.",
    "tone은 분노형, 억울형, 허세형, 상담형, 자폭형 중 하나."
  ].join("\n");
}

function buildZrokScriptPrompt(idea: string, topic: TopicCandidate) {
  return [
    "/no_think",
    `음식: ${idea}`,
    `주제: ${topic.title}`,
    `훅: ${topic.hook}`,
    `캐릭터: ${topic.foodCharacter}`,
    `영양포인트: ${topic.nutritionPoint}`,
    "아래 JSON만 출력한다. 설명 금지.",
    scriptOutputShape,
    "scenes는 정확히 4개.",
    "dialogue와 subtitle은 짧게.",
    "imagePrompt는 영어, 이미지 안 텍스트 금지.",
    "imagePrompt는 음식 자체에 눈과 입만 붙은 스티커 마스코트 장면으로 쓴다.",
    "사람 머리, 피부, 머리카락, 옷, 몸통, 손, 팔, 다리, 말풍선, 아이콘, 읽을 수 있는 글자, 숫자는 금지."
  ].join("\n");
}

function describeGenerationError(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 700);
  }

  return String(error).slice(0, 700);
}
