'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  ArrowUpRight, Check, Loader2, Plus, Search, Send, Share2, Sparkles, Star, X,
} from 'lucide-react';
import {
  SKILLS, SKILL_CATEGORIES, loadMySkills, mySkillToItem, saveMySkills,
  type MySkill, type SkillCategory, type SkillItem,
} from '@/config/skills';
import { buildHomeUrl, putSkillHandoff } from '@/lib/handoff';
import { LS, useLocalStore } from '@/lib/localStore';
import './skills.css';

type TabKey = 'all' | 'mine' | 'created' | 'favorited';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'mine', label: '我的技能' },
  { key: 'created', label: '我创建的' },
  { key: 'favorited', label: '我收藏的' },
];

/** 技能运行时唯一键：与 OiiOii 的 skillKey || id 解析保持一致 */
export function resolveSkillRuntimeId(skill: Pick<SkillItem, 'id'>): string {
  return skill.id;
}

export default function SkillsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('all');
  const [category, setCategory] = useState<'全部' | SkillCategory>('全部');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState<MySkill[]>([]);
  const [preview, setPreview] = useState<SkillItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<MySkill>({ id: '', name: '', desc: '', category: '通用', prompt: '' });
  const [toast, setToast] = useState('');
  const { value: favorites, update: updateFavorites, hydrated: favoritesReady } =
    useLocalStore<Record<string, boolean>>(LS.skillFavorites, {});

  useEffect(() => {
    setMine(loadMySkills());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** Esc 关闭弹层 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setPreview(null);
      setCreating(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const allSkills = useMemo<SkillItem[]>(() => [...mine.map(mySkillToItem), ...SKILLS], [mine]);

  /** 深链：/skills#<skillId> 直接打开对应技能详情 */
  useEffect(() => {
    if (!favoritesReady) return;
    const applyHash = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!id) return;
      const hit = allSkills.find(s => s.id === id);
      if (hit) setPreview(hit);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [allSkills, favoritesReady]);

  const items = useMemo(() => {
    let list = allSkills;
    if (tab === 'mine') list = list.filter(s => s.author === '我的' || favorites[s.id]);
    if (tab === 'created') list = list.filter(s => s.author === '我的');
    if (tab === 'favorited') list = list.filter(s => favorites[s.id]);
    if (category !== '全部') list = list.filter(s => s.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.category.includes(q),
      );
    }
    return list;
  }, [allSkills, tab, category, query, favorites]);

  /**
   * 点「试试看」：把技能提示词带进首页输入坞。
   * 同时写 handoff（跨页即时消费）+ query（可分享、可后退重放）双通道。
   */
  const tryIt = useCallback((skill: SkillItem) => {
    putSkillHandoff({
      prompt: skill.prompt,
      name: skill.name,
      skillId: skill.id,
      ratio: skill.ratio,
      style: skill.style,
      videoMode: skill.videoMode,
    });
    router.push(buildHomeUrl({
      skillId: skill.id,
      text: skill.prompt,
      ratio: skill.ratio,
      style: skill.style,
      videoMode: skill.videoMode,
    }));
  }, [router]);

  /** 分享：真正写剪贴板；失败降级为可见链接提示 */
  const share = useCallback(async (skill: SkillItem) => {
    const path = `/skills#${encodeURIComponent(skill.id)}`;
    const url = typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setToast(`已复制分享链接：${skill.name}`);
        return;
      }
      throw new Error('clipboard unavailable');
    } catch {
      try {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(input);
        setToast(ok ? `已复制分享链接：${skill.name}` : `分享链接：${url}`);
      } catch {
        setToast(`分享链接：${url}`);
      }
    }
  }, []);

  const toggleFavorite = useCallback((skill: SkillItem) => {
    updateFavorites(prev => {
      const next = { ...prev };
      if (next[skill.id]) delete next[skill.id];
      else next[skill.id] = true;
      return next;
    });
  }, [updateFavorites]);

  const createSkill = () => {
    if (!draft.name.trim()) {
      setToast('先给技能起个名字');
      return;
    }
    const next: MySkill = { ...draft, id: `s${Date.now()}`, name: draft.name.trim() };
    const list = [next, ...mine];
    setMine(list);
    saveMySkills(list);
    setDraft({ id: '', name: '', desc: '', category: '通用', prompt: '' });
    setCreating(false);
    setTab('created');
    setToast(`已创建技能「${next.name}」`);
  };

  const removeMine = (id: string) => {
    const list = mine.filter(m => `my-${m.id}` !== id);
    setMine(list);
    saveMySkills(list);
    setToast('已删除');
  };

  const favoriteCount = Object.keys(favorites).length;
  const createdCount = mine.length;

  return (
    <div className="xyq-skills">
      <div className="xyq-skills-inner">
        <header className="xyq-skills-head">
          <h1>技能</h1>
          <button type="button" className="xyq-skills-create" onClick={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5" /> 创建我的技能
          </button>
        </header>

        <div className="xyq-skills-tabs">
          {TABS.map((t, i) => (
            <span key={t.key} className="xyq-skills-tab-wrap">
              {i > 0 && t.key !== 'mine' && <span className="xyq-skills-sep" />}
              <button
                type="button"
                className={clsx('xyq-skills-tab', tab === t.key && 'is-on')}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === 'created' && createdCount > 0 && <em className="xyq-skills-count">{createdCount}</em>}
                {t.key === 'favorited' && favoriteCount > 0 && <em className="xyq-skills-count">{favoriteCount}</em>}
              </button>
            </span>
          ))}
        </div>

        <div className="xyq-skills-bar">
          <div className="xyq-skills-cats">
            {(['全部', ...SKILL_CATEGORIES] as const).map(c => (
              <button
                key={c}
                type="button"
                className={clsx('xyq-skills-cat', category === c && 'is-on')}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="xyq-skills-search">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索技能"
            />
            <Search className="w-3.5 h-3.5" />
          </label>
        </div>

        {items.length === 0 ? (
          <div className="xyq-skills-empty">
            <Sparkles className="w-8 h-8" strokeWidth={1.4} />
            <p>
              {tab === 'created' ? '还没有自己的技能'
                : tab === 'favorited' ? '还没有收藏的技能'
                  : tab === 'mine' ? '还没有自己的技能或收藏'
                    : '没有匹配的技能'}
            </p>
            <span>
              {tab === 'all'
                ? '换个关键词试试'
                : '点右上角「创建我的技能」存下常用提示词，或点卡片上的星标收藏'}
            </span>
          </div>
        ) : (
          <div className="xyq-skills-grid">
            {items.map(skill => (
              <article key={skill.id} className="xyq-skill-card">
                <button type="button" className="xyq-skill-open" onClick={() => setPreview(skill)}>
                  <span className="xyq-skill-cover" style={{ backgroundImage: `url(${skill.cover})` }}>
                    <span className="xyq-skill-cat">{skill.category}</span>
                    {skill.author === '我的' && <span className="xyq-skill-mine">我的</span>}
                  </span>
                </button>
                <div className="xyq-skill-body">
                  <h3>{skill.name}</h3>
                  <p>{skill.desc}</p>
                  <div className="xyq-skill-foot">
                    <button
                      type="button"
                      className="xyq-skill-mini"
                      title="复制分享链接"
                      onClick={() => void share(skill)}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className={clsx('xyq-skill-mini', favorites[skill.id] && 'is-star')}
                      title={favorites[skill.id] ? '取消收藏' : '收藏'}
                      aria-pressed={Boolean(favorites[skill.id])}
                      onClick={() => toggleFavorite(skill)}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    {skill.author === '我的' ? (
                      <button type="button" className="xyq-skill-del" onClick={() => removeMine(skill.id)}>
                        删除
                      </button>
                    ) : (
                      <button type="button" className="xyq-skill-try" onClick={() => tryIt(skill)}>
                        试试看
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="xyq-skills-tip">
          <Sparkles className="w-3.5 h-3.5" />
          点「试试看」会把技能提示词和参数带进首页输入坞；收藏与自建技能都存在本机浏览器里，刷新不丢。
        </footer>
      </div>

      {/* 技能详情 */}
      {preview && (
        <div className="xyq-skill-modal" onClick={() => setPreview(null)} role="presentation">
          <div className="xyq-skill-modal-box" onClick={e => e.stopPropagation()}>
            <button type="button" className="xyq-skill-modal-close" onClick={() => setPreview(null)} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
            <div className="xyq-skill-modal-cover" style={{ backgroundImage: `url(${preview.cover})` }} />
            <div className="xyq-skill-modal-info">
              <span className="xyq-skill-cat is-inline">{preview.category}</span>
              <h3>{preview.name}</h3>
              <p>{preview.desc}</p>
              <dl>
                <div><dt>提示词</dt><dd>{preview.prompt}</dd></div>
                {preview.ratio && <div><dt>比例</dt><dd>{preview.ratio}</dd></div>}
                {preview.style && <div><dt>风格</dt><dd>{preview.style}</dd></div>}
                {preview.videoMode && <div><dt>视频方式</dt><dd>{preview.videoMode}</dd></div>}
                <div><dt>热度</dt><dd>{preview.uses}</dd></div>
                <div><dt>来源</dt><dd>{preview.author === '官方' ? '官方技能' : '我创建的'}</dd></div>
              </dl>
              <div className="xyq-skill-modal-actions">
                <button
                  type="button"
                  className={clsx('xyq-skill-modal-fav', favorites[preview.id] && 'is-on')}
                  onClick={() => toggleFavorite(preview)}
                >
                  <Star className="w-3.5 h-3.5" />
                  {favorites[preview.id] ? '已收藏' : '收藏'}
                </button>
                <button
                  type="button"
                  className="xyq-skill-modal-share"
                  onClick={() => void share(preview)}
                >
                  <Share2 className="w-3.5 h-3.5" /> 分享
                </button>
              </div>
              <button
                type="button"
                className="xyq-skill-modal-try"
                onClick={() => { const s = preview; setPreview(null); tryIt(s); }}
              >
                试试看 <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建技能 */}
      {creating && (
        <div className="xyq-skill-modal" onClick={() => setCreating(false)} role="presentation">
          <div className="xyq-skill-modal-box is-form" onClick={e => e.stopPropagation()}>
            <button type="button" className="xyq-skill-modal-close" onClick={() => setCreating(false)} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
            <div className="xyq-skill-form">
              <h3>创建我的技能</h3>
              <label>
                <span>技能名</span>
                <input
                  value={draft.name}
                  maxLength={60}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="例如：我的产品图提示词"
                />
              </label>
              <label>
                <span>分类</span>
                <select
                  value={draft.category}
                  onChange={e => setDraft(d => ({ ...d, category: e.target.value as SkillCategory }))}
                >
                  {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>
                <span>一句话说明</span>
                <input
                  value={draft.desc}
                  maxLength={100}
                  onChange={e => setDraft(d => ({ ...d, desc: e.target.value }))}
                  placeholder="这个技能是做什么的"
                />
              </label>
              <label>
                <span>提示词</span>
                <textarea
                  value={draft.prompt}
                  onChange={e => setDraft(d => ({ ...d, prompt: e.target.value }))}
                  placeholder="存下你常用的那段提示词，以后一键复用"
                  rows={4}
                />
              </label>
              <div className="xyq-skill-form-actions">
                <button type="button" className="is-ghost" onClick={() => setCreating(false)}>取消</button>
                <button type="button" className="is-primary" onClick={createSkill}>
                  <Check className="w-3.5 h-3.5" /> 保存技能
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="xyq-skills-toast">{toast}</div>}
    </div>
  );
}
