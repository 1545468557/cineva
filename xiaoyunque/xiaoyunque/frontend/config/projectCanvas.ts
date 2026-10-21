/* 项目画布数据：六阶段结果铺在画布上的节点内容
   对标 OiiOii 的真实画布 —— 画布上是「任务结果」，不是空白创作台 */

export type StageStatus = '已完成' | '进行中' | '待开始';
export type StageKind = 'script' | 'character' | 'storyboard' | 'reference' | 'video' | 'final';

export interface StageField {
  label: string;
  value: string;
}

export interface StageNodeData {
  id: string;
  index: string;
  title: string;
  kind: StageKind;
  status: StageStatus;
  summary: string;
  fields: StageField[];
  /** 缩略图（1~6 张） */
  images?: string[];
  /** 纯文本块（剧本那种） */
  body?: string;
  /** 是否有视频（显示播放按钮） */
  hasVideo?: boolean;
}

const C = (scene: string, id: string) => `/cases/${scene}/${id}.jpg`;

export const CANVAS_STAGES: StageNodeData[] = [
  {
    id: 'stage-script',
    index: '01',
    title: '剧本',
    kind: 'script',
    status: '已完成',
    summary: '古风武侠 · 1 分 42 秒 · 4 集',
    fields: [
      { label: '类型', value: '古风 / 武侠' },
      { label: '时长', value: '1 分 42 秒' },
      { label: '集数', value: '4 集' },
      { label: '风格', value: '写实电影感' },
    ],
    body: '竹林深处，两位剑客隔雨对峙。刀光落下的前一秒，画面切回十年前——他们曾是同门。',
  },
  {
    id: 'stage-character',
    index: '02',
    title: '角色 / 场景',
    kind: 'character',
    status: '已完成',
    summary: '3 个角色 · 4 个场景 · 一致性已锁定',
    fields: [
      { label: '角色数', value: '3' },
      { label: '场景数', value: '4' },
      { label: '一致性', value: '已锁定' },
      { label: '参考图', value: '12 张' },
    ],
    images: [C('short-drama', '067'), C('portrait', '073'), C('free', '019'), C('short-drama', '249')],
  },
  {
    id: 'stage-storyboard',
    index: '03',
    title: '分镜',
    kind: 'storyboard',
    status: '已完成',
    summary: '6 个镜头 · 平均镜长 7 秒',
    fields: [
      { label: '镜头数', value: '6' },
      { label: '总时长', value: '42 秒' },
      { label: '平均镜长', value: '7 秒' },
      { label: '转场', value: '硬切 / 叠化' },
    ],
    images: [
      C('short-drama', '009'), C('short-drama', '030'), C('short-drama', '048'),
      C('short-drama', '067'), C('short-drama', '205'), C('short-drama', '275'),
    ],
  },
  {
    id: 'stage-reference',
    index: '04',
    title: '参考图',
    kind: 'reference',
    status: '已完成',
    summary: '8 张 · 1024×1536 · 已校验',
    fields: [
      { label: '张数', value: '8' },
      { label: '分辨率', value: '1024×1536' },
      { label: '模型', value: 'doubao-seedream-5-0' },
      { label: '一致性', value: '通过' },
    ],
    images: [C('short-drama', '293'), C('animation', '171'), C('short-drama', '275'), C('short-drama', '249')],
  },
  {
    id: 'stage-video',
    index: '05',
    title: '视频',
    kind: 'video',
    status: '进行中',
    summary: '6 个片段 · 4/6 已生成',
    fields: [
      { label: '片段', value: '6' },
      { label: '已完成', value: '4' },
      { label: '模型', value: 'wan2.7-i2v' },
      { label: '分辨率', value: '720P' },
    ],
    images: [C('short-drama', '067'), C('short-drama', '048'), C('motion', '011'), C('motion', '289')],
    hasVideo: true,
  },
  {
    id: 'stage-final',
    index: '06',
    title: '成片',
    kind: 'final',
    status: '待开始',
    summary: '等待视频阶段完成',
    fields: [
      { label: '时长', value: '—' },
      { label: '字幕', value: '待生成' },
      { label: 'BGM', value: '待混音' },
      { label: '输出', value: '16:9 · 1080P' },
    ],
    images: [C('short-drama', '030')],
    hasVideo: true,
  },
];

export interface CanvasEdgeDef {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export const CANVAS_EDGES: CanvasEdgeDef[] = [
  { id: 'e1', source: 'stage-script', target: 'stage-character', label: '拆解' },
  { id: 'e2', source: 'stage-character', target: 'stage-storyboard', label: '排版' },
  { id: 'e3', source: 'stage-storyboard', target: 'stage-reference', label: '出图' },
  { id: 'e4', source: 'stage-reference', target: 'stage-video', label: '生视频' },
  { id: 'e5', source: 'stage-video', target: 'stage-final', label: '合成' },
];

/** 画布节点布局（横向流水，间距足够避免重叠） */
export const NODE_W = 460;
export const NODE_GAP = 120;
export const NODE_X0 = 80;
export const NODE_Y0 = 120;

export function nodePosition(index: number): { x: number; y: number } {
  return { x: NODE_X0 + index * (NODE_W + NODE_GAP), y: NODE_Y0 };
}
