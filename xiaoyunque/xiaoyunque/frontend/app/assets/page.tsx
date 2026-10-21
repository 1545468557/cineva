'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  FolderPlus, Image as ImageIcon, Loader2, RotateCcw, Search, Sparkles, Star, Trash2,
  UploadCloud, X,
} from 'lucide-react';
import { ASSET_KINDS, DEMO_ASSETS, type AssetItem, type AssetKind } from '@/config/assets';
import { uploadMedia } from '@/lib/workflowApi';
import './assets.css';

type TabKey = 'assets' | 'actors' | 'trash';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'assets', label: '我的资产' },
  { key: 'actors', label: '演员库' },
  { key: 'trash', label: '回收站' },
];

/** 后端返回的素材记录（library.py 的公开结构） */
interface LibraryAsset {
  id: string;
  name: string;
  kind: string;
  cover: string;
  tags: string[];
  model: string;
  origin: string;
  source: string;
  starred: boolean;
  trashed: boolean;
  createdAt: number;
}

function toAssetItem(item: LibraryAsset): AssetItem {
  return {
    id: `lib-${item.id}`,
    name: item.name,
    kind: (ASSET_KINDS.includes(item.kind as AssetKind) ? item.kind : '其他') as AssetKind,
    cover: item.cover,
    tags: item.tags?.length ? item.tags : ['本机素材'],
    model: item.model || '—',
    createdAt: '本机素材',
    origin: item.origin === '示例' ? '示例' : '本机生成',
  };
}

/** 从本机生成记录里抽出带图的素材 */
function fromSandboxRecords(records: any[]): AssetItem[] {
  const mapped: AssetItem[] = [];
  records.forEach((r, i) => {
    const images: string[] = (r.output && r.output.images) || [];
    images.forEach((url, j) => {
      if (!url) return;
      mapped.push({
        id: `real-${r.id || i}-${j}`,
        name: `${r.tool || '生成'} · ${String(r.model || '').slice(0, 18)}`,
        kind: '其他',
        cover: url,
        tags: [String(r.tool || ''), String(r.model || '')].filter(Boolean),
        model: String(r.model || ''),
        createdAt: '本机记录',
        origin: '本机生成',
      });
    });
  });
  return mapped;
}

export default function AssetsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabKey>('assets');
  const [kind, setKind] = useState<'全部' | AssetKind>('全部');
  const [query, setQuery] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [library, setLibrary] = useState<LibraryAsset[]>([]);
  const [sandboxAssets, setSandboxAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<AssetItem | null>(null);
  const [backendUp, setBackendUp] = useState(true);

  /** 拉真实素材：后端素材库 + 本机沙箱生成记录 */
  const load = useCallback(async () => {
    setLoading(true);
    let up = true;
    try {
      const resp = await fetch('/api/library/assets?include_trashed=true');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setLibrary(Array.isArray(data.assets) ? data.assets : []);
    } catch {
      up = false;
      setLibrary([]);
    }
    try {
      const resp = await fetch('/api/sandbox/history');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setSandboxAssets(fromSandboxRecords(Array.isArray(data.records) ? data.records : []));
    } catch {
      up = false;
      setSandboxAssets([]);
    }
    setBackendUp(up);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const starredIds = useMemo(
    () => new Set(library.filter(item => item.starred).map(item => item.id)),
    [library],
  );
  const trashedIds = useMemo(
    () => new Set(library.filter(item => item.trashed).map(item => item.id)),
    [library],
  );

  const all = useMemo<AssetItem[]>(
    () => [...library.map(toAssetItem), ...sandboxAssets, ...DEMO_ASSETS],
    [library, sandboxAssets],
  );

  const items = useMemo(() => {
    let list = all;
    if (tab === 'trash') {
      list = list.filter(a => trashedIds.has(a.id.replace(/^lib-/, '')));
    } else {
      list = list.filter(a => !trashedIds.has(a.id.replace(/^lib-/, '')));
      if (tab === 'actors') list = list.filter(a => a.kind === '角色');
      if (tab === 'assets' && kind !== '全部') list = list.filter(a => a.kind === kind);
      if (starredOnly) list = list.filter(a => starredIds.has(a.id.replace(/^lib-/, '')));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        a.name.toLowerCase().includes(q)
        || a.tags.join(' ').toLowerCase().includes(q)
        || a.kind.includes(q),
      );
    }
    return list;
  }, [all, tab, kind, query, starredOnly, starredIds, trashedIds]);

  const counts = useMemo(() => {
    const active = all.filter(a => !trashedIds.has(a.id.replace(/^lib-/, '')));
    const base: Record<string, number> = { 全部: active.length };
    ASSET_KINDS.forEach(k => { base[k] = active.filter(a => a.kind === k).length; });
    return base;
  }, [all, trashedIds]);

  const patchLibrary = useCallback(async (rawId: string, patch: Record<string, unknown>) => {
    const resp = await fetch(`/api/library/assets/${rawId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!resp.ok) {
      const payload = await resp.json().catch(() => null);
      throw new Error(typeof payload?.detail === 'string' ? payload.detail : '更新失败');
    }
    const data = await resp.json();
    setLibrary(prev => prev.map(item => (item.id === rawId ? { ...item, ...data.asset } : item)));
  }, []);

  /** 收藏：本机素材写后端；演示数据只做前端提示 */
  const toggleStar = useCallback(async (asset: AssetItem) => {
    setError('');
    const rawId = asset.id.replace(/^lib-/, '');
    const isLibrary = asset.id.startsWith('lib-');
    if (!isLibrary) {
      setNotice('演示素材不支持收藏；上传或生成一个素材后再试。');
      return;
    }
    try {
      await patchLibrary(rawId, { starred: !starredIds.has(rawId) });
      setNotice('');
    } catch (e: any) {
      setError(e?.message || '收藏失败');
    }
  }, [patchLibrary, starredIds]);

  /** 移入回收站 / 恢复 */
  const moveToTrash = useCallback(async (asset: AssetItem) => {
    setError('');
    if (!asset.id.startsWith('lib-')) {
      setNotice('演示素材不可删除。');
      return;
    }
    try {
      await patchLibrary(asset.id.replace(/^lib-/, ''), { trashed: true });
      setPreview(null);
      setNotice(`已移入回收站：${asset.name}`);
    } catch (e: any) {
      setError(e?.message || '移入回收站失败');
    }
  }, [patchLibrary]);

  const restore = useCallback(async (asset: AssetItem) => {
    setError('');
    if (!asset.id.startsWith('lib-')) return;
    try {
      await patchLibrary(asset.id.replace(/^lib-/, ''), { trashed: false });
      setNotice(`已恢复：${asset.name}`);
    } catch (e: any) {
      setError(e?.message || '恢复失败');
    }
  }, [patchLibrary]);

  const purge = useCallback(async (asset: AssetItem) => {
    setError('');
    if (!asset.id.startsWith('lib-')) return;
    try {
      const resp = await fetch(`/api/library/assets/${asset.id.replace(/^lib-/, '')}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('彻底删除失败');
      setLibrary(prev => prev.filter(item => `lib-${item.id}` !== asset.id));
      setPreview(null);
      setNotice('已彻底删除');
    } catch (e: any) {
      setError(e?.message || '彻底删除失败');
    }
  }, []);

  /** 真上传：先落盘，再登记到素材库 */
  const handlePick = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    setNotice('');
    setError('');
    let ok = 0;
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const uploaded = await uploadMedia(file);
        const kindGuess: AssetKind = file.type.startsWith('video/') ? '其他' : '其他';
        const resp = await fetch('/api/library/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name.replace(/\.[^.]+$/, ''),
            kind: kindGuess,
            cover: uploaded.file_path,
            tags: ['本地上传', (file.type.split('/')[1] || 'file')],
            model: '—',
            origin: '本机生成',
            source: 'upload',
          }),
        });
        if (!resp.ok) {
          const payload = await resp.json().catch(() => null);
          throw new Error(typeof payload?.detail === 'string' ? payload.detail : '登记素材失败');
        }
        const data = await resp.json();
        setLibrary(prev => [data.asset, ...prev]);
        ok += 1;
      } catch (e: any) {
        failures.push(`${file.name}：${e?.message || '上传失败'}`);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    if (ok) setNotice(`已上传 ${ok} 个文件`);
    if (failures.length) setError(failures.slice(0, 3).join('；'));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const previewRawId = preview ? preview.id.replace(/^lib-/, '') : '';
  const previewInTrash = preview ? trashedIds.has(previewRawId) : false;
  const previewIsLibrary = preview ? preview.id.startsWith('lib-') : false;

  return (
    <div className="xyq-assets">
      <div className="xyq-assets-inner">
        <header className="xyq-assets-head">
          <h1>资产</h1>
          <div className="xyq-assets-head-right">
            {loading && (
              <span className="xyq-assets-loading">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 读取中…
              </span>
            )}
            <button type="button" className="xyq-assets-upload" onClick={() => fileRef.current?.click()}>
              <UploadCloud className="w-3.5 h-3.5" /> 上传素材
            </button>
          </div>
        </header>

        <div className="xyq-assets-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              className={clsx('xyq-assets-tab', tab === t.key && 'is-on')}
              onClick={() => { setTab(t.key); setKind('全部'); }}
            >
              {t.label}
              {t.key === 'trash' && trashedIds.size > 0 && <em className="xyq-assets-badge">{trashedIds.size}</em>}
            </button>
          ))}
        </div>

        <div className="xyq-assets-bar">
          <div className="xyq-assets-kinds">
            {(['全部', ...ASSET_KINDS] as const).map(k => (
              <button
                key={k}
                type="button"
                className={clsx('xyq-assets-chip', kind === k && 'is-on')}
                onClick={() => setKind(k)}
                disabled={tab !== 'assets' && k !== '全部'}
              >
                {k}
                <span className="xyq-assets-count">{counts[k] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="xyq-assets-actions">
            {tab === 'trash' ? (
              <button
                type="button"
                className="xyq-assets-action"
                onClick={async () => {
                  if (!trashedIds.size) return;
                  setError('');
                  try {
                    const resp = await fetch('/api/library/assets', { method: 'DELETE' });
                    if (!resp.ok) throw new Error('清空回收站失败');
                    setLibrary(prev => prev.filter(item => !item.trashed));
                    setNotice('回收站已清空');
                  } catch (e: any) {
                    setError(e?.message || '清空回收站失败');
                  }
                }}
                disabled={!trashedIds.size}
              >
                <Trash2 className="w-3.5 h-3.5" /> 清空回收站
              </button>
            ) : (
              <button
                type="button"
                className={clsx('xyq-assets-action is-icon', starredOnly && 'is-on')}
                onClick={() => setStarredOnly(s => !s)}
                title="只看收藏"
              >
                <Star className="w-3.5 h-3.5" />
              </button>
            )}
            <label className="xyq-assets-search">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={tab === 'actors' ? '搜索角色' : '搜索资产'}
              />
              <Search className="w-3.5 h-3.5" />
            </label>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="xyq-assets-file"
          onChange={e => void handlePick(e.target.files)}
        />

        {!backendUp && !loading && (
          <div className="xyq-assets-notice is-error">
            后端未启动或素材库不可用：收藏 / 回收站 / 上传都不可用。启动 `python api_server.py` 后重试。
            <button type="button" className="xyq-assets-retry" onClick={() => void load()}>
              <RotateCcw className="w-3 h-3" /> 重试
            </button>
          </div>
        )}
        {notice && <div className="xyq-assets-notice">{notice}</div>}
        {error && <div className="xyq-assets-notice is-error">{error}</div>}

        {tab === 'trash' && items.length === 0 ? (
          <div className="xyq-assets-empty">
            <Trash2 className="w-8 h-8" strokeWidth={1.4} />
            <p>回收站是空的</p>
            <span>删除的素材会在这里保留，可随时恢复或彻底删除</span>
          </div>
        ) : items.length === 0 ? (
          <div className="xyq-assets-blank">
            <div className="xyq-assets-blank-actions">
              <button type="button" className="xyq-assets-blank-btn is-primary" onClick={() => router.push('/sandbox')}>
                <Sparkles className="w-4 h-4" strokeWidth={1.7} />
                <b>生成</b>
                <span>用一句话生成图片资产</span>
              </button>
              <button type="button" className="xyq-assets-blank-btn" onClick={() => fileRef.current?.click()}>
                <UploadCloud className="w-4 h-4" strokeWidth={1.7} />
                <b>上传</b>
                <span>导入本地图片或视频</span>
              </button>
              <button type="button" className="xyq-assets-blank-btn" onClick={() => fileRef.current?.click()}>
                <FolderPlus className="w-4 h-4" strokeWidth={1.7} />
                <b>批量上传</b>
                <span>一次选多个文件</span>
              </button>
            </div>
            {uploading && (
              <div className="xyq-assets-loading">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 上传中…
              </div>
            )}
          </div>
        ) : (
          <div className={clsx('xyq-assets-grid', tab === 'actors' && 'is-actors')}>
            {items.map(item => {
              const rawId = item.id.replace(/^lib-/, '');
              const isLibrary = item.id.startsWith('lib-');
              const inTrash = trashedIds.has(rawId);
              return (
                <article key={item.id} className={clsx('xyq-asset-card', inTrash && 'is-trashed')}>
                  <button type="button" className="xyq-asset-open" onClick={() => setPreview(item)}>
                    <span className="xyq-asset-cover" style={{ backgroundImage: `url(${item.cover})` }}>
                      <span className="xyq-asset-kind">{item.kind}</span>
                      {item.origin === '示例' && <span className="xyq-asset-demo">示例</span>}
                      {isLibrary && <span className="xyq-asset-real">本机</span>}
                      {inTrash && <span className="xyq-asset-trash-tag">回收站</span>}
                    </span>
                  </button>
                  <div className="xyq-asset-body">
                    <div className="xyq-asset-title-row">
                      <h3>{item.name}</h3>
                      {!inTrash && (
                        <button
                          type="button"
                          className={clsx('xyq-asset-star', isLibrary && starredIds.has(rawId) && 'is-on')}
                          onClick={() => void toggleStar(item)}
                          title={isLibrary ? '收藏' : '演示素材不可收藏'}
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="xyq-asset-tags">
                      {item.tags.slice(0, 3).map(t => <span key={t}>{t}</span>)}
                    </div>
                    <div className="xyq-asset-foot">
                      <span className="xyq-asset-model">{item.model}</span>
                      {inTrash ? (
                        <span className="xyq-asset-row-actions">
                          <button type="button" onClick={() => void restore(item)}>恢复</button>
                          <button type="button" className="is-danger" onClick={() => void purge(item)}>彻底删除</button>
                        </span>
                      ) : (
                        <span className="xyq-asset-time">{item.createdAt}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="xyq-assets-tip">
          <ImageIcon className="w-3.5 h-3.5" />
          本机素材来自上传与生成记录（存后端 library.json，刷新与重启都在）；带「示例」角标的是演示数据，不可收藏或删除。
        </footer>
      </div>

      {preview && (
        <div className="xyq-asset-modal" onClick={() => setPreview(null)} role="presentation">
          <div className="xyq-asset-modal-box" onClick={e => e.stopPropagation()}>
            <button type="button" className="xyq-asset-modal-close" onClick={() => setPreview(null)} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
            <div className="xyq-asset-modal-media" style={{ backgroundImage: `url(${preview.cover})` }} />
            <div className="xyq-asset-modal-info">
              <h3>{preview.name}</h3>
              <div className="xyq-asset-tags">
                <span>{preview.kind}</span>
                {preview.tags.map(t => <span key={t}>{t}</span>)}
              </div>
              <dl>
                <div><dt>模型</dt><dd>{preview.model}</dd></div>
                <div><dt>来源</dt><dd>{preview.origin === '示例' ? '演示数据' : '本机生成 / 上传'}</dd></div>
                <div><dt>时间</dt><dd>{preview.createdAt}</dd></div>
              </dl>
              {previewIsLibrary && (
                <div className="xyq-asset-modal-actions">
                  {previewInTrash ? (
                    <>
                      <button type="button" className="is-ghost" onClick={() => void restore(preview)}>
                        <RotateCcw className="w-3.5 h-3.5" /> 恢复
                      </button>
                      <button type="button" className="is-danger" onClick={() => void purge(preview)}>
                        <Trash2 className="w-3.5 h-3.5" /> 彻底删除
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={clsx('is-ghost', starredIds.has(previewRawId) && 'is-on')}
                        onClick={() => void toggleStar(preview)}
                      >
                        <Star className="w-3.5 h-3.5" />
                        {starredIds.has(previewRawId) ? '取消收藏' : '收藏'}
                      </button>
                      <button type="button" className="is-danger" onClick={() => void moveToTrash(preview)}>
                        <Trash2 className="w-3.5 h-3.5" /> 移入回收站
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
