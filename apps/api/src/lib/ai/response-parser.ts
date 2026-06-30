export function parseJsonFromText<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("AI 응답에서 JSON 객체를 찾지 못했습니다.");
    }

    return JSON.parse(match[0]) as T;
  }
}

export function readOutputText(response: { output_text?: string; choices?: Array<{ message?: { content?: string | null } }> }) {
  if (response.output_text) {
    return response.output_text;
  }

  const content = response.choices?.[0]?.message?.content;

  if (content) {
    return content;
  }

  throw new Error("AI 응답 텍스트가 비어 있습니다.");
}
