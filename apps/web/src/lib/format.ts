import type { SceneScript, ShortsScript } from "@food-shorts/shared";

export function formatScriptForClipboard(script: ShortsScript) {
  return [
    `제목: ${script.title}`,
    `훅: ${script.hook}`,
    `총 길이: ${script.totalDuration}`,
    "",
    ...script.scenes.flatMap((scene) => [
      `Scene ${scene.sceneIndex}. ${scene.sceneTitle} (${scene.duration})`,
      `캐릭터: ${scene.character}`,
      `대사: ${scene.dialogue}`,
      `자막: ${scene.subtitle}`,
      `화면 연출: ${scene.visualDirection}`,
      `카메라: ${scene.cameraDirection}`,
      `효과음: ${scene.soundEffect}`,
      `음성 톤: ${scene.voiceTone}`,
      `영양 포인트: ${scene.nutritionPoint}`,
      `균형 메모: ${scene.healthBalanceNote}`,
      ""
    ])
  ].join("\n");
}

export function formatPromptsForClipboard(scenes: SceneScript[]) {
  return scenes
    .map((scene) => [`Scene ${scene.sceneIndex}. ${scene.sceneTitle}`, scene.imagePrompt].join("\n"))
    .join("\n\n");
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
