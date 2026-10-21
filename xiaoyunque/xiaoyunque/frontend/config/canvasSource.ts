/* 画布数据源：真实开源作品 → 画布节点
   把开源作品包（角色/关键帧/分镜/提示词）转成画布上的阶段卡片 */

import { ALL_OPEN_WORKS, type OpenWork } from './openWorks';
import { OPEN_PROJECTS, DEMO_PROJECTS } from './projects';
import type { StageField, StageNodeData, StageStatus } from './projectCanvas';
import { NODE_W, nodePosition } from './projectCanvas';

/** 画布数据源可识别的全部演示项目（开源作品包 + 普通示例） */
const ALL_DEMO_PROJECTS = [...OPEN_PROJECTS, ...DEMO_PROJECTS];

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

/** 把开源作品转成画布节点（六阶段：剧本 → 角色 → 分镜 → 关键帧 → 视频 → 成片） */
export function buildOpenWorkCanvas(work: OpenWork): { nodes: StageNodeData[]; edges: CanvasEdge[] } {
  const shotCount = work.beats.reduce((n, b) => n + b.shots.length, 0);
  const totalSec = work.beats.reduce((n, b) => n + b.shots.reduce((m, s) => m + s.duration, 0), 0);

  const nodes: StageNodeData[] = [
    {
      id: 'stage-script',
      index: '01',
      title: '剧本',
      kind: 'script',
      status: '已完成',
      summary: `${work.beats.length} 个节拍 · ${work.durationText}`,
      fields: [
        { label: '节拍数', value: String(work.beats.length) },
        { label: '镜头数', value: String(shotCount) },
        { label: '比例', value: work.ratio },
        { label: '来源', value: '开源作品包' },
      ],
      body: work.logline,
    },
    {
      id: 'stage-character',
      index: '02',
      title: '角色 / 场景',
      kind: 'character',
      status: '已完成',
      summary: `${work.characters.length} 个角色 · 一致性已锁定`,
      fields: [
        { label: '角色数', value: String(work.characters.length) },
        { label: '一致性', value: '已锁定' },
        { label: '参考图', value: `${work.characters.length} 张` },
        { label: '风格', value: work.category === '动画' ? '2D 动画' : '3D 科普' },
      ],
      images: work.characters.map(c => c.image),
    },
    {
      id: 'stage-storyboard',
      index: '03',
      title: '分镜',
      kind: 'storyboard',
      status: '已完成',
      summary: `${work.beats.length} 节拍 · ${shotCount} 个镜头 · 共 ${totalSec} 秒`,
      fields: [
        { label: '节拍', value: String(work.beats.length) },
        { label: '镜头', value: String(shotCount) },
        { label: '总时长', value: `${totalSec} 秒` },
        { label: '运镜', value: '含推拉/环绕/跟拍' },
      ],
      images: work.beats.flatMap(b => b.shots.filter(s => s.frame).map(s => s.frame!)).slice(0, 6),
    },
    {
      id: 'stage-reference',
      index: '04',
      title: '关键帧',
      kind: 'reference',
      status: '已完成',
      summary: `${work.keyframes.length} 张关键帧 · 首尾帧衔接`,
      fields: [
        { label: '张数', value: String(work.keyframes.length) },
        { label: '首尾衔接', value: 'match-cut' },
        { label: '参考顺序', value: '角色图优先' },
        { label: '状态', value: '已校验' },
      ],
      images: work.keyframes.map(k => k.image).slice(0, 4),
    },
    {
      id: 'stage-video',
      index: '05',
      title: '视频',
      kind: 'video',
      status: work.video ? '已完成' : '进行中',
      summary: work.video ? `${shotCount} 个片段 · 已成片` : `${shotCount} 个片段 · 待生成`,
      fields: [
        { label: '片段', value: String(shotCount) },
        { label: '已成片', value: work.video ? '是' : '否' },
        { label: '时长', value: `${totalSec} 秒` },
        { label: '比例', value: work.ratio },
      ],
      images: work.beats.flatMap(b => b.shots.filter(s => s.frame).map(s => s.frame!)).slice(0, 4),
      hasVideo: !!work.video,
    },
    {
      id: 'stage-final',
      index: '06',
      title: '成片',
      kind: 'final',
      status: work.video ? '已完成' : '待开始',
      summary: work.video ? '已合成，可播放' : '等待视频阶段完成',
      fields: [
        { label: '时长', value: `${totalSec} 秒` },
        { label: '旁白', value: `${work.beats.length} 句` },
        { label: '输出', value: work.ratio },
        { label: '授权', value: '开源' },
      ],
      images: [work.cover],
      hasVideo: !!work.video,
    },
  ];

  const edges: CanvasEdge[] = [
    { id: 'e1', source: 'stage-script', target: 'stage-character', label: '拆解' },
    { id: 'e2', source: 'stage-character', target: 'stage-storyboard', label: '排版' },
    { id: 'e3', source: 'stage-storyboard', target: 'stage-reference', label: '出图' },
    { id: 'e4', source: 'stage-reference', target: 'stage-video', label: '生视频' },
    { id: 'e5', source: 'stage-video', target: 'stage-final', label: '合成' },
  ];

  return { nodes, edges };
}

/** 把演示项目转成画布节点：每个项目按自己的标题 / 类型 / 比例派生，
 *  不再让所有示例项目共用同一套「剑与影」硬编码数据 */
export function buildDemoCanvas(project: {
  id: string;
  title: string;
  brief: string;
  kind: string;
  ratio: string;
  duration: string;
  cover: string;
  doneStages: number;
}): { nodes: StageNodeData[]; edges: CanvasEdge[] } {
  const shotCount = Math.max(4, project.doneStages * 2);
  const avg = project.doneStages >= 6 ? '7 秒' : '—';
  const media = (i: number) => `/cases/${
    project.kind === '动画' ? 'animation' : project.kind === '电商' ? 'ecommerce'
      : project.kind === '口播' ? 'portrait' : project.kind === '动作' ? 'motion'
        : project.kind === '自由' ? 'free' : 'short-drama'
  }/${['067', '081', '060', '073', '011', '075', '009', '048', '249', '240', '227', '079'][i % 12]}.jpg`;

  const done = (n: number): StageNodeData['status'] =>
    project.doneStages >= n ? '已完成' : project.doneStages === n - 1 ? '进行中' : '待开始';

  const nodes: StageNodeData[] = [
    {
      id: 'stage-script', index: '01', title: '剧本', kind: 'script', status: done(1),
      summary: `${project.kind} · ${project.duration} · 示例项目`,
      fields: [
        { label: '类型', value: project.kind },
        { label: '时长', value: project.duration },
        { label: '简介', value: project.brief.slice(0, 16) },
      ],
      body: project.brief,
    },
    {
      id: 'stage-character', index: '02', title: '角色 / 场景', kind: 'character', status: done(2),
      summary: '示例数据 · 未接入真实项目',
      fields: [
        { label: '角色数', value: String(project.doneStages >= 2 ? 3 : 0) },
        { label: '场景数', value: String(project.doneStages >= 2 ? 4 : 0) },
        { label: '一致性', value: project.doneStages >= 2 ? '已锁定' : '—' },
      ],
      images: project.doneStages >= 2 ? [media(0), media(1), media(2), media(3)] : undefined,
    },
    {
      id: 'stage-storyboard', index: '03', title: '分镜', kind: 'storyboard', status: done(3),
      summary: project.doneStages >= 3 ? `${shotCount} 个镜头 · 平均镜长 ${avg}` : '待生成',
      fields: [
        { label: '镜头数', value: String(project.doneStages >= 3 ? shotCount : 0) },
        { label: '总时长', value: project.doneStages >= 3 ? project.duration : '—' },
        { label: '转场', value: project.doneStages >= 3 ? '硬切 / 叠化' : '—' },
      ],
      images: project.doneStages >= 3 ? [media(4), media(5), media(6), media(7)] : undefined,
    },
    {
      id: 'stage-reference', index: '04', title: '参考图', kind: 'reference', status: done(4),
      summary: project.doneStages >= 4 ? `示例关键帧 · ${project.ratio}` : '待生成',
      fields: [
        { label: '张数', value: String(project.doneStages >= 4 ? 8 : 0) },
        { label: '分辨率', value: project.doneStages >= 4 ? '1024×1536' : '—' },
        { label: '一致性', value: project.doneStages >= 4 ? '通过' : '—' },
      ],
      images: project.doneStages >= 4 ? [media(8), media(9), media(10), media(11)] : undefined,
    },
    {
      id: 'stage-video', index: '05', title: '视频', kind: 'video', status: done(5),
      summary: project.doneStages >= 5 ? `${shotCount} 个片段 · ${project.ratio}` : '待生成',
      fields: [
        { label: '片段', value: String(project.doneStages >= 5 ? shotCount : 0) },
        { label: '已成片', value: project.doneStages >= 6 ? '是' : '部分' },
        { label: '比例', value: project.ratio },
      ],
      images: project.doneStages >= 5 ? [media(2), media(5), media(7)] : undefined,
      hasVideo: project.doneStages >= 5,
    },
    {
      id: 'stage-final', index: '06', title: '成片', kind: 'final', status: done(6),
      summary: project.doneStages >= 6 ? '已合成，可播放' : '等待视频阶段完成',
      fields: [
        { label: '时长', value: project.doneStages >= 6 ? project.duration : '—' },
        { label: '字幕', value: project.doneStages >= 6 ? '已生成' : '待生成' },
        { label: '输出', value: `${project.ratio} · 720P` },
      ],
      images: [project.cover || media(0)],
      hasVideo: project.doneStages >= 6,
    },
  ];

  const edges: CanvasEdge[] = [
    { id: 'e1', source: 'stage-script', target: 'stage-character', label: '拆解' },
    { id: 'e2', source: 'stage-character', target: 'stage-storyboard', label: '排版' },
    { id: 'e3', source: 'stage-storyboard', target: 'stage-reference', label: '出图' },
    { id: 'e4', source: 'stage-reference', target: 'stage-video', label: '生视频' },
    { id: 'e5', source: 'stage-video', target: 'stage-final', label: '合成' },
  ];

  return { nodes, edges };
}

/** 项目 id → 画布数据（开源作品 → 演示项目按自身数据 → 兜底）
 *  说明：真实后端会话不走这里，由页面内 buildSessionNodes 处理 */
export function resolveCanvas(projectId: string): {
  title: string;
  subtitle: string;
  nodes: StageNodeData[];
  edges: CanvasEdge[];
  openWork?: OpenWork;
} {
  const key = projectId.toLowerCase();
  const matched = ALL_OPEN_WORKS.find(w =>
    key.includes(w.id) || (key.includes('lantern') && w.id === 'last-lantern') || (key.includes('zack') && w.id === 'zack-swallow-gum') || (key.includes('seedance') && w.id.startsWith('seedance')),
  );
  if (matched) {
    const built = buildOpenWorkCanvas(matched);
    return {
      title: matched.title,
      subtitle: `${matched.titleEn} · ${matched.author} · 开源作品包`,
      nodes: built.nodes,
      edges: built.edges,
      openWork: matched,
    };
  }

  // 演示项目：按项目 id 找到它自己的元数据，画布节点由那份数据派生
  const demo = ALL_DEMO_PROJECTS.find(p => p.id === projectId);
  if (demo) {
    const built = buildDemoCanvas(demo);
    return {
      title: demo.title,
      subtitle: `${demo.kind} · ${demo.ratio} · 示例项目（未接入真实产出）`,
      nodes: built.nodes,
      edges: built.edges,
    };
  }

  return { title: '未找到项目', subtitle: '', nodes: [], edges: [] };
}

export { NODE_W, nodePosition };
export type { StageField, StageNodeData, StageStatus };
