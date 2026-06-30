import { scriptSchema, topicCandidateSchema, type TopicCandidate } from "@food-shorts/shared";
import { getServerConfig } from "@/lib/env";
import { createMockScript, createMockTopics } from "@/lib/ai/mock";
import { createOpenAiClient } from "@/lib/ai/openai-client";
import { buildScriptPrompt, buildTopicsPrompt, systemPrompt } from "@/lib/ai/prompts";
import { scriptJsonSchema, topicCandidatesJsonSchema } from "@/lib/ai/json-schema";
import { parseJsonFromText, readOutputText } from "@/lib/ai/response-parser";

type TopicModelResponse = {
  topics: Array<Omit<TopicCandidate, "id">>;
};

export async function generateTopicCandidates(idea: string) {
  const config = getServerConfig();

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
