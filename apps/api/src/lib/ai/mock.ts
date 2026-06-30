import type { SceneScript, ShortsScript, TopicCandidate } from "@food-shorts/shared";
import { deflateSync } from "node:zlib";

export function createMockTopics(idea: string): TopicCandidate[] {
  const food = idea.trim() || "우동";

  return [
    {
      id: "topic-1",
      title: `나 ${food}인데!! 방심하면 영양 포인트 훅 온다고!!`,
      hook: `${food} 캐릭터가 등장하자마자 억울하게 소리친다.`,
      foodCharacter: `${food} 캐릭터`,
      nutritionPoint: "조리법과 양에 따라 나트륨, 당류, 지방, 탄수화물 섭취가 달라질 수 있음",
      direction: "음식이 자기 장점과 단점을 셀프 폭로하는 빠른 상황극",
      tone: "분노형"
    },
    {
      id: "topic-2",
      title: `${food}이 직접 해명하러 나왔다`,
      hook: "나를 나쁘게만 보지 말라며 기자회견을 연다.",
      foodCharacter: `기자회견장 ${food}`,
      nutritionPoint: "장점도 있지만 자주 많이 먹으면 특정 영양소가 과해질 수 있음",
      direction: "플래시 세례 속에서 억울하게 해명하는 연출",
      tone: "억울형"
    },
    {
      id: "topic-3",
      title: `${food}의 허세 폭발 자기소개`,
      hook: "든든함은 인정하지만 과하면 부담도 같이 온다.",
      foodCharacter: `허세 가득한 ${food}`,
      nutritionPoint: "포만감과 맛의 장점, 섭취량 조절의 필요성",
      direction: "무대 위 래퍼처럼 과장되게 자기소개",
      tone: "허세형"
    },
    {
      id: "topic-4",
      title: `${food}이 말합니다. 먹지 말라는 게 아니라 알고 먹자고`,
      hook: "음식 캐릭터가 잔소리하다가 갑자기 다정해진다.",
      foodCharacter: `상담사 ${food}`,
      nutritionPoint: "개인 상태와 함께 먹는 음식에 따라 부담이 달라질 수 있음",
      direction: "상담실 상황극과 자막 밈을 섞은 연출",
      tone: "상담형"
    },
    {
      id: "topic-5",
      title: `${food}의 자폭 고백: 맛있는데 조합은 세다`,
      hook: "맛있다고 자랑하다가 스스로 영양 포인트를 폭로한다.",
      foodCharacter: `자폭하는 ${food}`,
      nutritionPoint: "맛있는 조합일수록 당류, 지방, 나트륨 등을 같이 살펴보면 좋음",
      direction: "자랑과 셀프 폭로가 번갈아 나오는 코미디",
      tone: "자폭형"
    }
  ];
}

export function createMockScript(idea: string, topic: TopicCandidate): ShortsScript {
  const character = topic.foodCharacter || `${idea} 캐릭터`;
  const scenes: SceneScript[] = [
    {
      sceneIndex: 1,
      duration: "5초",
      sceneTitle: "갑자기 등장한 음식",
      character,
      dialogue: `야!! 나 ${idea}인데!! 순해 보인다고 방심했냐?!`,
      subtitle: `${idea}의 반전 등장`,
      visualDirection: `${character}가 화면 앞으로 튀어나오며 김과 효과선을 뿜는다.`,
      cameraDirection: "초근접 줌인 후 빠른 흔들림 컷",
      soundEffect: "쾅! 등장 효과음",
      voiceTone: "분노형, 빠르고 과장된 톤",
      nutritionPoint: topic.nutritionPoint,
      healthBalanceNote: "제품과 조리법, 먹는 양에 따라 부담이 달라질 수 있음",
      imagePrompt: `Anthropomorphic ${idea} food character yelling at camera, expressive angry face, vivid colors, Korean short-form meme style, vertical 9:16 composition, clean empty space at bottom for Korean subtitle, no text in image.`
    },
    {
      sceneIndex: 2,
      duration: "6초",
      sceneTitle: "영양 포인트 셀프 폭로",
      character,
      dialogue: "맛있다고 막 달리면 특정 영양소가 훅 늘 수 있다고!!",
      subtitle: "맛있어도 포인트 체크",
      visualDirection: "음식 캐릭터가 영양 그래프를 보고 당황한다.",
      cameraDirection: "좌우 패닝과 빠른 컷 전환",
      soundEffect: "삐빅! 경고음",
      voiceTone: "억울하지만 솔직한 톤",
      nutritionPoint: "자주 많이 먹으면 나트륨, 당류, 지방, 탄수화물 섭취가 늘 수 있음",
      healthBalanceNote: "수치는 제품과 조리법에 따라 달라질 수 있음",
      imagePrompt: `Funny anthropomorphic ${idea} character shocked by floating nutrition icons, vivid illustration, exaggerated facial expression, vertical shorts frame, bottom area reserved for subtitle, no letters or text.`
    },
    {
      sceneIndex: 3,
      duration: "6초",
      sceneTitle: "억울한 장점 어필",
      character,
      dialogue: "그래도 나 완전 나쁜 애는 아니야. 든든하고 즐거운 한 끼가 될 수도 있잖아?",
      subtitle: "장점도 있음",
      visualDirection: "음식 캐릭터가 갑자기 착한 표정으로 하트 조명을 받는다.",
      cameraDirection: "중간 샷에서 부드러운 줌아웃",
      soundEffect: "반짝 효과음",
      voiceTone: "억울형에서 다정한 톤으로 전환",
      nutritionPoint: "음식의 장점은 종류에 따라 포만감, 단백질, 식이섬유, 비타민 등으로 달라질 수 있음",
      healthBalanceNote: "음식 하나만으로 좋고 나쁨을 단정하기보다 전체 식사 균형이 중요함",
      imagePrompt: `Cute anthropomorphic ${idea} character looking innocent under spotlight, humorous Korean meme illustration, bright balanced colors, vertical composition, room for subtitle at bottom, no text.`
    },
    {
      sceneIndex: 4,
      duration: "5초",
      sceneTitle: "알고 먹자는 결말",
      character,
      dialogue: "먹지 말라는 게 아니라, 알고 먹자는 거다!!",
      subtitle: "알고 먹으면 더 좋다",
      visualDirection: "음식 캐릭터가 엄지척하며 화면 밖으로 튀어나온다.",
      cameraDirection: "빠른 줌인 후 엔딩 프리즈",
      soundEffect: "띵! 마무리 효과음",
      voiceTone: "시원한 마무리 멘트",
      nutritionPoint: "섭취 빈도와 양, 같이 먹는 음식 조합을 함께 살펴보면 좋음",
      healthBalanceNote: "개인 상태에 따라 적절한 선택은 달라질 수 있음",
      imagePrompt: `Anthropomorphic ${idea} character giving thumbs up, funny expressive food mascot, vivid Korean shorts thumbnail style, vertical 9:16 frame, clean bottom subtitle space, no text in image.`
    }
  ];

  return {
    title: topic.title,
    hook: topic.hook,
    totalDuration: "약 22초",
    scenes
  };
}

function crc32(buffer: Buffer) {
  let crc = -1;

  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ -1) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));

  return Buffer.concat([length, typeBuffer, data, crc]);
}

export function createMockPng(sceneIndex: number) {
  const width = 768;
  const height = 1152;
  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;

    for (let x = 0; x < width; x += 1) {
      const offset = rowStart + 1 + x * 4;
      const pulse = (x + y + sceneIndex * 37) % 255;
      raw[offset] = (230 + sceneIndex * 11) % 255;
      raw[offset + 1] = (92 + pulse / 3) % 255;
      raw[offset + 2] = (64 + y / 12) % 255;
      raw[offset + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}
