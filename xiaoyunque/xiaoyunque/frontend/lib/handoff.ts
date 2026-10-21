/* 跨页状态传递（Handoff）
   替代原先散落各处的 sessionStorage 走私：写入方和读取方必须共用这里的 key 与 schema。

   设计要点（对标 OiiOii 的 enter_from / from_page / returnTo 三件套）：
   1. 所有 handoff 数据都带 `v`（schema 版本）与 `ts`（写入时间），过期自动丢弃；
   2. 读取一律走 `take*()`，读到即消费，避免"回退后再触发一次"；
   3. 写入方永远不假设读取方已经挂载 —— 首页即使已挂载也能通过事件即时收到。 */

export const HANDOFF_EVENT = 'cineva:handoff';

const VERSION = 2;
/** handoff 数据最长存活时间：10 分钟 */
const MAX_AGE_MS = 10 * 60 * 1000;

export interface SkillHandoff {
  v: number;
  ts: number;
  /** 技能提示词 */
  prompt?: string;
  /** 技能展示名 */
  name?: string;
  /** 技能 id（用于高亮来源） */
  skillId?: string;
  ratio?: string;
  style?: string;
  videoMode?: 'first_frame' | 'start_end_frame' | 'reference';
}

export interface RemakeHandoff {
  v: number;
  ts: number;
  id: string;
  title: string;
  characters?: { name: string; image: string; desc?: string }[];
  styleLock?: string;
  ratio?: string;
  remakePrompt?: string;
}

export interface DraftHandoff {
  v: number;
  ts: number;
  text: string;
  source?: string;
}

const KEY_SKILL = 'cineva.handoff.skill';
const KEY_REMAKE = 'cineva.handoff.remake';
const KEY_DRAFT = 'cineva.handoff.draft';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function write<T extends { v: number; ts: number }>(key: string, payload: Omit<T, 'v' | 'ts'>): void {
  if (!isBrowser()) return;
  const data = { ...payload, v: VERSION, ts: Date.now() } as unknown as T;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* 隐私模式 / 配额满：忽略 */
  }
  // 广播：已在首页的场景不必等下一次挂载
  try {
    window.dispatchEvent(new CustomEvent(HANDOFF_EVENT, { detail: { key, data } }));
  } catch {
    /* 忽略 */
  }
}

function take<T extends { v: number; ts: number }>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    window.sessionStorage.removeItem(key);
    const parsed = JSON.parse(raw) as T;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.v !== VERSION) return null;
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 读取但不消费（用于首页挂载早期判断是否需要等默认配置） */
export function peekRemake(): RemakeHandoff | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(KEY_REMAKE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RemakeHandoff;
    if (!parsed || parsed.v !== VERSION) return null;
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function putSkillHandoff(payload: Omit<SkillHandoff, 'v' | 'ts'>): void {
  write<SkillHandoff>(KEY_SKILL, payload);
}

export function takeSkillHandoff(): SkillHandoff | null {
  return take<SkillHandoff>(KEY_SKILL);
}

export function putRemakeHandoff(payload: Omit<RemakeHandoff, 'v' | 'ts'>): void {
  write<RemakeHandoff>(KEY_REMAKE, payload);
}

export function takeRemakeHandoff(): RemakeHandoff | null {
  return take<RemakeHandoff>(KEY_REMAKE);
}

export function putDraftHandoff(text: string, source = 'dock'): void {
  write<DraftHandoff>(KEY_DRAFT, { text, source });
}

export function takeDraftHandoff(): DraftHandoff | null {
  return take<DraftHandoff>(KEY_DRAFT);
}

/**
 * 构造「回到首页并带上提示词」的跳转 URL。
 * 首页会在挂载时读取 query 兜底（sessionStorage 被清掉也能工作），
 * 这样链接可复制、可分享、可后退重放。
 */
export function buildHomeUrl(params: {
  skillId?: string;
  remakeId?: string;
  text?: string;
  ratio?: string;
  style?: string;
  videoMode?: string;
}): string {
  const search = new URLSearchParams();
  if (params.skillId) search.set('skill', params.skillId);
  if (params.remakeId) search.set('remake', params.remakeId);
  if (params.text) search.set('text', params.text);
  if (params.ratio) search.set('ratio', params.ratio);
  if (params.style) search.set('style', params.style);
  if (params.videoMode) search.set('videoMode', params.videoMode);
  const qs = search.toString();
  return qs ? `/?${qs}` : '/';
}
