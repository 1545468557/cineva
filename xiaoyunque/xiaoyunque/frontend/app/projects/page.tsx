'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Clock, FolderPlus, FolderOpen, LayoutGrid, Loader2, Play, Plus, RotateCcw, Search, Star,
  Trash2, UploadCloud, X,
} from 'lucide-react';
import { DEMO_PROJECTS, OPEN_PROJECTS, STAGE_ORDER, type DemoProject } from '@/config/projects';
import { deleteSession, deletePipelineTask, fetchPipelineTasks, fetchSessions } from '@/lib/workflowApi';
import { LS, useLocalStore } from '@/lib/localStore';
import './projects.css';

type TabKey = 'all' | 'script' | 'trash';

interface Item extends DemoProject {
  isDemo: boolean;
  stageHint?: string;
  /** 真实后端的会话 id（用于调删除接口） */
  sessionId?: string;
  /** 后端任务 id */
  taskId?: string;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'script', label: '剧本' },
  { key: 'trash', label: '回收站' },
];

/** 项目卡片 → 进项目工作区（画布视图），画布里可切回流程视图 */
function routeFor(id: string): string {
  return `/projects/${id}`;
}

const STAGE_KEYS = [
  'script_generation', 'character_design', 'storyboard',
  'reference_generation', 'video_generation', 'post_production',
];

interface FolderState {
  folders: { id: string; name: string }[];
  assign: Record<string, string>;
}

function coverForRatio(ratio: string): string {
  if (ratio.startsWith('9:16')) return '/cases/portrait/240.jpg';
  if (ratio.startsWith('1:1')) return '/cases/ecommerce/060.jpg';
  return '/cases/short-drama/067.jpg';
}

function relTime(input?: string | number): string {
  if (input === undefined || input === null) return '';
  const t = typeof input === 'number' ? input : Date.parse(input);
  if (!t || Number.isNaN(t)) return '';
  const mins = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [manage, setManage] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [folder, setFolder] = useState<'全部' | string>('全部');
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [real, setReal] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const { value: folderState, update: updateFolders } =
    useLocalStore<FolderState>(LS.projectFolders, { folders: [], assign: {} });
  const { value: trashLog, update: updateTrash } =
    useLocalStore<Record<string, { at: number; kind: 'demo' | 'session' | 'task' }>>(LS.projectTrash, {});

  /** 拉真实数据：六阶段会话 + 管线任务（跑过就有，没跑就是空） */
  const loadReal = useCallback(async () => {
    setLoading(true);
    setError('');
    const collected: Item[] = [];
    try {
      const sessions = await fetchSessions();
      sessions.forEach((s: any, i: number) => {
        const st = s.status && typeof s.status === 'object' ? s.status : {};
        const done = STAGE_KEYS.filter(k => st[k] && st[k] !== 'pending').length;
        const running = STAGE_KEYS.some(k => st[k] === 'running' || st[k] === 'waiting' || st[k] === 'waiting_user');
        const ratio = (s.meta && s.meta.video_ratio) || s.video_ratio || '16:9';
        const dateMs = typeof s.date === 'number' ? s.date * 1000
          : Date.parse(s.updated_at || s.updatedAt || s.created_at || '') || undefined;
        collected.push({
          id: String(s.id || s.session_id || `session-${i}`),
          title: s.title || s.idea || `未命名项目 ${i + 1}`,
          brief: s.idea || (s.meta && s.meta.user_textbox_input) || '六阶段项目',
          cover: s.cover || s.poster || coverForRatio(ratio),
          kind: '短剧',
          status: done === 6 ? '已完成' : running || done > 0 ? '进行中' : '草稿',
          updatedAt: relTime(dateMs),
          ratio,
          duration: s.duration || '—',
          doneStages: done,
          isDemo: false,
          stageHint: s.current_stage || '',
          sessionId: String(s.id || s.session_id || ''),
        });
      });
    } catch {
      /* 接口没数据或未启动，忽略 */
    }
    try {
      const tasks = await fetchPipelineTasks(60);
      tasks.forEach((t: any, i: number) => {
        const id = String(t.id || t.task_id || `task-${i}`);
        const kindRaw = String(t.pipeline || t.kind || t.type || 'standard');
        const kind = kindRaw.includes('digital') ? '口播' : kindRaw.includes('action') ? '动作' : '短剧';
        collected.push({
          id,
          title: t.name || (t.params && (t.params.prompt || t.params.idea)) || `任务 ${id.slice(0, 6)}`,
          brief: `管线任务 · ${kindRaw} · ${String(t.status || '')}`,
          cover: (t.cover as string) || '/cases/short-drama/009.jpg',
          kind,
          status: t.status === 'completed' ? '已完成' : t.status === 'running' ? '进行中' : '草稿',
          updatedAt: relTime(
            typeof t.created_at === 'number' ? t.created_at * 1000
              : Date.parse(t.updated_at || t.created_at || '') || undefined,
          ),
          ratio: (t.params && t.params.ratio) || '16:9',
          duration: '—',
          doneStages: t.status === 'completed' ? 6 : 2,
          isDemo: false,
          stageHint: String(t.status || ''),
          taskId: id,
        });
      });
    } catch {
      /* 同上 */
    }
    setReal(collected);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReal();
  }, [loadReal]);

  /** 删除：真实会话走 DELETE /api/sessions/{id}，任务走 DELETE /api/tasks/{id}，演示项目入本机回收站 */
  const remove = useCallback(async (item: Item) => {
    setError('');
    setNotice('');
    try {
      if (item.sessionId) {
        await deleteSession(item.sessionId);
      } else if (item.taskId) {
        await deletePipelineTask(item.taskId);
      } else {
        // 演示项目没有后端实体，只做本机隐藏（+ 回收站可还原）
        updateTrash(prev => ({ ...prev, [item.id]: { at: Date.now(), kind: 'demo' } }));
      }
      setReal(prev => prev.filter(p => p.id !== item.id));
      setNotice(`已删除「${item.title}」`);
    } catch (e: any) {
      setError(e?.message || '删除失败');
    }
  }, [updateTrash]);

  const restoreDemo = useCallback((id: string) => {
    updateTrash(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [updateTrash]);

  const createFolder = () => {
    const name = folderDraft.trim();
    if (!name) {
      setError('先给文件夹起个名字');
      return;
    }
    const id = `f${Date.now()}`;
    updateFolders(prev => ({ folders: [...prev.folders, { id, name }], assign: { ...prev.assign } }));
    setFolder(id);
    setFolderDraft('');
    setCreatingFolder(false);
    setNotice(`已创建文件夹「${name}」`);
  };

  const moveIntoFolder = (projectId: string, folderId: string | null) => {
    updateFolders(prev => {
      const assign = { ...prev.assign };
      if (folderId) assign[projectId] = folderId;
      else delete assign[projectId];
      return { folders: prev.folders, assign };
    });
  };

  const toggleStar = (id: string) => setStarred(prev => ({ ...prev, [id]: !prev[id] }));

  const demoVisible = useMemo(
    () => DEMO_PROJECTS.filter(p => !trashLog[p.id] && !OPEN_PROJECTS.some(o => o.id === p.id)),
    [trashLog],
  );
  const demoTrashed = useMemo(
    () => DEMO_PROJECTS.filter(p => trashLog[p.id]),
    [trashLog],
  );

  const items = useMemo(() => {
    let list: Item[] = [
      ...real.filter(p => !trashLog[p.id]),
      ...OPEN_PROJECTS.map(p => ({ ...p, isDemo: false })),
      ...demoVisible.map(p => ({ ...p, isDemo: true })),
    ];
    if (tab === 'script') list = list.filter(item => item.status !== '草稿');
    if (tab === 'trash') list = [];
    if (folder !== '全部') {
      const fid = folderState.assign;
      list = list.filter(item => fid[item.id] === folder);
    }
    if (starredOnly) list = list.filter(item => starred[item.id]);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(item =>
        item.title.toLowerCase().includes(q) || item.brief.toLowerCase().includes(q) || item.kind.includes(q),
      );
    }
    return list;
  }, [real, tab, query, starredOnly, starred, folder, folderState.assign, trashLog, demoVisible]);

  const trashCount = useMemo(() => {
    const demo = demoTrashed.length;
    const realDeleted = real.filter(p => trashLog[p.id]).length;
    return demo + realDeleted;
  }, [demoTrashed.length, real, trashLog]);

  const folderOf = (id: string) => folderState.folders.find(f => folderState.assign[id] === f.id)?.name || '未分组';

  return (
    <div className="xyq-projects">
      <div className="xyq-projects-inner">
        <header className="xyq-projects-head">
          <h1>我的项目</h1>
          <div className="xyq-projects-head-right">
            {loading && (
              <span className="xyq-projects-loading">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 读取中…
              </span>
            )}
            <button
              type="button"
              className={clsx('xyq-projects-action', manage && 'is-on')}
              onClick={() => setManage(m => !m)}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> {manage ? '完成' : '批量管理'}
            </button>
          </div>
        </header>

        <div className="xyq-projects-bar">
          <div className="xyq-projects-tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                className={clsx('xyq-projects-tab', tab === t.key && 'is-on')}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === 'trash' && trashCount > 0 && <em className="xyq-projects-badge">{trashCount}</em>}
              </button>
            ))}
          </div>

          <div className="xyq-projects-actions">
            {folderState.folders.length > 0 && (
              <label className="xyq-projects-folder-select">
                <FolderOpen className="w-3.5 h-3.5" />
                <select value={folder} onChange={e => setFolder(e.target.value)}>
                  <option value="全部">全部文件夹</option>
                  {folderState.folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="xyq-projects-action"
              onClick={() => setCreatingFolder(v => !v)}
              title="新建文件夹"
            >
              <FolderPlus className="w-3.5 h-3.5" /> 新建文件夹
            </button>
            <button
              type="button"
              className={clsx('xyq-projects-action is-icon', starredOnly && 'is-on')}
              onClick={() => setStarredOnly(s => !s)}
              title="只看收藏"
            >
              <Star className="w-3.5 h-3.5" />
            </button>
            <label className="xyq-projects-search">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索项目"
              />
              <Search className="w-3.5 h-3.5" />
            </label>
          </div>
        </div>

        {creatingFolder && (
          <div className="xyq-projects-newfolder">
            <input
              autoFocus
              value={folderDraft}
              maxLength={40}
              onChange={e => setFolderDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setCreatingFolder(false); }}
              placeholder="文件夹名称，例如：客户交付"
            />
            <button type="button" className="is-primary" onClick={createFolder}>创建</button>
            <button type="button" className="is-ghost" onClick={() => { setCreatingFolder(false); setFolderDraft(''); }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {(notice || error) && (
          <div className={clsx('xyq-projects-notice', error && 'is-error')}>
            {error || notice}
            <button type="button" onClick={() => { setError(''); setNotice(''); }} aria-label="关闭">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {tab === 'trash' ? (
          trashCount === 0 ? (
            <div className="xyq-projects-empty">
              <Trash2 className="w-8 h-8" strokeWidth={1.4} />
              <p>回收站是空的</p>
              <span>删除的演示项目会进这里，可随时恢复；真实项目删除后直接从后端移除</span>
            </div>
          ) : (
            <div className="xyq-projects-trashlist">
              {real.filter(p => trashLog[p.id]).map(p => (
                <div key={p.id} className="xyq-projects-trashrow">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="xyq-projects-trashtitle">{p.title}</span>
                  <span className="xyq-projects-trashtime">
                    {relTime(trashLog[p.id]?.at)} · 已在后端删除
                  </span>
                  <button type="button" onClick={() => restoreDemo(p.id)}>
                    <RotateCcw className="w-3 h-3" /> 从列表移除记录
                  </button>
                </div>
              ))}
              {demoTrashed.map(p => (
                <div key={p.id} className="xyq-projects-trashrow">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="xyq-projects-trashtitle">{p.title}</span>
                  <span className="xyq-projects-trashtime">{relTime(trashLog[p.id]?.at)}</span>
                  <button type="button" onClick={() => restoreDemo(p.id)}>
                    <RotateCcw className="w-3 h-3" /> 恢复
                  </button>
                </div>
              ))}
            </div>
          )
        ) : items.length === 0 ? (
          <div className="xyq-projects-empty">
            <Search className="w-8 h-8" strokeWidth={1.4} />
            <p>没有匹配的项目</p>
            <span>换个关键词或换个文件夹试试</span>
          </div>
        ) : (
          <div className="xyq-projects-grid">
            <button type="button" className="xyq-project-new" onClick={() => router.push('/')}>
              <Plus className="w-7 h-7" strokeWidth={1.6} />
              <span>新建项目</span>
            </button>

            {items.map(item => {
              const canDelete = Boolean(item.sessionId || item.taskId) || item.isDemo;
              return (
                <article key={item.id} className="xyq-project-card">
                  <button
                    type="button"
                    className="xyq-project-open"
                    onClick={() => router.push(routeFor(item.id))}
                    title={`进入工作台：${item.title}`}
                  >
                    <span className="xyq-project-cover" style={{ backgroundImage: `url(${item.cover})` }}>
                      <span className="xyq-project-kind">{item.kind}</span>
                      {item.badge === '开源' && <span className="xyq-project-open-badge">开源作品包</span>}
                      {item.isDemo && <span className="xyq-project-demo">示例</span>}
                      <span className="xyq-project-ratio">{item.ratio}</span>
                      <span className="xyq-project-hover">
                        <Play className="w-4 h-4" strokeWidth={2} /> {item.rich ? '看真实分镜' : '打开工作台'}
                      </span>
                    </span>
                  </button>

                  <div className="xyq-project-body">
                    <div className="xyq-project-title-row">
                      <h3>{item.title}</h3>
                      <button
                        type="button"
                        className={clsx('xyq-project-star', starred[item.id] && 'is-on')}
                        onClick={() => toggleStar(item.id)}
                        title={starred[item.id] ? '取消收藏' : '收藏'}
                        aria-pressed={Boolean(starred[item.id])}
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="xyq-project-brief">{item.brief}</p>

                    <div className="xyq-project-stages">
                      {STAGE_ORDER.map((st, idx) => (
                        <i
                          key={st.key}
                          className={clsx('xyq-project-dot', idx < item.doneStages && 'is-done')}
                          title={`${st.label}${idx < item.doneStages ? '：已完成' : '：未开始'}`}
                        />
                      ))}
                      <span className="xyq-project-stage-text">
                        {item.doneStages}/{STAGE_ORDER.length} 阶段
                      </span>
                    </div>

                    <div className="xyq-project-foot">
                      <span className={clsx('xyq-project-status', `s-${item.status}`)}>{item.status}</span>
                      <span className="xyq-project-folder">{folderOf(item.id)}</span>
                      <span className="xyq-project-time">
                        <Clock className="w-3 h-3" /> {item.updatedAt || '刚刚'}
                      </span>
                      {manage && canDelete && (
                        <button
                          type="button"
                          className="xyq-project-del"
                          onClick={() => void remove(item)}
                        >
                          <Trash2 className="w-3 h-3" /> 删除
                        </button>
                      )}
                    </div>

                    {folderState.folders.length > 0 && (
                      <label className="xyq-project-move">
                        <span>移动到</span>
                        <select
                          value={folderState.assign[item.id] ?? ''}
                          onChange={e => moveIntoFolder(item.id, e.target.value || null)}
                        >
                          <option value="">未分组</option>
                          {folderState.folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="xyq-projects-tip">
          <UploadCloud className="w-3.5 h-3.5" />
          真实项目来自本机流水线记录（跑过六阶段后自动出现在最前面）；删除真实项目会调用后端接口，示例项目删除后进本机回收站可恢复。
        </footer>
      </div>
    </div>
  );
}
