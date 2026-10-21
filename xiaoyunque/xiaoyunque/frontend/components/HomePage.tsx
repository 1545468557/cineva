'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Settings2, Clock, ArrowRight, CheckCircle, Trash2, Globe, ListOrdered, Loader2, Plus, Upload, Image as ImageIcon, Video, FileText, Music, X, Palette, Cpu, MonitorPlay, ChevronDown, Brain, Eye, Wand2, Clapperboard, RotateCcw, Sparkles, UserRound, Box, Shirt } from 'lucide-react';
import clsx from 'clsx';
import { SCENES, findScene, FEATURED_WORKS, type SceneSkill, type SceneSkillIcon } from '@/config/scenes';
import {
  STYLES,
  VIDEO_RATIOS,
  VIDEO_RESOLUTIONS,
  VIDEO_GENERATION_MODES,
  type ProviderGroup,
  type VideoGenerationMode,
} from '@/config/models';
import { STAGES } from './TopBar';
import SelectPanel, { OptionRow, SubSelect } from './ui/SelectPanel';
import { findSkill } from '@/lib/skills';
import { findOpenWork } from '@/config/openWorks';
import { fetchModelGroupsByType, fetchVideoModelGroupsByAbility } from '@/lib/modelRegistry';
import { takeRemakeHandoff, takeSkillHandoff, takeDraftHandoff, HANDOFF_EVENT } from '@/lib/handoff';

/* image / video / script / audio 是通用附件；first_frame / last_frame / reference_image 是视频关键帧槽位 */
export type AttachmentKind =
  | 'image'
  | 'video'
  | 'script'
  | 'audio'
  | 'first_frame'
  | 'last_frame'
  | 'reference_image';

export interface AttachmentPayload {
  kind: AttachmentKind;
  name: string;
  path: string;
  size?: number;
}

interface ComposerAttachment extends AttachmentPayload {
  id: string;
}

interface AttachmentOption {
  id: AttachmentKind;
  label: string;
  desc: string;
  accept: string;
  extensions: string[];
  upload: 'media' | 'file';
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  maxMB: number;
  maxSeconds?: number;
  maxChars?: number;
}

export interface ProjectParams {
  idea: string;
  file_path?: string; // 上传的剧本文件路径 (由后端返回的文件名)
  attachments?: AttachmentPayload[]; // 输入框中上传的图片 / 视频 / 剧本 / 音频
  style: string;
  video_ratio: string;
  video_resolution: string;
  llm_model: string;
  vlm_model: string;
  image_t2i_model: string;
  image_it2i_model: string;
  video_model: string;
  video_first_frame_model: string;
  video_start_end_model: string;
  video_reference_model: string;
  video_generation_mode: VideoGenerationMode;
  expand_idea?: boolean;
  enable_concurrency?: boolean;
  web_search?: boolean;
  episodes?: number;
}

interface HistoryItem {
  id: string;
  idea: string;
  style?: string;
  date: string;
  status: string;
  stages?: Record<string, string>;
}

interface HomePageProps {
  onStartProject: (params: ProjectParams, autoMode?: boolean) => void;
  onResumeProject: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  history: HistoryItem[];
}

const COMPOSER_PLACEHOLDER = '描述你的想法，输入一段故事、一个画面或一句灵感……';

const COMPOSER_HINTS = [
  COMPOSER_PLACEHOLDER,
  '午后阳光下，一只橘猫慢慢睁开眼',
  '雨夜伦敦，侦探追着远处的煤气灯',
  '水墨山水中，一叶扁舟穿过薄雾',
  '火星荒原上，宇航员留下第一串脚印',
  '竹林深处，两位剑客静静对峙',
  '霓虹街头，舞者在雨里轻轻转身',
];

function RotatingPromptHint({
  active,
  fieldRef,
  hints,
}: {
  active: boolean;
  fieldRef: React.RefObject<HTMLElement | null>;
  hints?: string[];
}) {
  const hintList = hints && hints.length ? hints : COMPOSER_HINTS;
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  // active 由轮询 effect 读取，用 ref 持有最新值而不触发额外渲染
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    if (!active) setLeaving(false);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let dwellTimer = 0;
    let fadeTimer = 0;
    let stopped = false;

    const interacting = () => {
      const field = fieldRef.current;
      if (!activeRef.current) return true;
      if (!field) return false;
      return field.matches(':hover') || field.contains(document.activeElement);
    };

    const clearTimers = () => {
      window.clearTimeout(dwellTimer);
      window.clearTimeout(fadeTimer);
    };

    const schedule = () => {
      clearTimers();
      dwellTimer = window.setTimeout(() => {
        if (stopped) return;
        if (interacting()) {
          setLeaving(false);
          schedule();
          return;
        }
        setLeaving(true);
        fadeTimer = window.setTimeout(() => {
          if (stopped) return;
          if (interacting()) {
            setLeaving(false);
            schedule();
            return;
          }
          setIndex(current => (current + 1) % hintList.length);
          setLeaving(false);
          schedule();
        }, 280);
      }, 3200);
    };

    schedule();
    return () => {
      stopped = true;
      clearTimers();
    };
  }, [active, fieldRef, hintList]);

  return (
    <div className={clsx('xyq-rotating-hint', leaving && 'is-leaving')} aria-hidden="true">
      <span key={index}>{hintList[index % hintList.length]}</span>
    </div>
  );
}

/* ─── 场景技能卡的图标映射 ─── */
const SCENE_SKILL_ICONS: Record<SceneSkillIcon, typeof ImageIcon> = {
  story: Clapperboard,
  character: UserRound,
  scene: ImageIcon,
  prop: Box,
  product: Shirt,
  music: Music,
  video: Video,
  text: FileText,
  avatar: UserRound,
  motion: Video,
  clapper: Clapperboard,
  image: ImageIcon,
  sparkles: Sparkles,
};

const INSPIRATION_IMAGES = [
  '/ui/inspiration-space.png',
  '/ui/inspiration-ink.png',
  '/ui/inspiration-detective.png',
  '/ui/inspiration-cat.png',
  '/ui/inspiration-mars.png',
  '/ui/inspiration-wuxia.png',
];

/* ─── 生成配置下拉选单：风格 / 视频方式说明与比例缩略 ─── */
const STYLE_META: Record<string, { description: string; badge?: string; badgeTone?: 'new' | 'best' | 'hot' }> = {
  'comic-book': { description: '美漫分镜线条，硬朗高对比' },
  anime: { description: '日式赛璐璐上色，角色感强', badge: '热门', badgeTone: 'hot' },
  realistic: { description: '电影级写实质感，通用首选', badge: '推荐', badgeTone: 'best' },
  '3d-disney': { description: '三维卡通渲染，明亮讨喜' },
  watercolor: { description: '水彩晕染，柔和留白' },
  'oil-painting': { description: '油画厚涂，笔触明显' },
  cyberpunk: { description: '霓虹科幻，暗调高饱和', badge: 'New', badgeTone: 'new' },
  'chinese-ink': { description: '水墨淡彩，写意留白', badge: '国风', badgeTone: 'new' },
};

const VIDEO_MODE_META: Record<string, { description: string; badge?: string; badgeTone?: 'new' | 'best' | 'hot' }> = {
  first_frame: { description: '给一张首帧图，向后生成一段视频', badge: '默认', badgeTone: 'best' },
  start_end_frame: { description: '给首尾两张图，中间运动自然衔接' },
  reference: { description: '用参考图锁定角色与风格一致性', badge: 'New', badgeTone: 'new' },
};

/* ─── 视频关键帧槽位：跟随「视频生成方式」变化 ─── */
export interface VideoSlot {
  key: AttachmentKind;
  label: string;
  hint: string;
  /** 该槽位是否支持多张（参考图：后端 reference_image_paths 就是 list） */
  multiple?: boolean;
}

const VIDEO_SLOTS: Record<VideoGenerationMode, VideoSlot[]> = {
  first_frame: [
    { key: 'first_frame', label: '首帧图', hint: '视频从这里开始的第一帧画面' },
  ],
  start_end_frame: [
    { key: 'first_frame', label: '首帧', hint: '视频开始的第一帧画面' },
    { key: 'last_frame', label: '尾帧', hint: '视频结束的最后一帧画面' },
  ],
  reference: [
    { key: 'reference_image', label: '参考图', hint: '锁定角色与画面风格，全片保持一致', multiple: true },
  ],
};

/** 单张槽位（首帧 / 尾帧） */
export function isMultiSlot(slot: VideoSlot | undefined): boolean {
  return Boolean(slot?.multiple);
}

/* ─── 封面：每个场景 tab 一张，见 config/scenes.ts 的 cover 字段 ───
   视频文件放在 public/ui/hero/ 下，改 scenes.ts 即可换封面，不需要动组件 */
const HERO_COVER_FALLBACK_POSTER = '/ui/hero/cover-poster.jpg';

const RATIO_SIZE: Record<string, [number, number]> = {
  '16:9': [34, 19],
  '9:16': [17, 30],
  '1:1': [24, 24],
  '4:3': [30, 22],
  '3:4': [22, 30],
  '21:9': [38, 16],
};

function modelLabelFrom(providers: ProviderGroup[], id: string): string {
  for (const group of providers) {
    const hit = group.models.find(model => model.id === id);
    if (hit) return hit.label;
  }
  return id || '未选择';
}

/* 输入框附件类型：与后端 /api/upload_media、/api/upload_file 的能力保持一致 */
const ATTACHMENT_OPTIONS: AttachmentOption[] = [
  {
    id: 'image',
    label: '图片',
    desc: 'jpeg, jpg, png',
    accept: '.jpg,.jpeg,.png',
    extensions: ['.jpg', '.jpeg', '.png'],
    upload: 'media',
    icon: ImageIcon,
    maxMB: 20,
  },
  {
    id: 'video',
    label: '视频',
    desc: 'mp4, mov，最长 60 秒',
    accept: '.mp4,.mov',
    extensions: ['.mp4', '.mov'],
    upload: 'media',
    icon: Video,
    maxMB: 200,
    maxSeconds: 60,
  },
  {
    id: 'script',
    label: '剧本',
    desc: 'txt, doc, pdf, md，最多 50000 字',
    accept: '.txt,.doc,.docx,.pdf,.md',
    extensions: ['.txt', '.doc', '.docx', '.pdf', '.md'],
    upload: 'file',
    icon: FileText,
    maxMB: 20,
    maxChars: 50000,
  },
  {
    id: 'audio',
    label: '音频',
    desc: 'mp3, wav，最长 15 秒',
    accept: '.mp3,.wav',
    extensions: ['.mp3', '.wav'],
    upload: 'media',
    icon: Music,
    maxMB: 50,
    maxSeconds: 15,
  },
];

function attachmentOption(kind: AttachmentKind): AttachmentOption {
  return ATTACHMENT_OPTIONS.find(item => item.id === kind) || ATTACHMENT_OPTIONS[0];
}

function fileExtension(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* 附件 / 附件 id 生成器：独立成函数，避免在渲染路径里调用 Date.now / Math.random */
let attachmentSeq = 0;
function nextAttachmentId(prefix: string): string {
  attachmentSeq += 1;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}-${attachmentSeq}`;
  }
  return `${prefix}-${attachmentSeq}-${(attachmentSeq * 2654435761 % 100000).toString(36)}`;
}

/* 浏览器原生解码媒体元数据，用于校验视频 / 音频时长 */
function readMediaDuration(file: File, kind: 'video' | 'audio'): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = document.createElement(kind);
    let settled = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      element.removeAttribute('src');
    };
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      if (settled) return;
      settled = true;
      const duration = element.duration;
      cleanup();
      if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error('无法读取媒体时长'));
    };
    element.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('无法读取媒体时长'));
    };
    element.src = url;
  });
}

/* 根据 status 映射生成进度文本 */
function stageProgressLabel(statusMap?: Record<string, string>): { text: string; color: string } {
  const map = statusMap || {};
  const completed = Object.keys(map).filter(k => ["completed", "session_completed"].includes(map[k]));
  if (completed.length === 0) return { text: '未开始', color: 'text-gray-400' };
  if (completed.length >= STAGES.length) return { text: '已完成', color: 'text-green-600' };
  
  // 对比 STAGES 获取最后一个已完成的
  const lastStageId = STAGES.filter(s => completed.includes(s.id)).pop()?.id || completed[completed.length - 1];
  const stageDef = STAGES.find(s => s.id === lastStageId);
  const name = stageDef?.shortName || lastStageId;
  return { text: `已完成：${name} (${completed.length}/${STAGES.length})`, color: 'text-blue-600' };
}

export default function HomePage({ onStartProject, onResumeProject, onDeleteSession, history }: HomePageProps) {
  const [idea, setIdea] = useState('');
  /**
   * 跳转带来的待应用数据（技能 / 拍同款 / 输入坞草稿）。
   * 必须等默认配置加载完再套用，否则会被 /api/config 的默认值覆盖。
   */
  const pendingHandoffRef = useRef<{
    prompt?: string;
    name?: string;
    source?: string;
    ratio?: string;
    style?: string;
    videoMode?: 'first_frame' | 'start_end_frame' | 'reference';
    remake?: {
      id: string;
      title: string;
      characters?: { name: string; image: string; desc?: string }[];
      styleLock?: string;
      ratio?: string;
      remakePrompt?: string;
    };
  } | null>(null);
  /** 当前场景：切换后 Agent 名 / 提示 / 技能卡 / 案例一起换 */
  const [sceneId, setSceneId] = useState<string>(SCENES[0].id);
  const scene = findScene(sceneId);
  const [showSettings, setShowSettings] = useState(false);
  const [configTab, setConfigTab] = useState<'visual' | 'models' | 'output'>('visual');
  const [expandedModelGroup, setExpandedModelGroup] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedLLM, setSelectedLLM] = useState('');
  const [selectedVLM, setSelectedVLM] = useState('');
  const [selectedT2I, setSelectedT2I] = useState('');
  const [selectedI2I, setSelectedI2I] = useState('');
  const [selectedFirstFrameVideo, setSelectedFirstFrameVideo] = useState('');
  const [selectedStartEndVideo, setSelectedStartEndVideo] = useState('');
  const [selectedReferenceVideo, setSelectedReferenceVideo] = useState('');
  const [selectedVideoMode, setSelectedVideoMode] = useState<VideoGenerationMode>('first_frame');
  const [selectedRatio, setSelectedRatio] = useState('');
  const [selectedResolution, setSelectedResolution] = useState('720P');
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [enableConcurrency, setEnableConcurrency] = useState(true);
  const [webSearch, setWebSearch] = useState(false);
  const [episodes, setEpisodes] = useState(4);
  const [showEpisodesPanel, setShowEpisodesPanel] = useState(false);
  const [hintHovered, setHintHovered] = useState(false);
  const [hintFocused, setHintFocused] = useState(false);
  const promptFieldRef = useRef<HTMLDivElement>(null);

  // 上传相关状态（输入框左上角的 “+” 号附件面板）
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKindRef = useRef<AttachmentOption | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLabel, setUploadingLabel] = useState('');
  /** 正在上传的槽位 key：渲染期需要用（显示 loading），不能放进 ref */
  const [uploadingSlotKey, setUploadingSlotKey] = useState<string | null>(null);
  const [attachNotice, setAttachNotice] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [slotUploads, setSlotUploads] = useState<Record<string, { name: string; path: string; size: number; url: string }[]>>({});
  const pendingSlotRef = useRef<VideoSlot | null>(null);
  const activeSlots = VIDEO_SLOTS[selectedVideoMode] || VIDEO_SLOTS.first_frame;
  const scriptAttachment = attachments.find(item => item.kind === 'script');
  // 槽位里的关键帧已用缩略图展示，不再重复出现在附件胶囊里
  const looseAttachments = attachments.filter(item => !activeSlots.some(slot => slot.key === item.kind));

  // 管理模式状态
  const [manageMode, setManageMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [llmProviders, setLlmProviders] = useState<ProviderGroup[]>([]);
  const [vlmProviders, setVlmProviders] = useState<ProviderGroup[]>([]);
  const [t2iProviders, setT2iProviders] = useState<ProviderGroup[]>([]);
  const [i2iProviders, setI2iProviders] = useState<ProviderGroup[]>([]);
  const [firstFrameVideoProviders, setFirstFrameVideoProviders] = useState<ProviderGroup[]>([]);
  const [startEndVideoProviders, setStartEndVideoProviders] = useState<ProviderGroup[]>([]);
  const [referenceVideoProviders, setReferenceVideoProviders] = useState<ProviderGroup[]>([]);
  const activeVideoModel =
    selectedVideoMode === 'start_end_frame'
      ? selectedStartEndVideo
      : selectedVideoMode === 'reference'
        ? selectedReferenceVideo
        : selectedFirstFrameVideo;
  const modelConfigReady = Boolean(selectedLLM && selectedVLM && selectedT2I && selectedI2I && activeVideoModel && selectedRatio && selectedResolution);
  const canStart = Boolean((idea.trim() || attachments.length > 0) && modelConfigReady && !configLoading);

  /* ── 下拉选单数据 ── */
  const modelGroups = [
    { key: 'llm', title: 'LLM 剧本模型', description: '剧本 / 分镜等文本创作', icon: Brain, value: selectedLLM, providers: llmProviders, onChange: setSelectedLLM },
    { key: 'vlm', title: 'VLM 视觉评估', description: '画面质量评估与筛选', icon: Eye, value: selectedVLM, providers: vlmProviders, onChange: setSelectedVLM },
    { key: 't2i', title: '文生图模型', description: '关键帧与首帧出图', icon: ImageIcon, value: selectedT2I, providers: t2iProviders, onChange: setSelectedT2I },
    { key: 'i2i', title: '图生图模型', description: '风格统一与局部重绘', icon: Wand2, value: selectedI2I, providers: i2iProviders, onChange: setSelectedI2I },
  ];
  const styleLabel = STYLES.find(s => s.id === selectedStyle)?.label || selectedStyle;
  const styleShort = styleLabel.includes(' / ') ? styleLabel.split(' / ')[1] : styleLabel;
  const configSummary = `${styleShort} · ${selectedRatio} · ${selectedResolution}`;
  const configBadge = `${styleShort} · ${selectedRatio}`;

  const restoreDefaultConfig = async () => {
    try {
      const resp = await fetch('/api/config');
      if (!resp.ok) throw new Error('读取默认配置失败');
      const data = await resp.json();
      const models = data.config?.models || {};
      const generation = data.config?.generation || {};
      const firstFrameModel = models.video_first_frame || models.video;
      setSelectedStyle(generation.style || 'realistic');
      setSelectedLLM(models.llm || '');
      setSelectedVLM(models.vlm || '');
      setSelectedT2I(models.image_t2i || '');
      setSelectedI2I(models.image_it2i || '');
      setSelectedFirstFrameVideo(firstFrameModel || '');
      setSelectedStartEndVideo(models.video_start_end || firstFrameModel || '');
      setSelectedReferenceVideo(models.video_reference || '');
      setSelectedVideoMode((generation.video_generation_mode || 'first_frame') as VideoGenerationMode);
      setSelectedRatio(generation.video_ratio || '16:9');
      setSelectedResolution(generation.video_resolution || '720P');
    } catch (e: any) {
      setConfigError(e?.message || '恢复默认配置失败');
    }
  };

  /**
   * 应用一次跳转带来的内容。默认配置加载完成后调用；
   * 若此刻默认配置还没回来（后端慢 / 未启动），先存 ref 等它回来再套。
   */
  const configLoadedRef = useRef(false);
  const applyPendingHandoff = useCallback(() => {
    const pending = pendingHandoffRef.current;
    if (!pending) return;
    pendingHandoffRef.current = null;

    if (pending.prompt) setIdea(pending.prompt);

    if (pending.remake) {
      const work = pending.remake;
      setSelectedVideoMode('reference');
      setSelectedRatio(work.ratio && String(work.ratio).includes('9:16') ? '9:16' : '16:9');
      const chars = Array.isArray(work.characters) ? work.characters.filter(c => c && c.image) : [];
      if (chars.length) {
        // 把作品里所有角色设定图全部带进参考图槽位（后端 reference_image_paths 支持多张）
        setSlotUploads(prev => ({
          ...prev,
          reference_image: chars.map(c => ({
            name: `${c.name || '角色'}.jpg`,
            path: c.image,
            size: 0,
            url: c.image,
          })),
        }));
        setAttachments(prev => [
          ...prev.filter(item => item.kind !== 'reference_image'),
          ...chars.map((c, i) => ({
            id: `slot-reference_image-${i}`,
            kind: 'reference_image' as AttachmentKind,
            name: `${c.name || '角色'}.jpg`,
            path: c.image,
            size: 0,
          })),
        ]);
        setAttachNotice({
          type: 'info',
          text: `拍同款：已带入「${work.title || '开源作品'}」的 ${chars.length} 张角色设定图与完整提示词，可继续增删参考图`,
        });
        return;
      }
      setAttachNotice({
        type: 'info',
        text: `拍同款：已带入「${work.title || '开源作品'}」的提示词（参考图模式），改几个字就能出片`,
      });
      return;
    }

    if (pending.ratio) setSelectedRatio(pending.ratio);
    if (pending.style) setSelectedStyle(pending.style);
    if (pending.videoMode) setSelectedVideoMode(pending.videoMode);
    if (pending.name) {
      setAttachNotice({
        type: 'info',
        text: pending.source === 'remake'
          ? `已带入「${pending.name}」`
          : `已套用「${pending.name}」，可以直接点「一键生成」`,
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchModelGroupsByType('llm')
      .then(groups => { if (!cancelled) setLlmProviders(groups); })
      .catch(() => {});
    fetchModelGroupsByType('vlm')
      .then(groups => { if (!cancelled) setVlmProviders(groups); })
      .catch(() => {});
    fetchModelGroupsByType('t2i')
      .then(groups => { if (!cancelled) setT2iProviders(groups); })
      .catch(() => {});
    fetchModelGroupsByType('i2i')
      .then(groups => { if (!cancelled) setI2iProviders(groups); })
      .catch(() => {});
    fetchVideoModelGroupsByAbility('first_frame_i2v')
      .then(groups => { if (!cancelled) setFirstFrameVideoProviders(groups); })
      .catch(() => {});
    fetchVideoModelGroupsByAbility('start_end_frame_i2v')
      .then(groups => { if (!cancelled) setStartEndVideoProviders(groups); })
      .catch(() => {});
    fetchVideoModelGroupsByAbility('reference_to_video')
      .then(groups => { if (!cancelled) setReferenceVideoProviders(groups); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadDefaultConfig = async () => {
      setConfigLoading(true);
      setConfigError('');
      try {
        const resp = await fetch('/api/config');
        if (!resp.ok) throw new Error('读取默认模型配置失败');
        const data = await resp.json();
        const models = data.config?.models || {};
        const generation = data.config?.generation || {};
        // Legacy config compatibility: older config.yaml only has models.video, so treat it as first-frame video.
        const firstFrameModel = models.video_first_frame || models.video;
        const startEndModel = models.video_start_end || 'wan2.7-i2v';
        const referenceModel = models.video_reference || 'wan2.7-r2v';
        const videoMode = (generation.video_generation_mode || 'first_frame') as VideoGenerationMode;
        const selectedModel = videoMode === 'start_end_frame' ? startEndModel : videoMode === 'reference' ? referenceModel : firstFrameModel;
        if (!models.llm || !models.vlm || !models.image_t2i || !models.image_it2i || !selectedModel) {
          throw new Error('backend/config.yaml 缺少主流程默认模型');
        }
        if (cancelled) return;
        setSelectedStyle(generation.style || 'realistic');
        setSelectedLLM(models.llm);
        setSelectedVLM(models.vlm);
        setSelectedT2I(models.image_t2i);
        setSelectedI2I(models.image_it2i);
        setSelectedVideoMode(videoMode);
        setSelectedFirstFrameVideo(firstFrameModel);
        setSelectedStartEndVideo(startEndModel);
        setSelectedReferenceVideo(referenceModel);
        setSelectedRatio(generation.video_ratio || '16:9');
        setSelectedResolution(generation.video_resolution || '720P');
      } catch (e: any) {
        if (!cancelled) setConfigError(e.message || '读取默认模型配置失败');
      } finally {
        if (!cancelled) setConfigLoading(false);
      }

      // 默认配置加载完之后，再应用跳转带来的技能 / 拍同款 / 草稿
      // （否则 init 出来的默认 style / ratio / videoMode 会把跳转参数覆盖掉）
      if (!cancelled) {
        configLoadedRef.current = true;
        applyPendingHandoff();
      }
    };
    loadDefaultConfig();
    return () => { cancelled = true; };
  }, [applyPendingHandoff]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await onDeleteSession(deleteTarget);
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const activeVideoProviders =
    selectedVideoMode === 'start_end_frame'
      ? startEndVideoProviders
      : selectedVideoMode === 'reference'
        ? referenceVideoProviders
        : firstFrameVideoProviders;

  const setActiveVideoModel = (value: string) => {
    if (selectedVideoMode === 'start_end_frame') {
      setSelectedStartEndVideo(value);
    } else if (selectedVideoMode === 'reference') {
      setSelectedReferenceVideo(value);
    } else {
      setSelectedFirstFrameVideo(value);
    }
  };

  const selectedVideoModeLabel = VIDEO_GENERATION_MODES.find(item => item.id === selectedVideoMode)?.label || '首帧生视频';

  const handleStart = (auto?: boolean) => {
    if (!canStart) return;
    onStartProject({
      idea,
      file_path: scriptAttachment?.path, // 剧本文件交给后端提取文本并拼进 idea
      attachments: attachments.map(({ kind, name, path, size }) => ({ kind, name, path, size })),
      style: selectedStyle,
      video_ratio: selectedRatio,
      video_resolution: selectedResolution,
      llm_model: selectedLLM,
      vlm_model: selectedVLM,
      image_t2i_model: selectedT2I,
      image_it2i_model: selectedI2I,
      video_generation_mode: selectedVideoMode,
      video_first_frame_model: selectedFirstFrameVideo,
      video_start_end_model: selectedStartEndVideo,
      video_reference_model: selectedReferenceVideo,
      video_model: activeVideoModel,
      enable_concurrency: enableConcurrency,
      web_search: webSearch,
      episodes,
    }, auto);
  };

  const handleExampleClick = (text: string) => {
    setIdea(text);
  };

  /** 切场景：Agent 名/提示/技能卡/案例换掉，同时把该场景的默认生成配置也应用上 */
  const applyScene = (id: string) => {
    const next = findScene(id);
    setSceneId(id);
    const cfg = next.config || {};
    if (cfg.style) setSelectedStyle(cfg.style);
    if (cfg.ratio !== undefined) setSelectedRatio(cfg.ratio);
    if (cfg.videoMode) setSelectedVideoMode(cfg.videoMode);
    if (cfg.resolution) setSelectedResolution(cfg.resolution);
    if (cfg.episodes) setEpisodes(cfg.episodes);
    setShowSettings(false);
    setShowEpisodesPanel(false);
  };

  /** 点技能卡：填入提示词 + 应用该技能自带的参数（优先于场景默认值） */
  const applySceneSkill = (skill: SceneSkill) => {
    setIdea(skill.prompt);
    if (skill.ratio) setSelectedRatio(skill.ratio);
    if (skill.style) setSelectedStyle(skill.style);
    if (skill.videoMode) setSelectedVideoMode(skill.videoMode);
    setAttachNotice({
      type: 'info',
      text: `已套用「${skill.label}」，可以直接点「一键生成」`,
    });
  };

  /** 清掉 URL 上的跳转参数，避免后退 / 刷新时重复触发 */
  const stripHandoffQuery = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const keys = ['skill', 'remake', 'text', 'ratio', 'style', 'videoMode'];
    let dirty = false;
    keys.forEach(key => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        dirty = true;
      }
    });
    if (!dirty) return;
    const qs = url.searchParams.toString();
    window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`);
  }, []);

  /**
   * 收一次跳转：handoff（跨页即时）→ URL query（可分享 / 可后退重放）。
   * URL 作为兜底：即使 sessionStorage 被清掉，链接仍然能恢复出技能与参数。
   */
  const consumeHandoff = useCallback(() => {
    let payload: NonNullable<typeof pendingHandoffRef.current> | null = null;

    const remakeHandoff = takeRemakeHandoff();
    const skillHandoff = takeSkillHandoff();
    const draftHandoff = takeDraftHandoff();

    if (remakeHandoff) {
      payload = {
        prompt: remakeHandoff.remakePrompt,
        name: remakeHandoff.title,
        source: 'remake',
        remake: {
          id: remakeHandoff.id,
          title: remakeHandoff.title,
          characters: remakeHandoff.characters,
          styleLock: remakeHandoff.styleLock,
          ratio: remakeHandoff.ratio,
          remakePrompt: remakeHandoff.remakePrompt,
        },
      };
    } else if (skillHandoff) {
      payload = {
        prompt: skillHandoff.prompt,
        name: skillHandoff.name,
        ratio: skillHandoff.ratio,
        style: skillHandoff.style,
        videoMode: skillHandoff.videoMode,
      };
    } else if (draftHandoff) {
      payload = { prompt: draftHandoff.text };
    } else {
      // handoff 为空 → 才看 URL，避免覆盖更新的内容
      const url = new URL(window.location.href);
      const skillParam = url.searchParams.get('skill');
      const remakeParam = url.searchParams.get('remake');
      const textParam = url.searchParams.get('text');

      if (remakeParam) {
        const work = findOpenWork(remakeParam);
        if (work) {
          payload = {
            prompt: work.remakePrompt,
            name: work.title,
            source: 'remake',
            remake: {
              id: work.id,
              title: work.title,
              characters: work.characters,
              styleLock: work.styleLock,
              ratio: work.ratio,
              remakePrompt: work.remakePrompt,
            },
          };
        }
      } else if (skillParam) {
        const skill = findSkill(skillParam);
        if (skill) {
          payload = {
            prompt: skill.prompt,
            name: skill.name,
            ratio: skill.ratio,
            style: skill.style,
            videoMode: skill.videoMode,
          };
        }
      } else if (textParam) {
        const mode = url.searchParams.get('videoMode');
        payload = {
          prompt: textParam,
          ratio: url.searchParams.get('ratio') || undefined,
          style: url.searchParams.get('style') || undefined,
          videoMode: mode === 'start_end_frame' || mode === 'reference' || mode === 'first_frame' ? mode : undefined,
        };
      }
    }

    if (!payload) return;
    pendingHandoffRef.current = payload;
    stripHandoffQuery();
    if (configLoadedRef.current) applyPendingHandoff();
  }, [applyPendingHandoff, stripHandoffQuery]);

  useEffect(() => {
    consumeHandoff();
    // 同页收到新的跳转（别处回到首页但没重新挂载）也能立即生效
    window.addEventListener(HANDOFF_EVENT, consumeHandoff);
    return () => window.removeEventListener(HANDOFF_EVENT, consumeHandoff);
  }, [consumeHandoff]);

  const handleAttachmentPick = (option: AttachmentOption) => {
    setAttachMenuOpen(false);
    setAttachNotice(null);
    pendingKindRef.current = option;
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = option.accept;
    input.value = '';
    input.click();
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(item => item.id !== id));
    setAttachNotice(null);
  };

  /* 校验 + 上传单个文件，返回后端给的文件信息 */
  const validateAndUploadAttachment = async (
    option: AttachmentOption,
    file: File,
  ): Promise<{ name: string; path: string; size: number }> => {
    const extension = fileExtension(file.name);
    if (!option.extensions.includes(extension)) {
      throw new Error(`${option.label}格式不支持，请选择 ${option.desc.split('，')[0]} 文件`);
    }
    if (file.size > option.maxMB * 1024 * 1024) {
      throw new Error(`${option.label}大小不能超过 ${option.maxMB} MB`);
    }
    // 视频 / 音频：先本地校验时长，避免把超长素材传给后端
    if (option.maxSeconds) {
      const duration = await readMediaDuration(file, option.id === 'video' ? 'video' : 'audio');
      if (duration > option.maxSeconds + 0.5) {
        throw new Error(`${option.label}时长不能超过 ${option.maxSeconds} 秒（当前约 ${Math.round(duration)} 秒）`);
      }
    }
    // 剧本：纯文本可本地数字数，doc/pdf 交由后端解析
    if (option.maxChars && (extension === '.txt' || extension === '.md')) {
      const text = await file.text();
      if (text.length > option.maxChars) {
        throw new Error(`剧本最多 ${option.maxChars} 字（当前 ${text.length} 字）`);
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    const endpoint = option.upload === 'file' ? '/api/upload_file' : '/api/upload_media';
    const response = await fetch(endpoint, { method: 'POST', body: formData });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(typeof payload?.detail === 'string' ? payload.detail : `${option.label}上传失败`);
    }
    const data = await response.json();
    if (!data.file_path) throw new Error(`${option.label}上传失败`);
    return { name: data.filename || file.name, path: data.file_path, size: file.size };
  };

  /* 关键帧槽位：首帧 / 尾帧 / 参考图，点框直接选图片
     参考图是多图槽位：input 打开后允许一次选多张，逐张上传 */
  const pickSlotImage = (slot: VideoSlot) => {
    setAttachMenuOpen(false);
    setAttachNotice(null);
    const imageOption = attachmentOption('image');
    pendingSlotRef.current = slot;
    pendingKindRef.current = imageOption;
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = imageOption.accept;
    input.value = '';
    input.multiple = Boolean(slot.multiple);
    input.click();
  };

  /** 移除槽位里的一张图；不传 index 表示清空整个槽位 */
  const clearSlot = (slotKey: string, index?: number) => {
    setSlotUploads(prev => {
      const current = prev[slotKey] || [];
      const next = { ...prev };
      if (index === undefined) {
        current.forEach(item => { if (item.url) URL.revokeObjectURL(item.url); });
        delete next[slotKey];
      } else {
        const target = current[index];
        if (target?.url) URL.revokeObjectURL(target.url);
        const remain = current.filter((_, i) => i !== index);
        if (remain.length) next[slotKey] = remain;
        else delete next[slotKey];
      }
      return next;
    });
    if (index !== undefined) {
      setAttachments(prev => prev.filter(item => !(item.kind === slotKey && item.id === `slot-${slotKey}-${index}`)));
    } else {
      setAttachments(prev => prev.filter(item => item.kind !== slotKey));
    }
    setAttachNotice(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const slot = pendingSlotRef.current;
    const option = pendingKindRef.current;
    const input = e.target;
    const files = Array.from(input.files || []);
    if (!option || files.length === 0) return;

    setAttachNotice(null);

    // 参考图这类多图槽位：并行上传，失败单项单独提示，成功的照常入列
    if (slot && slot.multiple) {
      try {
        setUploading(true);
        setUploadingLabel(slot.label);
        setUploadingSlotKey(slot.key);
        const results = await Promise.allSettled(
          files.map(file => validateAndUploadAttachment(option, file)),
        );
        const succeeded: { name: string; path: string; size: number; url: string }[] = [];
        const failed: string[] = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            succeeded.push({ ...r.value, url: URL.createObjectURL(files[i]) });
          } else {
            failed.push(`${files[i].name}：${r.reason?.message || '上传失败'}`);
          }
        });
        if (succeeded.length) {
          setSlotUploads(prev => ({ ...prev, [slot.key]: [...(prev[slot.key] || []), ...succeeded] }));
          const baseIdx = (slotUploads[slot.key] || []).length;
          setAttachments(prev => [
            ...prev.filter(item => item.kind !== slot.key),
            ...[...succeeded.map((u, i) => ({ id: `slot-${slot.key}-${baseIdx + i}`, kind: slot.key, name: u.name, path: u.path, size: u.size }))],
          ]);
        }
        if (failed.length) setAttachNotice({ type: 'error', text: `有 ${failed.length} 张上传失败：${failed.join('；')}` });
        if (succeeded.length && !failed.length) {
          setAttachNotice({ type: 'info', text: `${slot.label}已添加 ${succeeded.length} 张` });
        } else if (succeeded.length) {
          setAttachNotice({ type: 'info', text: `已添加 ${succeeded.length} 张，${failed.length} 张失败` });
        }
      } catch (error: any) {
        console.error('上传错误:', error);
        setAttachNotice({ type: 'error', text: error?.message || '上传失败，请重试' });
      } finally {
        setUploading(false);
        setUploadingLabel('');
        setUploadingSlotKey(null);
        input.value = '';
        pendingSlotRef.current = null;
      }
      return;
    }

    const file = files[0];
    if (!option || !file) return;

    try {
      setUploading(true);
      setUploadingLabel(slot ? slot.label : option.label);
      setUploadingSlotKey(slot ? slot.key : null);
      const uploaded = await validateAndUploadAttachment(option, file);

      if (slot) {
        const preview = URL.createObjectURL(file);
        setSlotUploads(prev => {
          const previous = prev[slot.key] || [];
          // 多图槽位追加；单图槽位替换旧的
          if (slot.multiple) return { ...prev, [slot.key]: [...previous, { ...uploaded, url: preview }] };
          previous.forEach(item => { if (item.url) URL.revokeObjectURL(item.url); });
          return { ...prev, [slot.key]: [{ ...uploaded, url: preview }] };
        });
        const existing = slotUploads[slot.key] || [];
        const startIndex = slot.multiple ? existing.length : 0;
        setAttachments(prev => [
          ...prev.filter(item => item.kind !== slot.key),
          { id: `slot-${slot.key}-${startIndex}`, kind: slot.key, name: uploaded.name, path: uploaded.path, size: uploaded.size },
        ]);
        setAttachNotice({ type: 'info', text: `${slot.label}「${uploaded.name}」已就位` });
      } else {
        const next: ComposerAttachment = {
          id: nextAttachmentId(option.id),
          kind: option.id,
          name: uploaded.name,
          path: uploaded.path,
          size: uploaded.size,
        };
        // 剧本只保留一份（后端只接受单个 file_path），其余类型可叠加
        setAttachments(prev =>
          option.id === 'script'
            ? [...prev.filter(item => item.kind !== 'script'), next]
            : [...prev, next],
        );
        setAttachNotice({ type: 'info', text: `${option.label}「${next.name}」上传完成` });
      }
    } catch (error: any) {
      console.error('上传错误:', error);
      setAttachNotice({ type: 'error', text: error?.message || '上传失败，请重试' });
    } finally {
      setUploading(false);
      setUploadingLabel('');
      setUploadingSlotKey(null);
      input.value = '';
      pendingSlotRef.current = null;
    }
  };

  return (
    <div className="xyq-home h-full flex flex-col items-center overflow-y-auto bg-gray-50/50">
      {/* 全屏封面：随场景 tab 切换。key 让 video 重新挂载，浏览器才会去加载新 src */}
      <div className={`xyq-hero-video-wrap tone-${scene.cover.tone || 'ink'}`} aria-hidden="true">
        {scene.cover.video ? (
          <video
            key={scene.cover.video}
            className="xyq-hero-video"
            src={scene.cover.video}
            poster={scene.cover.poster || HERO_COVER_FALLBACK_POSTER}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
          />
        ) : (
          <div
            className="xyq-hero-video is-still"
            style={{ backgroundImage: `url(${scene.cover.poster || HERO_COVER_FALLBACK_POSTER})` }}
          />
        )}
        <div className="xyq-hero-video-scrim" />
        <div className="xyq-hero-video-grain" />
      </div>

      {/* 主区域 - 居中 */}
      <div className="xyq-home-main w-full max-w-6xl px-6 pt-8 pb-8 flex-shrink-0">
        {/* 场景 tab：切换后整套 Agent / 技能卡 / 案例都会跟着换 */}
        <div className="xyq-scene-tabs">
          {SCENES.map(item => (
            <button
              key={item.id}
              type="button"
              className={clsx('xyq-scene-tab', item.id === scene.id && 'is-on')}
              onClick={() => applyScene(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 标题 */}
        <div className="xyq-hero-title text-center mb-8">
          <h1 className="xyq-hero-headline">Hi，和 Cineva 一起聊聊创作想法</h1>
          <p className="xyq-hero-sub">
            从一句灵感开始，让 AI 陪你完成整部短片
          </p>
        </div>

        {/* 输入区域 */}
        <div className="xyq-composer-glow">
        <div className="xyq-composer bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="xyq-composer-input-row">
          {/* 关键帧槽位：随「视频生成方式」变化（首帧 / 首帧+尾帧 / 参考图）
              参考图是多图槽位：以缩略图队列 + 末尾「+」追加的形式呈现 */}
          <div className="xyq-slot-group">
            {activeSlots.map(slot => {
              const uploads = slotUploads[slot.key] || [];
              const multi = Boolean(slot.multiple);
              return (
                <div
                  key={slot.key}
                  className={clsx('xyq-slot', uploads.length > 0 && 'is-filled', multi && uploads.length > 0 && 'is-multi')}
                >
                  <div className="xyq-slot-strip">
                    {uploads.map((upload, i) => (
                      <span key={`${slot.key}-${i}-${upload.path}`} className="xyq-slot-chip">
                        <img src={upload.url} alt={`${slot.label} ${i + 1}`} className="xyq-slot-thumb" />
                        <button
                          type="button"
                          className="xyq-slot-clear"
                          onClick={() => clearSlot(slot.key, i)}
                          aria-label={`移除${slot.label}第 ${i + 1} 张`}
                          title={`移除第 ${i + 1} 张`}
                        >
                          <X className="w-3 h-3" strokeWidth={2.4} />
                        </button>
                      </span>
                    ))}
                    {/* 单图槽位已有图时不再渲染「+」：否则会同时出现缩略图与加号，
                        而点它其实是静默覆盖旧图（见 pickSlotImage）。清空后本框会重新出现。 */}
                    {multi || uploads.length === 0 ? (
                      <button
                        type="button"
                        className="xyq-slot-box"
                        onClick={() => pickSlotImage(slot)}
                        title={
                          uploads.length
                            ? `${slot.label}已选 ${uploads.length} 张，点击添加更多（可多选）`
                            : `${slot.label}：${slot.hint}`
                        }
                        aria-label={`上传${slot.label}`}
                      >
                        {multi && uploads.length ? (
                          <span className="xyq-slot-add-more">
                            <Plus className="w-4 h-4" strokeWidth={2.2} />
                            <em>{uploads.length}</em>
                          </span>
                        ) : uploading && uploadingSlotKey === slot.key ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Plus className="w-5 h-5" strokeWidth={1.6} />
                        )}
                      </button>
                    ) : null}
                  </div>
                  <span className="xyq-slot-label">
                    {slot.label}
                    {multi && uploads.length > 1 ? ` · ${uploads.length} 张` : ''}
                  </span>
                  {uploads.length > 0 && !multi ? (
                    <span className="xyq-slot-hint">{uploads[0].name}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
          {/* 附件入口统一放到下方工具栏的「上传文件」，槽位自带 “+” 后不再重复放裸加号 */}
          <div
            ref={promptFieldRef}
            className="xyq-prompt-field"
            data-hint-paused={hintHovered || hintFocused ? 'true' : 'false'}
            onPointerEnter={() => setHintHovered(true)}
            onPointerLeave={() => setHintHovered(false)}
            onFocus={() => setHintFocused(true)}
            onBlur={() => setHintFocused(false)}
          >
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder=""
            aria-label={COMPOSER_PLACEHOLDER}
            className="xyq-prompt-input w-full bg-transparent text-sm text-gray-800 resize-none outline-none min-h-[100px]"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && (idea.trim() || attachments.length > 0)) {
                e.preventDefault();
                handleStart(false);
              }
            }}
          />
          {!idea && (
            <RotatingPromptHint
              active={!hintHovered && !hintFocused}
              fieldRef={promptFieldRef}
              hints={scene.hints}
            />
          )}
          </div>
          </div>

          {looseAttachments.length > 0 && (
            <div className="xyq-attachment-list">
              {looseAttachments.map(item => {
                const option = attachmentOption(item.kind);
                const Icon = option.icon;
                return (
                  <span key={item.id} className="xyq-attachment-chip" title={item.name}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                    <span className="xyq-attachment-name">{item.name}</span>
                    {formatFileSize(item.size) && (
                      <span className="xyq-attachment-meta">{formatFileSize(item.size)}</span>
                    )}
                    <span className="xyq-attachment-kind">{option.label}</span>
                    <button
                      type="button"
                      className="xyq-attachment-remove"
                      onClick={() => removeAttachment(item.id)}
                      aria-label={`移除${option.label}`}
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {uploading && (
            <div className="xyq-attach-status">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              正在上传{uploadingLabel}……
            </div>
          )}

          {attachNotice && (
            <div className={clsx('xyq-attach-status', attachNotice.type === 'error' ? 'is-error' : 'is-info')}>
              {attachNotice.text}
            </div>
          )}

          <div className="xyq-composer-toolbar flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowEpisodesPanel(!showEpisodesPanel);
                    setShowSettings(false);
                  }}
                  className={clsx(
                    'xyq-tool-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    showEpisodesPanel
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  剧集：{episodes} 集
                  <ChevronDown className={clsx('xyq-tool-chevron', showEpisodesPanel && 'is-open')} />
                </button>

                <SelectPanel
                  open={showEpisodesPanel}
                  onClose={() => setShowEpisodesPanel(false)}
                  title="剧集"
                  subtitle="每集约 1–2 分钟"
                  width={336}
                >
                  <div className="xyq-step-row">
                    <button
                      type="button"
                      className="xyq-step-button"
                      onClick={() => setEpisodes(v => Math.max(1, v - 1))}
                      aria-label="减少一集"
                    >
                      −
                    </button>
                    <span className="xyq-step-value">{episodes} 集</span>
                    <button
                      type="button"
                      className="xyq-step-button"
                      onClick={() => setEpisodes(v => Math.min(10, v + 1))}
                      aria-label="增加一集"
                    >
                      +
                    </button>
                  </div>

                  <div className="xyq-pill-choice-row">
                    {[1, 2, 4, 6, 8, 10].map(count => (
                      <button
                        key={count}
                        type="button"
                        className={clsx('xyq-pill-choice', episodes === count && 'is-selected')}
                        onClick={() => setEpisodes(count)}
                      >
                        {count} 集
                      </button>
                    ))}
                  </div>

                  <p className="xyq-option-desc">推荐 4–6 集；集数越多，整部片子生成时间越长。</p>
                </SelectPanel>
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setShowSettings(!showSettings);
                    setShowEpisodesPanel(false);
                    setExpandedModelGroup(null);
                  }}
                  className={clsx(
                    'xyq-tool-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    showSettings
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  )}
                  aria-haspopup="dialog"
                  aria-expanded={showSettings}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  生成配置
                  <span className="xyq-tool-value">{configBadge}</span>
                  <ChevronDown className={clsx('xyq-tool-chevron', showSettings && 'is-open')} />
                </button>

                <SelectPanel
                  open={showSettings}
                  onClose={() => setShowSettings(false)}
                  title="生成配置"
                  subtitle={`共 ${episodes} 集 · 用于主流程各阶段`}
                  width={468}
                  tabs={[
                    { id: 'visual', label: '画面', icon: Palette },
                    { id: 'models', label: '模型', icon: Cpu },
                    { id: 'output', label: '输出', icon: MonitorPlay },
                  ]}
                  activeTab={configTab}
                  onTabChange={id => {
                    setConfigTab(id as 'visual' | 'models' | 'output');
                    setExpandedModelGroup(null);
                  }}
                  footer={
                    <>
                      <span className="xyq-summary-line">
                        <Sparkles className="w-3.5 h-3.5" />
                        {configSummary} · 剧集 {episodes}
                      </span>
                      <button type="button" className="xyq-ghost-button" onClick={restoreDefaultConfig}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        恢复默认
                      </button>
                    </>
                  }
                >
                  {configTab === 'visual' && (
                    <>
                      <div className="xyq-option-group-label">画面风格</div>
                      {STYLES.map(style => {
                        const meta = STYLE_META[style.id] || { description: '' };
                        return (
                          <OptionRow
                            key={style.id}
                            icon={Palette}
                            option={{
                              id: style.id,
                              label: style.label,
                              description: meta.description,
                              badge: meta.badge,
                              badgeTone: meta.badgeTone,
                            }}
                            selected={selectedStyle === style.id}
                            onSelect={id => setSelectedStyle(id)}
                          />
                        );
                      })}
                    </>
                  )}

                  {configTab === 'models' && (
                    <>
                      <div className="xyq-option-group-label">主流程模型</div>
                      {modelGroups.map(group => (
                        <SubSelect
                          key={group.key}
                          icon={group.icon}
                          title={group.title}
                          valueLabel={modelLabelFrom(group.providers, group.value)}
                          expanded={expandedModelGroup === group.key}
                          onToggle={() =>
                            setExpandedModelGroup(prev => (prev === group.key ? null : group.key))
                          }
                        >
                          {group.providers.length === 0 ? (
                            <div className="xyq-option-group-label">未读取到模型</div>
                          ) : (
                            group.providers.map(pg => (
                              <div key={pg.provider}>
                                <div className="xyq-option-group-label">{pg.label}</div>
                                {pg.models.map(model => (
                                  <OptionRow
                                    key={model.id}
                                    compact
                                    icon={group.icon}
                                    option={{ id: model.id, label: model.label }}
                                    selected={group.value === model.id}
                                    onSelect={id => {
                                      group.onChange(id);
                                      setExpandedModelGroup(null);
                                    }}
                                  />
                                ))}
                              </div>
                            ))
                          )}
                        </SubSelect>
                      ))}
                    </>
                  )}

                  {configTab === 'output' && (
                    <>
                      <div className="xyq-option-group-label">视频生成方式</div>
                      {VIDEO_GENERATION_MODES.map(mode => {
                        const meta = VIDEO_MODE_META[mode.id] || { description: '' };
                        return (
                          <OptionRow
                            key={mode.id}
                            icon={Clapperboard}
                            option={{
                              id: mode.id,
                              label: mode.label,
                              description: meta.description,
                              badge: meta.badge,
                              badgeTone: meta.badgeTone,
                            }}
                            selected={selectedVideoMode === mode.id}
                            onSelect={id => {
                              setSelectedVideoMode(id as VideoGenerationMode);
                              setExpandedModelGroup(null);
                            }}
                          />
                        );
                      })}

                      <SubSelect
                        icon={Video}
                        title={`${selectedVideoModeLabel}模型`}
                        valueLabel={modelLabelFrom(activeVideoProviders, activeVideoModel)}
                        expanded={expandedModelGroup === 'video'}
                        onToggle={() =>
                          setExpandedModelGroup(prev => (prev === 'video' ? null : 'video'))
                        }
                      >
                        {activeVideoProviders.length === 0 ? (
                          <div className="xyq-option-group-label">未读取到模型</div>
                        ) : (
                          activeVideoProviders.map(pg => (
                            <div key={pg.provider}>
                              <div className="xyq-option-group-label">{pg.label}</div>
                              {pg.models.map(model => (
                                <OptionRow
                                  key={model.id}
                                  compact
                                  icon={Video}
                                  option={{ id: model.id, label: model.label }}
                                  selected={activeVideoModel === model.id}
                                  onSelect={id => {
                                    setActiveVideoModel(id);
                                    setExpandedModelGroup(null);
                                  }}
                                />
                              ))}
                            </div>
                          ))
                        )}
                      </SubSelect>

                      <div className="xyq-option-group-label">视频长宽比</div>
                      <div className="xyq-ratio-grid">
                        {VIDEO_RATIOS.map(r => {
                          const [w, h] = RATIO_SIZE[r.ratio] || [26, 20];
                          return (
                            <button
                              key={r.id}
                              type="button"
                              className={clsx('xyq-ratio-card', selectedRatio === r.id && 'is-selected')}
                              onClick={() => setSelectedRatio(r.id)}
                              aria-pressed={selectedRatio === r.id}
                            >
                              <span className="xyq-ratio-shape" style={{ width: w, height: h }} />
                              {r.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="xyq-option-group-label">分辨率</div>
                      {VIDEO_RESOLUTIONS.map(item => (
                        <OptionRow
                          key={item.id}
                          icon={MonitorPlay}
                          option={{
                            id: item.id,
                            label: item.label,
                            description: item.id === '1080P' ? '更清晰，生成更慢、成本更高' : '速度与画质平衡',
                            badge: item.id === '720P' ? '推荐' : undefined,
                            badgeTone: item.id === '720P' ? 'best' : undefined,
                          }}
                          selected={selectedResolution === item.id}
                          onSelect={id => setSelectedResolution(id)}
                        />
                      ))}

                      <label className="xyq-checkbox-row">
                        <input
                          type="checkbox"
                          checked={enableConcurrency}
                          onChange={e => setEnableConcurrency(e.target.checked)}
                        />
                        并发生成（同时推进多个镜头）
                      </label>
                    </>
                  )}
                </SelectPanel>
              </div>
              <button
                onClick={() => setWebSearch(!webSearch)}
                className={clsx(
                  'xyq-tool-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  webSearch
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                联网搜索
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* 隐藏的文件输入框：accept 由「上传文件」菜单动态设置 */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              {/* “上传文件”附件入口：图片 / 视频 / 剧本 / 音频 */}
              <div className="xyq-attach-anchor">
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(open => !open);
                    setAttachNotice(null);
                  }}
                  className={clsx(
                    'xyq-tool-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    attachMenuOpen
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  )}
                  aria-label="上传文件"
                  aria-haspopup="menu"
                  aria-expanded={attachMenuOpen}
                  title="上传图片、视频、剧本或音频"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.8} />
                  )}
                  上传文件
                </button>

                {attachMenuOpen && (
                  <>
                    <div className="xyq-attach-backdrop" onClick={() => setAttachMenuOpen(false)} />
                    <div
                      className="xyq-attach-menu is-toolbar"
                      role="menu"
                      aria-label="选择附件类型"
                    >
                      {ATTACHMENT_OPTIONS.map(option => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="menuitem"
                            className="xyq-attach-item"
                            onClick={() => handleAttachmentPick(option)}
                          >
                            <Icon className="xyq-attach-item-icon" strokeWidth={1.6} />
                            <span className="xyq-attach-item-text">
                              <span className="xyq-attach-item-title">{option.label}</span>
                              <span className="xyq-attach-item-desc">{option.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => handleStart(false)}
                disabled={!canStart}
                className={clsx(
                  'xyq-action-secondary flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors',
                  canStart
                    ? 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                逐步创作
              </button>
              <button
                onClick={() => handleStart(true)}
                disabled={!canStart}
                className={clsx(
                  'xyq-action-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  canStart
                    ? 'bg-black text-white hover:bg-gray-800 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
                title="自动执行全部六个阶段，无需手动确认"
              >
                一键生成
              </button>
            </div>
          </div>
          {(configLoading || configError) && (
            <div className={clsx('mt-3 text-xs', configError ? 'text-red-500' : 'text-gray-400')}>
              {configError || '正在读取默认模型……'}
            </div>
          )}

        </div>
        </div>

        {/* 场景技能卡：点「试试看」把该技能的提示词填进输入坞 */}
        <div className="xyq-scene-skills">
          {scene.skills.map(skill => {
            const Icon = SCENE_SKILL_ICONS[skill.icon] || Sparkles;
            return (
              <button
                key={skill.id}
                type="button"
                className={clsx('xyq-scene-skill', `tone-${skill.tone}`)}
                onClick={() => applySceneSkill(skill)}
                title={skill.hint}
              >
                <span className="xyq-scene-skill-top">
                  <span className="xyq-scene-skill-glyph"><Icon className="w-4 h-4" strokeWidth={1.7} /></span>
                  <span className="xyq-scene-skill-label">{skill.label}</span>
                </span>
                <span className="xyq-scene-skill-hint">{skill.hint}</span>
                <span className="xyq-scene-skill-cta">试试看</span>
              </button>
            );
          })}
        </div>

        {/* 场景案例 */}
        <div className="xyq-inspiration mb-10">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {scene.caseTitle}
          </h3>
          <div className="xyq-inspiration-grid grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {scene.cases.map((item, idx) => (
              <button
                key={`${scene.id}-${idx}`}
                onClick={() => applySceneSkill({ ...item, id: `case-${idx}`, label: item.title, hint: item.description, icon: 'sparkles', tone: item.tone })}
                className="xyq-inspiration-card text-left bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all group"
              >
                {item.image ? (
                  <div
                    className="xyq-inspiration-media"
                    style={{ backgroundImage: `url(${item.image})` }}
                  />
                ) : (
                  <div className={clsx('xyq-inspiration-media is-tone', `tone-${item.tone}`)}>
                    <Sparkles className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                )}
                <div className="xyq-inspiration-copy">
                  <div className="text-sm font-medium text-neutral-950 transition-colors mb-1">
                    {item.title}
                  </div>
                  <div className="text-xs text-neutral-500 line-clamp-2">
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 精选作品流（对标 OiiOii 首页的「社媒爆款」） */}
        <div className="xyq-works mb-10">
          <div className="xyq-works-head">
            <h3 className="text-sm font-semibold text-gray-900">精选作品</h3>
            <span className="xyq-works-more">上划查看更多</span>
          </div>
          <div className="xyq-works-rail">
            {FEATURED_WORKS.map((work, i) => (
              <button
                key={`${work.title}-${i}`}
                type="button"
                className="xyq-work-card"
                onClick={() => handleExampleClick(`${work.title}：`)}
                title={work.meta}
              >
                <span
                  className="xyq-work-media"
                  style={{ backgroundImage: `url(${work.image})` }}
                >
                  <span className="xyq-work-tag">{work.tag}</span>
                </span>
                <span className="xyq-work-title">{work.title}</span>
                <span className="xyq-work-meta">{work.meta}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 历史记录区域 */}
      {history.length > 0 && (
        <div className="xyq-history w-full max-w-6xl px-6 pb-12 flex-shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-600">历史记录</h3>
            <button
              onClick={() => setManageMode(m => !m)}
              className={`ml-auto text-xs px-2 py-0.5 rounded transition-colors ${
                manageMode ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {manageMode ? '完成' : '管理'}
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              {history.map(item => {
                const progress = stageProgressLabel(item.stages);
                return (
                <div key={item.id} className="relative group">
                  <div
                    onClick={() => !manageMode && onResumeProject(item.id)}
                    className={`xyq-history-card w-full text-left p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all ${!manageMode ? 'cursor-pointer' : ''}`}
                  >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors truncate">
                        {item.idea}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {item.style && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {item.style}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{item.date}</span>
                      </div>
                      <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-medium ${progress.color}`}>
                        {item.stages && Object.keys(item.stages).filter(k => ["completed", "session_completed"].includes(item.stages![k])).length >= STAGES.length ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                        )}
                        <span>{progress.text}</span>
                      </div>
                    </div>
                    {manageMode ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(item.id); setDeleteError(''); }}
                        className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors flex-shrink-0 mt-0.5"
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="xyq-dialog-scrim fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="xyq-delete-dialog bg-white rounded-2xl shadow-xl w-80 p-6 relative" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="w-4 h-4 text-red-500" />
              <h4 id="delete-dialog-title" className="text-sm font-semibold text-gray-700">删除项目</h4>
            </div>
            <p className="text-xs text-gray-500 mb-6">确认删除这个项目吗？此操作不可撤销。</p>
            {deleteError && <p className="text-xs text-red-500 mb-2">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                className="flex-1 text-sm py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 text-sm py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
