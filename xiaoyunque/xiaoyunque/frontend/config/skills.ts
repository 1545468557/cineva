/* 技能库数据
   对标 OiiOii 的 /skill：我的技能 / 全部 / 分类 + ＋创建我的技能 + 卡片带 分享·收藏·试试看
   技能来源：把首页六个场景的技能卡汇总去重，再补几个通用技能
   提示词统一从 config/scenes.ts 取结构化长 prompt，避免两处维护不一致 */

import type { SceneSkillIcon, SceneTone } from './scenes';
import { SCENES, type SceneSkill } from './scenes';

export type SkillCategory = '短剧' | '动画' | '电商' | '口播' | '动作' | '通用';

export const SKILL_CATEGORIES: SkillCategory[] = ['短剧', '动画', '电商', '口播', '动作', '通用'];

/** 取场景卡里的结构化长 prompt；同 id 多处出现时取第一个（短剧场景优先） */
function scenePrompt(id: string): string {
  for (const scene of SCENES) {
    const hit = scene.skills.find(s => s.id === id);
    if (hit) return hit.prompt;
  }
  return '';
}

/** 取场景卡的参数（ratio / style / videoMode），缺省用技能库自带的 */
function sceneConfig(id: string): Pick<SceneSkill, 'ratio' | 'style' | 'videoMode'> {
  for (const scene of SCENES) {
    const hit = scene.skills.find(s => s.id === id);
    if (hit) return { ratio: hit.ratio, style: hit.style, videoMode: hit.videoMode };
  }
  return {};
}

const C = (scene: string, id: string) => `/cases/${scene}/${id}.jpg`;

/** 技能库独有技能的提示词（场景卡里没有的项在这里写结构化长 prompt） */
const LIBRARY_PROMPTS: Record<string, string> = {
  'scene-design': `场景概念图：一张主视角 + 两张不同时段变体（同机位、不同光线）。

【格式要求】写清天空与色彩基调、光源方向与色温、大气元素（雾 / 尘 / 雨）、空间纵深层次（前中后景各一处主体）、镜头焦段与景深。
【构图要求】地平线位置、视觉重心、引导线三者写明；主体与画面的占比用可度量语言描述。
【输出比例】16:9。

场景是`,
  'prop-design': `道具设定图：三视图 + 一张细节特写（材质纹理）。

【格式要求】纯色浅灰背景，道具居中、比例明确；写清整体尺寸、重量感、材质分层（表层 / 中层 / 芯材）与三处以上磨损或做旧细节。
【可复用性】附一段「用于后续镜头的一致性描述」，把形状关键词、主色、光泽度固定下来。
【输出比例】1:1。

道具是`,
  'script-writer': `写一版可直接开拍的脚本，按以下结构输出：

【Logline】一句话说清主角、目标、阻碍、代价（不超过 40 字）。
【人物】主角 / 对立面 / 功能角色各一段，写明动机与转变。
【三幕结构】建置（钩子）→ 对抗（升级两次）→ 收束（反转或留白），每幕标注时长占比。
【分场表】场号 / 场景 / 内外景 / 时间 / 出场人物 / 本场功能。
【旁白】逐句写出，每句标注对应镜头与时长，单句不超过 18 字。
【镜头提示】每场给出景别与运镜建议。

主题是`,
  'ink-scene': `国风场景概念图：山水意境 + 留白构图。

【格式要求】墨色浓淡分五层，只取两三层入画；远山用淡墨横扫，近石用湿笔点簇；天空与水面大面积留白作「气口」。
【构图要求】遵循「三远法」（高远 / 深远 / 平远）择一写明；题款与印章位置预留但留空。
【色彩要求】整体低饱和，仅一处朱红点缀（印章或檐角）。
【输出比例】16:9，风格锁定国风水墨，禁用油画与 3D 渲染质感。

场景是`,
  'digital-human-sell': `数字人口播带货视频。

【形象一致性】以上传照片为唯一形象来源，五官、发型、肤色、服装严格一致，禁止换脸或美化漂移；手持商品时手部结构需正确（五指、无穿模）。
【构图】七分身，9:16 竖屏，商品置于画面中上三分之一且朝向镜头，头顶留 15% 空间。
【口型与台词】口播稿逐句拆分，每句 6–14 字，句间 0.3 秒停顿；标注重读词；商品名至少出现两次。
【灯光】柔和顺光 + 商品轮廓光，避免侧光阴阳脸。
【输出】9:16，参考图生视频模式。

商品是`,
  'motion-beat': `按音乐鼓点编排动作切分。

【输入】先给出音乐 BPM、拍号与段落结构（前奏 / 主歌 / 副歌 / 尾奏），再列出每个鼓点的时点。
【动作切分】每 N 拍一个切点，切点必须落在重拍上；爆发动作对齐底鼓，收势动作对齐军鼓；一段动作内不允许跨段落切分。
【输出格式】点位表：时间点 / 拍序号 / 画面事件 / 动作类型（起跳 / 落地 / 转身 / 出手 / 停顿）。
【约束】动作速度变化要与鼓点密度一致，禁止匀速拖拍。

内容是`,
  'ref-video-parse': `解析参考视频并输出可复用的拍摄手法。

【镜头拆解】逐镜列出：镜号 / 起止时间 / 景别 / 机位高度 / 运镜（含起幅过程落幅）/ 焦段 / 构图方式。
【动作节拍】逐镜列出主体动作、速度、节奏点与呼吸点。
【节奏统计】给出镜头时长序列、平均镜长、长短镜分布，指出「快切段」与「慢呼吸段」的位置。
【可复用手法】提炼 5 条可直接套用的手法，每条说明效果、适用场景与实现前提。
【输出格式】先拆解表，再手法清单，最后给一份「复刻到新素材」的迁移建议。`,
};

/** 兼容旧 id 的别名映射 */
const PROMPT_ALIAS: Record<string, string> = {
  'digital-human-sell': 'digital-human',
};

/** 统一取 prompt：场景卡优先 → 技能库独有 → 别名兜底 */
function promptOf(id: string): string {
  return scenePrompt(id) || LIBRARY_PROMPTS[id] || scenePrompt(PROMPT_ALIAS[id]) || '';
}

/** 统一取 ratio / style / videoMode：场景卡优先，缺失时回落 */
function inherits(id: string) {
  return sceneConfig(id) || sceneConfig(PROMPT_ALIAS[id]) || {};
}

export interface SkillItem {
  id: string;
  name: string;
  desc: string;
  category: SkillCategory;
  icon: SceneSkillIcon;
  tone: SceneTone;
  cover: string;
  /** 点「试试看」时填进输入坞的提示词 */
  prompt: string;
  ratio?: string;
  style?: string;
  videoMode?: 'first_frame' | 'start_end_frame' | 'reference';
  /** 示例使用量（本机没有真实统计，用相对量级展示热度） */
  uses: string;
  author: '官方' | '我的';
}

function S(item: Omit<SkillItem, 'prompt'> & { prompt: string }): SkillItem {
  return { ...item, prompt: promptOf(item.id) || item.prompt, ...inherits(item.id) };
}

export const SKILLS: SkillItem[] = [
  // ── 短剧 ──
  S({
    id: 'storyboard-video', name: '故事板做视频', category: '短剧', icon: 'clapper', tone: 'blue',
    desc: '把故事拆成镜头并生成分镜，最后直接合成短片',
    cover: C('short-drama', '067'),
    prompt: '把这段故事拆成 6 个镜头并生成分镜，最后合成短片：',
    ratio: '16:9', videoMode: 'first_frame', uses: '1.2 万次使用', author: '官方',
  }),
  S({
    id: 'character', name: '角色设计', category: '短剧', icon: 'character', tone: 'gold',
    desc: '正面、侧面、背面三视图，统一服装与配色',
    cover: C('portrait', '073'),
    prompt: '角色设计：正面、侧面、背面三视图，统一服装与配色，纯色背景，主角是',
    ratio: '1:1', uses: '9800 次使用', author: '官方',
  }),
  S({
    id: 'scene-design', name: '场景设计', category: '短剧', icon: 'scene', tone: 'blue',
    desc: '关键场景概念图，环境氛围与构图一次到位',
    cover: C('short-drama', '249'),
    prompt: LIBRARY_PROMPTS['scene-design'],
    ratio: '16:9', uses: '7600 次使用', author: '官方',
  }),
  S({
    id: 'hit-remake', name: '爆款复刻', category: '短剧', icon: 'sparkles', tone: 'magenta',
    desc: '对标爆款的节奏与镜头语言，换成你自己的故事',
    cover: C('short-drama', '009'),
    prompt: '复刻这个爆款视频的节奏与镜头语言，换成我自己的故事：',
    videoMode: 'reference', uses: '2.1 万次使用', author: '官方',
  }),
  S({
    id: 'prop-design', name: '道具设计', category: '短剧', icon: 'prop', tone: 'indigo',
    desc: '关键物件设定图，材质比例细节清晰',
    cover: C('ecommerce', '279'),
    prompt: LIBRARY_PROMPTS['prop-design'],
    ratio: '1:1', uses: '4200 次使用', author: '官方',
  }),
  S({
    id: 'script-writer', name: '文案脚本', category: '短剧', icon: 'text', tone: 'neutral',
    desc: 'logline + 分段旁白 + 镜头提示，可直接开拍',
    cover: C('short-drama', '030'),
    prompt: LIBRARY_PROMPTS['script-writer'],
    uses: '1.5 万次使用', author: '官方',
  }),
  // ── 动画 ──
  S({
    id: 'ink-animation', name: '水墨动画', category: '动画', icon: 'image', tone: 'teal',
    desc: '写意留白，国风质感，笔触连贯',
    cover: C('animation', '171'),
    prompt: '水墨中国风动画，笔触写意留白，画面是',
    style: 'chinese-ink', uses: '6300 次使用', author: '官方',
  }),
  S({
    id: 'gif-design', name: 'Gif 动画设计', category: '动画', icon: 'sparkles', tone: 'magenta',
    desc: '短循环动态素材，首尾衔接自然',
    cover: C('animation', '081'),
    prompt: '设计一个可循环的 Gif 动画，动作首尾衔接自然，内容是',
    ratio: '1:1', uses: '3900 次使用', author: '官方',
  }),
  S({
    id: 'storyboard', name: '分镜设计', category: '动画', icon: 'clapper', tone: 'indigo',
    desc: '镜头语言逐格拆解，标注景别与运镜',
    cover: C('short-drama', '275'),
    prompt: '把内容拆成 6 个分镜，标注景别与运镜：',
    style: 'comic-book', uses: '8100 次使用', author: '官方',
  }),
  S({
    id: 'ink-scene', name: '国风场景', category: '动画', icon: 'scene', tone: 'teal',
    desc: '山水意境与留白构图',
    cover: C('short-drama', '293'),
    prompt: LIBRARY_PROMPTS['ink-scene'],
    style: 'chinese-ink', ratio: '16:9', uses: '3400 次使用', author: '官方',
  }),
  // ── 电商 ──
  S({
    id: 'product-poster', name: '商品主图', category: '电商', icon: 'product', tone: 'magenta',
    desc: '干净构图、柔和顶光，突出材质细节',
    cover: C('ecommerce', '060'),
    prompt: '商品主图：构图干净、柔和顶光、突出材质细节，商品是',
    ratio: '1:1', uses: '1.8 万次使用', author: '官方',
  }),
  S({
    id: 'product-set', name: '商品套图', category: '电商', icon: 'image', tone: 'blue',
    desc: '一张商品铺多个场景，风格统一',
    cover: C('ecommerce', '279'),
    prompt: '同一商品的多场景套图，风格统一，商品是',
    ratio: '1:1', uses: '9200 次使用', author: '官方',
  }),
  S({
    id: 'goods-video', name: '带货短视频', category: '电商', icon: 'video', tone: 'indigo',
    desc: '15 秒展示 + 卖点口播脚本',
    cover: C('ecommerce', '227'),
    prompt: '生成一条 15 秒带货短视频脚本与画面：',
    ratio: '9:16', uses: '1.1 万次使用', author: '官方',
  }),
  S({
    id: 'digital-human-sell', name: '数字人带货', category: '电商', icon: 'avatar', tone: 'magenta',
    desc: '真人形象手持商品讲解卖点',
    cover: C('portrait', '240'),
    prompt: LIBRARY_PROMPTS['digital-human-sell'],
    ratio: '9:16', videoMode: 'reference', uses: '7400 次使用', author: '官方',
  }),
  // ── 口播 ──
  S({
    id: 'digital-human', name: '数字人口播', category: '口播', icon: 'avatar', tone: 'magenta',
    desc: '一张形象照，生成开口讲解的视频',
    cover: C('portrait', '073'),
    prompt: '数字人口播：自然口型与手势，参考我的形象照，口播稿是',
    ratio: '9:16', videoMode: 'reference', uses: '2.3 万次使用', author: '官方',
  }),
  S({
    id: 'portrait-consistency', name: '角色一致性', category: '口播', icon: 'character', tone: 'gold',
    desc: '多镜头保持同一张脸，不崩不飘',
    cover: C('portrait', '234'),
    prompt: '保持人物身份与外观一致，生成多角度画面：',
    ratio: '1:1', uses: '1.3 万次使用', author: '官方',
  }),
  S({
    id: 'subtitle', name: '字幕生成', category: '口播', icon: 'text', tone: 'neutral',
    desc: '分句打轴 + 样式建议，每行不超过 14 字',
    cover: C('portrait', '266'),
    prompt: '把内容整理成字幕稿：每行不超过 14 字，给出时间轴建议。内容：',
    uses: '5600 次使用', author: '官方',
  }),
  S({
    id: 'bgm', name: '智能配乐', category: '口播', icon: 'music', tone: 'indigo',
    desc: '按画面节奏推荐背景音乐与卡点',
    cover: C('free', '075'),
    prompt: '为这条视频推荐背景音乐风格与节奏点，内容是',
    uses: '4800 次使用', author: '官方',
  }),
  // ── 动作 ──
  S({
    id: 'action-transfer', name: '动作迁移', category: '动作', icon: 'motion', tone: 'indigo',
    desc: '参考视频的动作搬到你的角色上',
    cover: C('motion', '289'),
    prompt: '动作迁移：保持角色外观，复用参考视频的动作节奏',
    videoMode: 'reference', uses: '1.6 万次使用', author: '官方',
  }),
  S({
    id: 'motion-beat', name: '卡点动作', category: '动作', icon: 'music', tone: 'magenta',
    desc: '按音乐鼓点切动作，节奏更抓人',
    cover: C('motion', '011'),
    prompt: LIBRARY_PROMPTS['motion-beat'],
    uses: '4100 次使用', author: '官方',
  }),
  S({
    id: 'ref-video-parse', name: '参考视频解析', category: '动作', icon: 'video', tone: 'blue',
    desc: '拆出参考视频的镜头、动作与节奏',
    cover: C('short-drama', '048'),
    prompt: LIBRARY_PROMPTS['ref-video-parse'],
    uses: '2900 次使用', author: '官方',
  }),
  // ── 通用 ──
  S({
    id: 'free-image', name: '自由创作图片', category: '通用', icon: 'image', tone: 'blue',
    desc: '按描述或参考图直接出图',
    cover: C('free', '079'),
    prompt: '自由创作：',
    uses: '3.4 万次使用', author: '官方',
  }),
  S({
    id: 'img2img', name: '图生图改造', category: '通用', icon: 'sparkles', tone: 'magenta',
    desc: '保持构图，换风格换氛围',
    cover: C('free', '188'),
    prompt: '在保持构图一致的前提下改造这张图：换风格为',
    uses: '2.6 万次使用', author: '官方',
  }),
  S({
    id: 'upscale', name: '图片放大', category: '通用', icon: 'image', tone: 'gold',
    desc: '低清素材变可用，细节增强不糊',
    cover: C('free', '220'),
    prompt: '放大并增强细节，保持原始构图与配色不变',
    uses: '1.9 万次使用', author: '官方',
  }),
  S({
    id: 'free-video', name: '自由创作视频', category: '通用', icon: 'video', tone: 'teal',
    desc: '文生视频 / 图生视频，单镜头起做',
    cover: C('animation', '083'),
    prompt: '生成一段视频：',
    uses: '1.4 万次使用', author: '官方',
  }),
];

export function findSkill(id: string): SkillItem | undefined {
  return SKILLS.find(s => s.id === id);
}

/* ── 用户自建技能（存本地）── */
const MY_SKILLS_KEY = 'cineva.mySkills';

export interface MySkill {
  id: string;
  name: string;
  desc: string;
  category: SkillCategory;
  prompt: string;
}

export function loadMySkills(): MySkill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MY_SKILLS_KEY);
    return raw ? (JSON.parse(raw) as MySkill[]) : [];
  } catch {
    return [];
  }
}

export function saveMySkills(list: MySkill[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MY_SKILLS_KEY, JSON.stringify(list));
}

export function mySkillToItem(s: MySkill): SkillItem {
  return {
    id: `my-${s.id}`,
    name: s.name,
    desc: s.desc || '我自己创建的技能',
    category: s.category,
    icon: 'sparkles',
    tone: 'neutral',
    cover: '/cases/free/079.jpg',
    prompt: s.prompt,
    uses: '我的技能',
    author: '我的',
  };
}
