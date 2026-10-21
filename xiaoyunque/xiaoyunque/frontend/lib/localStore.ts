/* 本机持久化小仓库
   统一的 localStorage 读写 + 订阅广播，避免每个页面各写一套 try/catch JSON.parse。

   设计要点：
   1. 写入即广播，同页多组件与跨标签页都能同步（storage 事件）；
   2. 读取时做 schema 兜底，坏数据直接丢弃而不是让页面崩；
   3. SSR 安全（typeof window 判断）。 */

import { useCallback, useEffect, useState } from 'react';

const EVENT = 'cineva:localstore';

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function notify(key: string) {
  listeners.get(key)?.forEach(fn => fn());
}

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 配额满 / 隐私模式：忽略 */
  }
  notify(key);
}

/** 订阅某个 key 的变化（含跨标签页），返回取消订阅函数 */
export function subscribeLocal(key: string, fn: Listener): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) fn();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.get(key)?.delete(fn);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/**
 * 把一份 localStorage 数据当作 React 状态用。
 * 首次渲染用 fallback（SSR 安全），挂载后立即同步真实值。
 */
export function useLocalStore<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(readLocal<T>(key, fallback));
    setHydrated(true);
    return subscribeLocal(key, () => setValue(readLocal<T>(key, fallback)));
    // fallback 是对象字面量，故意不进依赖，避免无限订阅
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback((next: T | ((prev: T) => T)) => {
    const current = readLocal<T>(key, fallback);
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
    writeLocal(key, resolved);
    setValue(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, update, hydrated };
}

/* ── 业务 key 常量（集中管理，避免各页各写字符串） ── */
export const LS = {
  /** 技能收藏：Record<skillId, true> */
  skillFavorites: 'cineva.skillFavorites',
  /** 我创建的技能 */
  mySkills: 'cineva.mySkills',
  /** 资产收藏 */
  assetFavorites: 'cineva.assetFavorites',
  /** 资产回收站：Record<assetId, timestamp> */
  assetTrash: 'cineva.assetTrash',
  /** 本地上传的资产（跨刷新保留元数据） */
  uploadedAssets: 'cineva.uploadedAssets',
  /** 项目文件夹：{ folders: {id,name}[], assign: Record<projectId, folderId> } */
  projectFolders: 'cineva.projectFolders',
  /** 本地删除的示例项目 */
  projectTrash: 'cineva.projectTrash',
  /** 社区点赞 */
  workLikes: 'cineva.workLikes',
  /** 我发布的作品 */
  myWorks: 'cineva.myWorks',
  /** 侧边栏展开状态 */
  sidebarOpen: 'xiaoyunque.sidebar-open',
} as const;
