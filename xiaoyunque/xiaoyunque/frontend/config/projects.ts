/* 「我的项目」示例项目数据
   真实项目来自后端 /api/sessions（跑过六阶段管线才会有）
   这些是演示用的示例项目，卡片上会带「示例」角标 —— 中性标注，不冒充真实产出 */

export type ProjectStageKey = 'script' | 'character' | 'storyboard' | 'reference' | 'video' | 'editor';

export interface DemoProject {
  id: string;
  title: string;
  brief: string;
  cover: string;
  kind: '短剧' | '动画' | '电商' | '口播' | '动作' | '自由' | '开源';
  status: '已完成' | '进行中' | '草稿';
  updatedAt: string;
  ratio: string;
  duration: string;
  /** 已完成的阶段（6 个阶段里的前 N 个） */
  doneStages: number;
  /** 角标类型：示例 / 开源作品包 */
  badge?: '示例' | '开源';
  /** 有完整数据（可进画布看真实分镜） */
  rich?: boolean;
}

/** 真实开源作品包（数据来自开源仓库，素材在 /public/works/） */
export const OPEN_PROJECTS: DemoProject[] = [
  {
    id: 'last-lantern',
    title: '最后的灯笼',
    brief: '开源动画短片 · 8 场景 · 3 角色 · 9 关键帧 · 完整分镜与提示词',
    cover: '/works/the-last-lantern/k1-city-dusk.jpg',
    kind: '开源',
    status: '已完成',
    updatedAt: '开源作品',
    ratio: '16:9',
    duration: '约 85–90 秒',
    doneStages: 5,
    badge: '开源',
    rich: true,
  },
  {
    id: 'zack-swallow-gum',
    title: '吞下口香糖会怎样',
    brief: '开源 3D 科普短片 · 3 节拍 5 镜头 · 含成片与解剖剖面参考',
    cover: '/works/zack-d-films/beat_1_a.png',
    kind: '开源',
    status: '已完成',
    updatedAt: '开源作品',
    ratio: '9:16',
    duration: '约 18 秒',
    doneStages: 6,
    badge: '开源',
    rich: true,
  },
  {
    id: 'seedance-prompts',
    title: 'Seedance 提示词精选',
    brief: '开源提示词合集 · 24 条示例 · 覆盖蒸汽朋克/深海/品牌片等题材',
    cover: '/works/seedance-prompts/01-steampunk-clockwork-odyssey.jpg',
    kind: '开源',
    status: '已完成',
    updatedAt: '开源作品',
    ratio: '16:9',
    duration: '24 条示例',
    doneStages: 4,
    badge: '开源',
    rich: true,
  },
];

export const STAGE_ORDER: { key: ProjectStageKey; label: string }[] = [
  { key: 'script', label: '剧本' },
  { key: 'character', label: '角色场景' },
  { key: 'storyboard', label: '分镜' },
  { key: 'reference', label: '参考图' },
  { key: 'video', label: '视频' },
  { key: 'editor', label: '成片' },
];

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'demo-jiantou',
    title: '剑与影',
    brief: '古风武侠 · 竹林对峙开场，六阶段全流程',
    cover: '/cases/short-drama/067.jpg',
    kind: '短剧', status: '已完成', updatedAt: '2 小时前', ratio: '16:9', duration: '1 分 42 秒', doneStages: 6,
  },
  {
    id: 'demo-neon',
    title: '霓虹夜行',
    brief: '都市情绪短片 · 夜景霓虹，独白式叙事',
    cover: '/cases/short-drama/009.jpg',
    kind: '短剧', status: '已完成', updatedAt: '3 小时前', ratio: '9:16', duration: '48 秒', doneStages: 6,
  },
  {
    id: 'demo-rain',
    title: '雨夜序章',
    brief: '悬疑开场 · 黑白影调，悬念留白',
    cover: '/cases/short-drama/048.jpg',
    kind: '短剧', status: '进行中', updatedAt: '5 小时前', ratio: '16:9', duration: '—', doneStages: 4,
  },
  {
    id: 'demo-ice',
    title: '冰原少女',
    brief: '动画短片 · 冰雪场景，柔光渲染',
    cover: '/cases/animation/081.jpg',
    kind: '动画', status: '已完成', updatedAt: '昨天', ratio: '9:16', duration: '35 秒', doneStages: 6,
  },
  {
    id: 'demo-dragon',
    title: '金龙之城',
    brief: '奇幻场景 · 云海城堡，宏大构图',
    cover: '/cases/animation/083.jpg',
    kind: '动画', status: '进行中', updatedAt: '昨天', ratio: '16:9', duration: '—', doneStages: 3,
  },
  {
    id: 'demo-perfume',
    title: '香水静物',
    brief: '电商主图套图 · 深色岩面，侧逆光打透瓶身',
    cover: '/cases/ecommerce/060.jpg',
    kind: '电商', status: '已完成', updatedAt: '昨天', ratio: '1:1', duration: '—', doneStages: 6,
  },
  {
    id: 'demo-moto',
    title: '街头机车',
    brief: '带货短视频 · 动态场景，夜景光斑',
    cover: '/cases/ecommerce/227.jpg',
    kind: '电商', status: '草稿', updatedAt: '2 天前', ratio: '9:16', duration: '—', doneStages: 1,
  },
  {
    id: 'demo-office',
    title: '职场开场白',
    brief: '数字人口播 · 半身构图，专业形象',
    cover: '/cases/portrait/073.jpg',
    kind: '口播', status: '已完成', updatedAt: '2 天前', ratio: '9:16', duration: '1 分 05 秒', doneStages: 6,
  },
  {
    id: 'demo-smile',
    title: '阳光下的微笑',
    brief: '数字人口播 · 正面构图，亲和力强',
    cover: '/cases/portrait/240.jpg',
    kind: '口播', status: '进行中', updatedAt: '3 天前', ratio: '9:16', duration: '—', doneStages: 5,
  },
  {
    id: 'demo-motion',
    title: '霓光动作',
    brief: '动作迁移 · 霓虹光效，动态姿势',
    cover: '/cases/motion/011.jpg',
    kind: '动作', status: '进行中', updatedAt: '3 天前', ratio: '16:9', duration: '—', doneStages: 4,
  },
  {
    id: 'demo-mecha',
    title: '机械之心',
    brief: '科幻概念 · 金属质感，未来感场景',
    cover: '/cases/free/075.jpg',
    kind: '自由', status: '已完成', updatedAt: '4 天前', ratio: '9:16', duration: '22 秒', doneStages: 6,
  },
  {
    id: 'demo-lake',
    title: '湖畔日落',
    brief: '风光短片 · 远山倒影，暖调电影感',
    cover: '/cases/free/079.jpg',
    kind: '自由', status: '草稿', updatedAt: '5 天前', ratio: '16:9', duration: '—', doneStages: 2,
  },
];
