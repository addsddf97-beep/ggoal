export const topicCandidatesJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["topics"],
  properties: {
    topics: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "hook", "foodCharacter", "nutritionPoint", "direction", "tone"],
        properties: {
          title: { type: "string" },
          hook: { type: "string" },
          foodCharacter: { type: "string" },
          nutritionPoint: { type: "string" },
          direction: { type: "string" },
          tone: { type: "string" }
        }
      }
    }
  }
} as const;

export const scriptJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "hook", "totalDuration", "scenes"],
  properties: {
    title: { type: "string" },
    hook: { type: "string" },
    totalDuration: { type: "string" },
    scenes: {
      type: "array",
      minItems: 4,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "sceneIndex",
          "duration",
          "sceneTitle",
          "character",
          "dialogue",
          "subtitle",
          "visualDirection",
          "cameraDirection",
          "soundEffect",
          "voiceTone",
          "nutritionPoint",
          "healthBalanceNote",
          "imagePrompt"
        ],
        properties: {
          sceneIndex: { type: "integer" },
          duration: { type: "string" },
          sceneTitle: { type: "string" },
          character: { type: "string" },
          dialogue: { type: "string" },
          subtitle: { type: "string" },
          visualDirection: { type: "string" },
          cameraDirection: { type: "string" },
          soundEffect: { type: "string" },
          voiceTone: { type: "string" },
          nutritionPoint: { type: "string" },
          healthBalanceNote: { type: "string" },
          imagePrompt: { type: "string" }
        }
      }
    }
  }
} as const;
