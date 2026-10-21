'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Background, BackgroundVariant, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider,
  type Edge, type Node, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft, Clapperboard, Film, Image as ImageIcon, Layers, Palette, Play, Plus, Send,
  Share2, Sparkles, SlidersHorizontal, UserRound,
} from 'lucide-react';
import { NODE_W, nodePosition, CANVAS_EDGES, type StageNodeData } from '@/config/projectCanvas';
import { resolveCanvas } from '@/config/canvasSource';
import { getProjectStatus } from '@/lib/workflowApi';
import './canvas.css';

type StageNode = Node<StageNodeData & Record<string, unknown>, 'stage'>;

const KIND_ICON: Record<string, typeof ImageIcon> = {
  script: Clapperboard,
  character: UserRound,
  storyboard: Layers,
  reference: ImageIcon,
  video: Film,
  final: Film,
};

const STAGE_TITLES: Record<string, { title: string; label: string }> = {
  script_generation: { title: '剧本', label: '剧本' },
  character_design: { title: '角色 / 场景', label: '角色' },
  storyboard: { title: '分镜', label: '分镜' },
  reference_generation: { title: '关键帧', label: '参考图' },
  video_generation: { title: '视频', label: '视频' },
  post_production: { title: '成片', label: '后期' },
};

const STAGE_ORDER = [
  'script_generation', 'character_design', 'storyboard',
  'reference_generation', 'video_generation', 'post_production',
];

const StageNodeView = memo(({ data, selected }: NodeProps<StageNode>) => {
  const d = data as unknown as StageNodeData;
  const Icon = KIND_ICON[d.kind] || ImageIcon;
  const tone = d.status === '已完成' ? 'done' : d.status === '进行中' ? 'running' : 'todo';
  const many = (d.images?.length || 0) > 4;

  return (
    <div className={clsx('cn-node', `is-${tone}`, selected && 'is-selected')} style={{ width: NODE_W }}>
      <Handle type="target" position={Position.Left} className="cn-handle" />

      <header className="cn-node-head">
        <span className="cn-node-icon"><Icon className="w-4 h-4" strokeWidth={1.7} /></span>
        <span className="cn-node-index">{d.index}</span>
        <h3>{d.title}</h3>
        <span className={clsx('cn-node-status', `s-${tone}`)}>{d.status}</span>
      </header>

      <p className="cn-node-summary">{d.summary}</p>

      {d.body && <div className="cn-node-body">{d.body}</div>}

      {d.images && d.images.length > 0 && (
        <div className={clsx('cn-node-media', many ? 'cols-3' : 'cols-2')}>
          {d.images.map((src, i) => (
            <span
              key={`${d.id}-img-${i}`}
              className="cn-node-thumb"
              style={{ backgroundImage: `url(${src})` }}
            >
              {d.hasVideo && i === 0 && (
                <span className="cn-node-play"><Play className="w-3.5 h-3.5" strokeWidth={2.2} /></span>
              )}
            </span>
          ))}
        </div>
      )}

      <dl className="cn-node-fields">
        {d.fields.map(f => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>

      <Handle type="source" position={Position.Right} className="cn-handle" />
    </div>
  );
});
StageNodeView.displayName = 'StageNodeView';

const nodeTypes = { stage: StageNodeView };

const TOOL_HINTS: Record<string, string> = {
  add: 'Cineva：已切到添加节点模式 —— 从右侧素材面板拖素材进来即可成节点',
  layers: '图层：此视图按六阶段聚合展示，逐卡微调请进「流程视图」',
  color: '调色：调色在「流程视图 → 后期剪辑」里做',
  select: '指针：拖动平移画布，滚轮缩放',
};

interface SessionGraph {
  status: Record<string, string>;
  artifacts: Record<string, any>;
  meta: Record<string, any>;
  currentStage: string;
}

/** 把真实后端 artifact 收敛成画布节点（没有数据的阶段以占位卡呈现） */
function buildSessionNodes(
  graph: SessionGraph,
  statusMap: Record<string, string>,
): { nodes: StageNodeData[]; edges: typeof CANVAS_EDGES; title: string } {
  const done = (stage: string) => ['completed', 'session_completed'].includes(String(statusMap[stage] || ''));
  const running = (stage: string) => String(statusMap[stage] || '') === 'running';
  const statusOf = (stage: string): StageNodeData['status'] =>
    done(stage) ? '已完成' : running(stage) ? '进行中' : '待开始';

  const chars = graph.artifacts.character_design?.characters || [];
  const sets = graph.artifacts.character_design?.settings || [];
  const scenes = graph.artifacts.storyboard?.scenes || graph.artifacts.storyboard?.shots || [];
  const shots = graph.artifacts.reference_generation?.scenes || [];
  const clips = graph.artifacts.video_generation?.clips || [];
  const finalVideos = graph.artifacts.post_production?.videos || [];

  const pickImages = (list: any[]) =>
    list.flatMap((item: any) => {
      if (!item) return [];
      if (typeof item === 'string') return [item];
      const versions = Array.isArray(item.versions) ? item.versions : [];
      const selected = item.selected ? [item.selected] : [];
      return [...selected, ...versions].filter((u: any) => typeof u === 'string').slice(0, 2);
    }).slice(0, 6);

  const nodes: StageNodeData[] = STAGE_ORDER.map((stage, i) => {
    const meta = STAGE_TITLES[stage] || { title: stage, label: stage };
    const common = {
      id: `stage-${stage}`,
      index: String(i + 1).padStart(2, '0'),
      title: meta.title,
      kind: (i === 0 ? 'script' : i === 1 ? 'character' : i === 2 ? 'storyboard' : i === 3 ? 'reference' : i === 4 ? 'video' : 'final') as StageNodeData['kind'],
      status: statusOf(stage),
    };

    if (stage === 'script_generation') {
      const ideas = graph.artifacts.script_generation?.ideas || [];
      return {
        ...common,
        summary: ideas.length ? `${ideas.length} 个故事构思` : '暂无剧本产物',
        body: (ideas[0]?.logline || graph.meta?.idea || '') as string,
        fields: [
          { label: '状态', value: statusOf(stage) },
          { label: '构思数', value: String(ideas.length) },
          { label: '集数', value: String(graph.meta?.episodes ?? '—') },
        ],
      };
    }
    if (stage === 'character_design') {
      return {
        ...common,
        summary: `${chars.length} 个角色 · ${sets.length} 个场景`,
        images: pickImages([...chars, ...sets]),
        fields: [
          { label: '角色数', value: String(chars.length) },
          { label: '场景数', value: String(sets.length) },
          { label: '一致性', value: chars.length ? '流程保证' : '—' },
        ],
      };
    }
    if (stage === 'storyboard') {
      return {
        ...common,
        summary: `${scenes.length} 个镜头`,
        images: pickImages(scenes),
        fields: [
          { label: '镜头数', value: String(scenes.length) },
          { label: '状态', value: statusOf(stage) },
        ],
      };
    }
    if (stage === 'reference_generation') {
      return {
        ...common,
        summary: `${shots.length} 个分镜片段`,
        images: pickImages(shots),
        fields: [{ label: '片段数', value: String(shots.length) }, { label: '状态', value: statusOf(stage) }],
      };
    }
    if (stage === 'video_generation') {
      return {
        ...common,
        summary: `${clips.length} 个视频片段`,
        images: pickImages(clips),
        hasVideo: clips.length > 0,
        fields: [
          { label: '片段数', value: String(clips.length) },
          { label: '已成片', value: clips.length ? '部分' : '否' },
        ],
      };
    }
    return {
      ...common,
      summary: finalVideos.length ? `${finalVideos.length} 个成片` : '等待视频阶段完成',
      images: pickImages(finalVideos),
      hasVideo: finalVideos.length > 0,
      fields: [
        { label: '成片数', value: String(finalVideos.length) },
        { label: '输出', value: graph.meta?.video_ratio || '—' },
      ],
    };
  });

  const edges = CANVAS_EDGES.map(e => ({ ...e }));
  return { nodes, edges, title: graph.meta?.idea || graph.meta?.user_textbox_input || '未命名项目' };
}

function CanvasInner({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [agentText, setAgentText] = useState('');
  const [agentLog, setAgentLog] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState('select');
  const [sessionGraph, setSessionGraph] = useState<SessionGraph | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [toast, setToast] = useState('');

  /** 项目数据：开源作品包 → 真实六阶段内容；否则用默认演示数据 */
  const resolved = useMemo(() => resolveCanvas(projectId), [projectId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** 真实会话（非开源作品包）→ 从后端拉状态与产物 */
  useEffect(() => {
    if (resolved.openWork) {
      setSessionGraph(null);
      setLoadingSession(false);
      setSessionError('');
      return;
    }
    // 只有看起来像会话 id（uuid4().hex = 32 位十六进制）的才去问后端，
    // 否则示例项目会白打一次必然 404 的接口。
    const looksLikeSession = /^[0-9a-f]{32}$/i.test(projectId);
    if (!looksLikeSession) {
      setSessionGraph(null);
      setLoadingSession(false);
      setSessionError('没有找到对应的后端会话（可能是示例项目或管线任务）');
      return;
    }
    let cancelled = false;
    setLoadingSession(true);
    setSessionError('');
    getProjectStatus(projectId)
      .then((snapshot: any) => {
        if (cancelled) return;
        setSessionGraph({
          status: snapshot.status || {},
          artifacts: snapshot.artifacts || {},
          meta: snapshot.meta || snapshot.params || {},
          currentStage: snapshot.current_stage || '',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSessionGraph(null);
        setSessionError('没有找到对应的后端会话（可能是示例项目或管线任务）');
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });
    return () => { cancelled = true; };
  }, [projectId, resolved.openWork]);

  const built = useMemo(
    () => (sessionGraph ? buildSessionNodes(sessionGraph, sessionGraph.status) : null),
    [sessionGraph],
  );

  /** 画布节点与连线：开源作品包 → 真实后端产物 → 演示项目自身数据 → 空态引导 */
  const { stageData, edgeDefs } = useMemo(() => {
    if (resolved.openWork) return { stageData: resolved.nodes, edgeDefs: resolved.edges };
    if (built?.nodes?.length) return { stageData: built.nodes, edgeDefs: built.edges };
    // 真实会话但还没跑出产物 → 空数组，交给空态引导
    if (built) return { stageData: [], edgeDefs: [] };
    // 演示项目：由 config/canvasSource 按项目自己的元数据派生，不再共用同一套数据
    return { stageData: resolved.nodes, edgeDefs: resolved.edges };
  }, [resolved.openWork, built]);

  const nodes = useMemo<StageNode[]>(
    () => stageData.map((stage, i) => ({
      id: stage.id,
      type: 'stage' as const,
      position: nodePosition(i),
      data: { ...stage },
      draggable: true,
    })),
    [stageData],
  );

  const edges = useMemo<Edge[]>(
    () => edgeDefs.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'smoothstep',
      animated: e.target === 'stage-video',
      style: { stroke: 'rgba(255,255,255,0.28)', strokeWidth: 1.4 },
      labelStyle: { fill: 'rgba(255,255,255,0.5)', fontSize: 11 },
      labelBgStyle: { fill: 'rgba(10,10,14,0.9)' },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
    })),
    [edgeDefs],
  );

  const projectTitle = resolved.openWork?.title || built?.title || resolved.title;

  const sendToAgent = useCallback(() => {
    const text = agentText.trim();
    if (!text) return;
    setAgentLog(prev => [
      `你：${text}`,
      resolved.openWork
        ? `Cineva：已记录你的修改意图，点「流程视图」在主流程里接着做`
        : `Cineva：已在当前项目记下这条修改，可在「流程视图 · ${sessionGraph?.currentStage || '当前阶段'}」执行`,
      ...prev,
    ].slice(0, 6));
    setAgentText('');
    setToast('已记录修改意图');
  }, [agentText, resolved.openWork, sessionGraph?.currentStage]);

  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setToast('项目链接已复制到剪贴板');
        return;
      }
      throw new Error('no clipboard');
    } catch {
      setToast(`项目链接：${url}`);
    }
  }, []);

  const publish = useCallback(() => {
    try {
      window.sessionStorage.setItem('cineva.showcase.prefill', JSON.stringify({
        title: projectTitle.slice(0, 20),
        desc: `来自项目 ${projectId.slice(0, 8)} 的作品`,
      }));
    } catch {
      /* 忽略 */
    }
    router.push('/showcase?publish=1');
  }, [projectTitle, projectId, router]);

  /** 流程视图：真实项目带上下文回主流程，而不是跳到无关的独立管线 */
  const goFlowView = useCallback(() => {
    if (sessionGraph && sessionGraph.currentStage) {
      router.push(`/?session=${encodeURIComponent(projectId)}&stage=${encodeURIComponent(sessionGraph.currentStage)}`);
      return;
    }
    router.push(`/?session=${encodeURIComponent(projectId)}`);
  }, [projectId, router, sessionGraph]);

  return (
    <div className="cn-shell">
      <header className="cn-topbar">
        <button type="button" className="cn-back" onClick={() => router.push('/projects')} title="返回我的项目">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="cn-brand">Cineva</span>
        <h1 className="cn-title">{projectTitle}</h1>
        {resolved.openWork ? (
          <span className="cn-project-sub" title={resolved.subtitle}>{resolved.subtitle}</span>
        ) : (
          <span className="cn-project-id" title={sessionError || ''}>
            {loadingSession ? '读取中…' : `${projectId.slice(0, 8)}${sessionGraph ? '' : ' · 无后端会话'}`}
          </span>
        )}

        <div className="cn-view-switch">
          <button type="button" className={clsx('cn-view-btn', 'is-on')}>
            画布视图
          </button>
          <button type="button" className="cn-view-btn" onClick={goFlowView}>
            流程视图
          </button>
        </div>

        <div className="cn-topbar-right">
          <button type="button" className="cn-ghost" title="复制项目链接" onClick={() => void share()}>
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" className="cn-publish" onClick={publish}>发布</button>
        </div>
      </header>

      <div className="cn-canvas-wrap">
        {resolved.openWork && (
          <div className="cn-open-bar">
            <span className="cn-open-tag">开源作品包</span>
            <span>{resolved.openWork.author} · {resolved.openWork.source}</span>
            <button
              type="button"
              className="cn-open-btn"
              onClick={() => {
                const work = resolved.openWork;
                if (!work) return;
                try {
                  window.sessionStorage.setItem('cineva.pendingSkill', JSON.stringify({
                    prompt: work.remakePrompt,
                    name: `拍同款 · ${work.title}`,
                  }));
                  // 全部角色设定图一起带过去：参考图模式按顺序使用多张
                  window.sessionStorage.setItem('cineva.remakeWork', JSON.stringify({
                    id: work.id,
                    title: work.title,
                    characters: work.characters,
                    styleLock: work.styleLock,
                    ratio: work.ratio,
                    remakePrompt: work.remakePrompt,
                  }));
                } catch {
                  /* 忽略 */
                }
                router.push('/?remake=' + encodeURIComponent(work.id));
              }}
            >
              <Sparkles className="w-3.5 h-3.5" /> 拍同款
            </button>
          </div>
        )}

        {stageData.length === 0 ? (
          <div className="cn-empty">
            <Sparkles className="cn-empty-icon" />
            <b>这个项目还没有产物</b>
            <span>去「流程视图」跑一遍六阶段，完成后这里会自动铺出各阶段节点。</span>
            <button type="button" className="cn-empty-cta" onClick={goFlowView}>进入流程视图</button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodeOrigin={[0, 0.5]}
            fitView
            fitViewOptions={{ padding: 0.14, maxZoom: 0.8 }}
            minZoom={0.2}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            className="cn-flow"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="rgba(255,255,255,0.10)" />
            <Controls className="cn-controls" showInteractive={false} position="bottom-right" />
            <MiniMap
              className="cn-minimap"
              position="top-right"
              pannable
              zoomable
              nodeColor={(n) => {
                const st = (n.data as unknown as StageNodeData | undefined)?.status;
                return st === '已完成' ? '#6fe0a1' : st === '进行中' ? '#9ab4ff' : 'rgba(255,255,255,0.35)';
              }}
              maskColor="rgba(6,6,9,0.72)"
            />
          </ReactFlow>
        )}

        {/* 左下：Cineva Agent 小面板 */}
        <div className="cn-agent">
          <div className="cn-agent-head">
            <span className="cn-agent-dot" />
            <b>Cineva Agent</b>
            <span className="cn-agent-hint">在当前项目上继续做</span>
          </div>
          {agentLog.length > 0 && (
            <div className="cn-agent-log">
              {agentLog.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}
          <div className="cn-agent-row">
            <input
              value={agentText}
              onChange={e => setAgentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendToAgent(); }}
              placeholder="描述修改，或把图片拖进来…"
            />
            <button type="button" onClick={sendToAgent} title="发送">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 右侧：工具条 */}
        <div className="cn-tools">
          <button
            type="button"
            className="cn-tool is-accent"
            title="添加节点"
            onClick={() => { setActiveTool('add'); setToast(TOOL_HINTS.add); }}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={clsx('cn-tool', activeTool === 'layers' && 'is-on')}
            title="图层"
            onClick={() => { setActiveTool('layers'); setToast(TOOL_HINTS.layers); }}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={clsx('cn-tool', activeTool === 'color' && 'is-on')}
            title="调色"
            onClick={() => { setActiveTool('color'); setToast(TOOL_HINTS.color); }}
          >
            <Palette className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={clsx('cn-tool', activeTool === 'select' && 'is-on')}
            title="指针"
            onClick={() => { setActiveTool('select'); setToast(TOOL_HINTS.select); }}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="cn-canvas-tip">
          <Sparkles className="w-3.5 h-3.5" />
          画布上是各阶段的结果：拖动节点可重排，点节点看详情，左下角可以直接改需求
        </div>
      </div>

      {toast && <div className="cn-toast">{toast}</div>}
    </div>
  );
}

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = String(params?.id ?? 'demo');
  return (
    <ReactFlowProvider>
      <CanvasInner projectId={projectId} />
    </ReactFlowProvider>
  );
}
