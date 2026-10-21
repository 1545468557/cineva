/* 真实开源作品数据（不是示例，是别人完整开源、带素材与提示词的作品包）
   素材来源（开源仓库）：
   · The Last Lantern —— github.com/sonlovinbot/Muse-animated-short-film
   · Zack D Films 风格科普短片 —— github.com/Anil-matcha/zack-d-films-ai-video-generator
   素材已落在 /public/works/ 下，提示词与分镜数据来自仓库原文 */

export interface OpenShot {
  id: string;
  /** 镜头类型（wide / macro_cross_section / close …） */
  type: string;
  /** 秒 */
  duration: number;
  /** 场景描述（原仓库原文） */
  scene: string;
  /** 运镜 */
  camera: string;
  /** 用到的角色参考图 */
  refs: string[];
  /** 是否有冲击缩放 */
  impact?: boolean;
  /** 首帧图 */
  frame?: string;
}

export interface OpenBeat {
  id: string;
  title: string;
  titleEn: string;
  narration: string;
  shots: OpenShot[];
}

export interface OpenWork {
  id: string;
  title: string;
  titleEn: string;
  /** 一句话简介 */
  logline: string;
  /** 作者 / 来源仓库 */
  author: string;
  source: string;
  /** 分类 */
  category: '动画' | '科普';
  ratio: string;
  durationText: string;
  styleLock: string;
  characterLock: string;
  /** 角色设定图 */
  characters: { name: string; desc: string; image: string }[];
  /** 关键帧 */
  keyframes: { id: string; label: string; image: string }[];
  /** 分镜节拍 */
  beats: OpenBeat[];
  /** 成片（有视频的才有） */
  video?: string;
  /** 预览封面 */
  cover: string;
  /** 拍同款时填入输入坞的提示词 */
  remakePrompt: string;
}

export const OPEN_WORKS: OpenWork[] = [
  {
    id: 'last-lantern',
    title: '最后的灯笼',
    titleEn: 'The Last Lantern',
    logline: '灯笼之城 Solmar 十年来最大的灯一直熄灭；点灯少年 Milo 与最后一点火种化成的小狐狸 Ember、十年没笑过的公主 Lyra 一起，穿越风暴重新点亮皇家灯笼。',
    author: 'Đặng Hữu Sơn',
    source: 'github.com/sonlovinbot/Muse-animated-short-film',
    category: '动画',
    ratio: '16:9 · 1280×720',
    durationText: '约 85–90 秒 · 8 个场景',
    styleLock: 'soft 2D Disney/Pixar animation, clean rounded shapes, warm cinematic lighting, painterly rich backgrounds, 16:9, 1280x720, no text, no watermark.',
    characterLock: 'Milo = boy 10, messy brown hair, warm brown eyes, blue double-breasted keeper\'s jacket with gold buttons/trim, brown trousers, brown boots. Lyra = girl 9, silver-blonde side braid, golden star hairpin, silver tiara, moon-white dress, pale-blue starry cape. Ember = tiny baby fox of living golden ember-light, flame tail, big amber eyes.',
    characters: [
      { name: 'Milo', desc: '10 岁男孩 · 棕发棕眼 · 蓝色双排扣灯夫外套', image: '/works/the-last-lantern/milo-sheet.jpg' },
      { name: 'Lyra', desc: '9 岁公主 · 银金色侧辫 · 星形发夹 · 月白长裙', image: '/works/the-last-lantern/lyra-sheet.jpg' },
      { name: 'Ember', desc: '火焰小狐狸 · 金色余烬光 · 琥珀色大眼睛', image: '/works/the-last-lantern/ember-sheet.jpg' },
    ],
    keyframes: [
      { id: 'K1', label: '城市黄昏', image: '/works/the-last-lantern/k1-city-dusk.jpg' },
      { id: 'K2', label: '火花坠落', image: '/works/the-last-lantern/k2-spark-falls.jpg' },
      { id: 'K3', label: 'Ember 打喷嚏', image: '/works/the-last-lantern/k3-ember-sneeze.jpg' },
      { id: 'K7', label: '光之门', image: '/works/the-last-lantern/k7-door-light.jpg' },
    ],
    beats: [
      {
        id: 'beat-1', title: '褪色之光之城', titleEn: 'The City of Fading Light',
        narration: 'In the kingdom of Solmar, every light tells a story. But for ten years, the greatest light of all... stayed dark.',
        shots: [{ id: 'S1', type: 'wide', duration: 10, scene: '全城远景：悬崖上的灯笼之城，数百盏纸灯笼暖光，紫橙色黄昏天空；Milo 正在点灯', camera: '缓推 push-in', refs: ['MILO_SHEET'], frame: '/works/the-last-lantern/k1-city-dusk.jpg' }],
      },
      {
        id: 'beat-2', title: '最后的火种', titleEn: 'The Last Ember',
        narration: 'Some embers refuse to die. Some are just waiting... for someone who believes.',
        shots: [{ id: 'S2', type: 'medium', duration: 10, scene: '废弃灯塔内部：金色火点落入铜吊坠，化成小狐狸 Ember', camera: '缓推 + 微俯', refs: ['EMBER_SHEET'], frame: '/works/the-last-lantern/k2-spark-falls.jpg' }],
      },
      {
        id: 'beat-3', title: '沉默的公主', titleEn: 'The Silent Princess',
        narration: 'She had not laughed in ten years. Until a little fox sneezed sparks on her nose.',
        shots: [{ id: 'S3', type: 'close', duration: 10, scene: 'Lyra 循着光走来，Ember 打了个喷嚏溅出火花落在她鼻尖，她十年来第一次笑', camera: '固定 + 轻微手持', refs: ['LYRA_SHEET', 'EMBER_SHEET'], frame: '/works/the-last-lantern/k3-ember-sneeze.jpg' }],
      },
      {
        id: 'beat-4', title: '星空下的约定', titleEn: 'Promise Under the Stars',
        narration: "'I promise,' Milo said. 'We will light the sky again.'",
        shots: [{ id: 'S4', type: 'medium_wide', duration: 10, scene: '天文台山顶，三人拉勾约定；风起', camera: '环绕 orbit', refs: ['MILO_SHEET', 'LYRA_SHEET', 'EMBER_SHEET'] }],
      },
      {
        id: 'beat-5', title: '风暴', titleEn: 'The Storm',
        narration: 'The storm took every flame. Every flame... but one.',
        shots: [{ id: 'S5', type: 'wide', duration: 12, scene: '风暴撕破纸灯笼，火焰在玻璃罩里摇晃后熄灭；Milo 把 Ember 抱进外套里', camera: '快速推拉 + 抖动', refs: ['MILO_SHEET', 'EMBER_SHEET'] }],
      },
      {
        id: 'beat-6', title: '攀登', titleEn: 'The Climb',
        narration: 'And then, for the first time in ten years... the princess sang.',
        shots: [{ id: 'S6', type: 'medium', duration: 12, scene: '螺旋楼梯攀登，Lyra 唱起母亲的摇篮曲，Ember 的火光重新亮起', camera: '跟拍 tracking', refs: ['LYRA_SHEET', 'EMBER_SHEET'] }],
      },
      {
        id: 'beat-7', title: '皇家灯笼升起', titleEn: 'The Royal Lantern Rises',
        narration: 'One small heart of fire... lifted a whole kingdom.',
        shots: [{ id: 'S7', type: 'wide_epic', duration: 12, scene: 'Ember 献出心口的火种；灯夫打开小玻璃门、把引火棒触到灯芯；皇家灯笼升空，全城重新亮起', camera: '升格 + 上升', refs: ['EMBER_SHEET', 'MILO_SHEET'], frame: '/works/the-last-lantern/k7-door-light.jpg' }],
      },
      {
        id: 'beat-8', title: '黎明', titleEn: 'Dawn',
        narration: 'Some lights never go out. They just learn... to shine from the stars.',
        shots: [{ id: 'S8', type: 'wide', duration: 10, scene: '光之祭典，Ember 化作狐狸形状的星座；片尾', camera: '缓拉 pull-out', refs: [] }],
      },
    ],
    cover: '/works/the-last-lantern/k1-city-dusk.jpg',
    remakePrompt: `【类型】2D 动画短片 · 16:9 · 1280×720 · 总时长约 85–90 秒 · 8 个场景
【故事】灯笼之城 Solmar 十年来最大的皇家灯笼一直熄灭。点灯少年 Milo 找到最后一点火种化成的小狐狸 Ember，和十年没笑过的公主 Lyra 一起穿越风暴，重新点亮皇家灯笼。
【视觉风格】柔和 2D 迪士尼/皮克斯动画；圆润干净的造型；暖色电影光；厚涂背景；纸灯笼暖光与紫橙色黄昏天空；无文字、无水印。
【角色一致性】Milo：10 岁男孩，凌乱棕发，暖棕色眼睛，蓝色双排扣灯夫外套配金色纽扣与饰边，棕裤棕靴。Lyra：9 岁公主，银金色侧辫，星星发夹，银色小王冠，月白长裙，淡蓝星光斗篷。Ember：活的金色余烬光化成的小狐狸，火焰尾巴，琥珀色大眼睛。
【镜头结构】8 个场景依次推进：全城远景（缓推 push-in）→ 废弃灯塔化身（缓推 + 微俯）→ Ember 喷嚏溅火花（固定 + 轻微手持）→ 天文台拉勾约定（环绕 orbit）→ 风暴撕灯（快速推拉 + 抖动）→ 螺旋楼梯攀登（跟拍 tracking）→ 皇家灯笼升空（升格 + 上升）→ 黎明祭典收尾（缓拉 pull-out）。
【转场与节奏】match-cut 为主，光点在场景间做承接；情绪由压抑转明亮，最后一段全城回暖。
【旁白基调】温柔、有童话口吻，每场景一句。`,
  },
  {
    id: 'zack-swallow-gum',
    title: '吞下口香糖会怎样',
    titleEn: 'What Happens When You Swallow Gum?',
    logline: 'Zack D Films 风格的 3D 科普短片：一个问题开场，三个节拍讲清"吞下口香糖后身体里发生了什么"，带解剖剖面镜头与冲击缩放。',
    author: 'Anil Matcha',
    source: 'github.com/Anil-matcha/zack-d-films-ai-video-generator',
    category: '科普',
    ratio: '9:16 · 竖屏',
    durationText: '约 18 秒 · 3 个节拍 · 5 个镜头',
    styleLock: 'Stylized 3D, bright studio lighting, punchy edits, impact zooms, 9:16 vertical, no text, no watermark.',
    characterLock: 'main_character_turnaround（主角三视图）+ anatomical_organ_cross_section（解剖剖面参考）',
    characters: [
      { name: '主角三视图', desc: 'Stylized 3D 主角 · turnaround 参考', image: '/works/zack-d-films/beat_1_a.png' },
      { name: '解剖剖面', desc: 'anatomical organ cross-section', image: '/works/zack-d-films/beat_1_b.png' },
    ],
    keyframes: [
      { id: 'beat_1_a', label: '开场钩子 · 全景', image: '/works/zack-d-films/beat_1_a.png' },
      { id: 'beat_1_b', label: '开场钩子 · 剖面', image: '/works/zack-d-films/beat_1_b.png' },
      { id: 'beat_2_a', label: '身体机制 · 全景', image: '/works/zack-d-films/beat_2_a.png' },
      { id: 'beat_2_b', label: '身体机制 · 剖面', image: '/works/zack-d-films/beat_2_b.png' },
      { id: 'beat_3_a', label: '结论 · 全景', image: '/works/zack-d-films/beat_3_a.png' },
    ],
    beats: [
      {
        id: 'beat-1', title: '开场钩子', titleEn: 'Curiosity Hook',
        narration: 'What Happens When You Swallow Gum? Here is what actually happens inside your body.',
        shots: [
          { id: 'beat_1_a', type: 'wide', duration: 3, scene: 'Stylized 3D main character experiencing What Happens When You Swallow Gum?, wide shot in bright studio lighting.', camera: 'push_in', refs: ['main_character_turnaround'], impact: false, frame: '/works/zack-d-films/beat_1_a.png' },
          { id: 'beat_1_b', type: 'macro_cross_section', duration: 3, scene: 'Detailed anatomical 3D cutaway cross-section illustrating What Happens When You Swallow Gum? mechanism.', camera: 'tilt_down', refs: ['anatomical_organ_cross_section'], impact: true, frame: '/works/zack-d-films/beat_1_b.png' },
        ],
      },
      {
        id: 'beat-2', title: '身体机制', titleEn: 'Body Defense',
        narration: 'Your bodily defenses immediately kick in, attempting to neutralize the situation.',
        shots: [
          { id: 'beat_2_a', type: 'wide', duration: 3, scene: 'Stylized 3D main character with body defense reaction, wide shot in bright studio lighting.', camera: 'push_in', refs: ['main_character_turnaround'], impact: false, frame: '/works/zack-d-films/beat_2_a.png' },
          { id: 'beat_2_b', type: 'macro_cross_section', duration: 3, scene: 'Detailed anatomical 3D cutaway cross-section showing digestive defenses at work.', camera: 'tilt_down', refs: ['anatomical_organ_cross_section'], impact: true, frame: '/works/zack-d-films/beat_2_b.png' },
        ],
      },
      {
        id: 'beat-3', title: '结论', titleEn: 'The Verdict',
        narration: 'In the end, it simply passes through. Your body knows exactly what to do.',
        shots: [
          { id: 'beat_3_a', type: 'wide', duration: 3, scene: 'Stylized 3D main character relieved conclusion shot in bright studio lighting.', camera: 'pull_out', refs: ['main_character_turnaround'], impact: false, frame: '/works/zack-d-films/beat_3_a.png' },
        ],
      },
    ],
    video: '/works/zack-d-films/final.mp4',
    cover: '/works/zack-d-films/beat_1_a.png',
    remakePrompt: `【类型】竖屏 3D 科普短片 · 9:16 · 总时长约 18 秒 · 3 个节拍 · 5 个镜头 · 每镜头 3 秒
【视觉风格】程式化 3D（Stylized 3D）；明亮影棚光；干脆有力的剪辑；冲击缩放（impact zoom）；无文字、无水印。
【结构】节拍 1 开场钩子：用一句提问直接抓住注意力（全景 push_in + 解剖剖面 tilt_down）。节拍 2 身体机制：剖面镜头讲清内部的防御与消化过程（全景 push_in + 剖面 tilt_down）。节拍 3 结论：给一句干脆利落的收尾（全景 pull_out）。
【镜头规则】每个节拍固定「1 个全景 + 1 个解剖剖面」；剖面镜头一律 tilt_down 下摇并在关键结构上做冲击缩放；全景镜头统一 push_in 缓慢推入形成压迫感。
【角色一致性】主角为同一个程式化 3D 人物三视图（turnaround），全片不换脸；解剖剖面统一使用同一套器官比例与配色。
【镜头语言】镜头语言明确：每个镜头都要写清景别、机位运动、光位、主体动作四要素。
【旁白基调】疑问开场 → 中性解释 → 一句结论；语速快，句子短。`,
  },
];

export function findOpenWork(id: string): OpenWork | undefined {
  return OPEN_WORKS.find(w => w.id === id);
}

/** 更多开源作品（素材已下载，结构与主作品包一致） */
export const MORE_OPEN_WORKS: OpenWork[] = [
  {
    id: 'seedance-prompts',
    title: 'Seedance 提示词精选',
    titleEn: 'Awesome Seedance 2.5 Prompts',
    logline: '多语言精选的 Seedance 2.5 视频生成提示词合集，每条提示词都配了缩略图与可播放示例，覆盖蒸汽朋克、深海、时尚、品牌片等题材。',
    author: 'kinovi-ai',
    source: 'github.com/kinovi-ai/awesome-seedance-2-5-prompts',
    category: '科普',
    ratio: '16:9',
    durationText: '24 条提示词示例',
    styleLock: 'Seedance 2.5 视频生成提示词，含镜头语言与运动描述。',
    characterLock: '按提示词逐条控制角色与场景。',
    characters: [
      { name: '蒸汽朋克钟表', desc: '01 · steampunk clockwork odyssey', image: '/works/seedance-prompts/01-steampunk-clockwork-odyssey.jpg' },
      { name: '水晶球品牌片', desc: '02 · match-cut brand film', image: '/works/seedance-prompts/02-crystal-ball-match-cut-brand-film.jpg' },
      { name: '眼睛之窗概念片', desc: '03 · window to eye concept film', image: '/works/seedance-prompts/03-window-to-eye-concept-film.jpg' },
    ],
    keyframes: [
      { id: 'P1', label: '蒸汽朋克', image: '/works/seedance-prompts/01-steampunk-clockwork-odyssey.jpg' },
      { id: 'P2', label: '水晶球', image: '/works/seedance-prompts/02-crystal-ball-match-cut-brand-film.jpg' },
      { id: 'P3', label: '眼睛之窗', image: '/works/seedance-prompts/03-window-to-eye-concept-film.jpg' },
      { id: 'P4', label: '排版循环', image: '/works/seedance-prompts/04-multilingual-creative-typography-loop.jpg' },
    ],
    beats: [
      {
        id: 'beat-1', title: '蒸汽朋克钟表之旅', titleEn: 'Steampunk Clockwork Odyssey',
        narration: 'A steampunk clockwork odyssey through gears and brass.',
        shots: [{ id: 'P1', type: 'wide', duration: 5, scene: 'Steampunk clockwork odyssey — 齿轮与黄铜的机械世界', camera: 'push_in', refs: [], frame: '/works/seedance-prompts/01-steampunk-clockwork-odyssey.jpg' }],
      },
      {
        id: 'beat-2', title: '水晶球 match-cut 品牌片', titleEn: 'Crystal Ball Match Cut',
        narration: 'A match-cut brand film inside a crystal ball.',
        shots: [{ id: 'P2', type: 'macro', duration: 5, scene: 'Crystal ball match-cut brand film — 水晶球内外的无缝转场', camera: 'orbit', refs: [], frame: '/works/seedance-prompts/02-crystal-ball-match-cut-brand-film.jpg' }],
      },
      {
        id: 'beat-3', title: '眼睛之窗概念片', titleEn: 'Window to Eye',
        narration: 'A window opens into an eye — concept film.',
        shots: [{ id: 'P3', type: 'concept', duration: 5, scene: 'Window to eye concept film — 窗户化为眼睛的概念转场', camera: 'zoom', refs: [], frame: '/works/seedance-prompts/03-window-to-eye-concept-film.jpg' }],
      },
    ],
    cover: '/works/seedance-prompts/01-steampunk-clockwork-odyssey.jpg',
    remakePrompt: `【类型】概念短片 · 16:9 · 单条 5 秒 · 一个主转场
【核心手法】match-cut 无缝转场：前后两个镜头在形状、颜色或运动方向上严格对位，做到「看起来是一镜到底其实是两个镜头」。
【镜头语言三要素】景别（macro / close / wide）、机位运动（orbit / push_in / zoom）、光位（侧逆光 / 顶光 / 霓虹）三条必须显式写进每条提示词，不允许空泛描述。
【参考风格库】awesome-seedance-2-5-prompts：01 蒸汽朋克钟表之旅、02 水晶球 match-cut 品牌片、03 眼睛之窗概念片、04 多语言创意排版循环 —— 任选其一作为基调，混搭需说明取舍。
【风格锁定】Seedance 2.5：写实材质、高保真光影、细腻运动模糊；无文字、无水印。
【运镜描述】运动描述要包含起幅、过程、落幅三段，避免只说「缓慢推进」。
【节奏】5 秒内完成一次呼吸感：起 1 秒铺陈 → 中 3 秒主体 → 末 1 秒收势留白。
【题材】自行指定，需与所选风格基调自洽。`,
  },
];

/** 全部开源作品（主 + 更多） */
export const ALL_OPEN_WORKS: OpenWork[] = [...OPEN_WORKS, ...MORE_OPEN_WORKS];

/** 汇总统计（用于页面展示） */
export function openWorkStats() {
  const list = ALL_OPEN_WORKS;
  const shots = list.reduce((n, w) => n + w.beats.reduce((m, b) => m + b.shots.length, 0), 0);
  const chars = list.reduce((n, w) => n + w.characters.length, 0);
  const frames = list.reduce((n, w) => n + w.keyframes.length, 0);
  const videos = list.filter(w => !!w.video).length;
  return { works: list.length, shots, chars, frames, videos };
}
