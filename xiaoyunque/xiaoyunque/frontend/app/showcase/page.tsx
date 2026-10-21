'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Heart, Loader2, Play, Search, Sparkles, Star, UploadCloud, Wand2, X,
} from 'lucide-react';
import {
  WORKS, WORK_CATEGORIES, formatLikes, loadMyWorks, saveMyWorks,
  type WorkCategory, type WorkItem,
} from '@/config/showcase';
import { ALL_OPEN_WORKS, openWorkStats, type OpenWork } from '@/config/openWorks';
import { buildHomeUrl, putRemakeHandoff, putSkillHandoff } from '@/lib/handoff';
import { LS, useLocalStore } from '@/lib/localStore';
import './showcase.css';

export default function ShowcasePage() {
  const router = useRouter();
  const [category, setCategory] = useState<'全部' | WorkCategory>('全部');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState<WorkItem[]>([]);
  const [preview, setPreview] = useState<WorkItem | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ title: '', desc: '', category: '短剧' as WorkCategory, cover: '/cases/short-drama/067.jpg' });
  const [openWork, setOpenWork] = useState<OpenWork | null>(null);
  const [toast, setToast] = useState('');
  const { value: likes, update: updateLikes } = useLocalStore<Record<string, number>>(LS.workLikes, {});

  useEffect(() => {
    setMine(loadMyWorks());
    setLoading(false);
  }, []);

  /** 从项目画布「发布」带过来的预填 + `?publish=1` 直接打开发布弹窗 */
  useEffect(() => {
    let prefill: { title?: string; desc?: string } | null = null;
    try {
      const raw = window.sessionStorage.getItem('cineva.showcase.prefill');
      if (raw) {
        prefill = JSON.parse(raw);
        window.sessionStorage.removeItem('cineva.showcase.prefill');
      }
    } catch {
      /* 忽略 */
    }
    if (prefill) {
      setDraft(prev => ({
        ...prev,
        title: String(prefill?.title || prev.title).slice(0, 20),
        desc: String(prefill?.desc || prev.desc).slice(0, 100),
      }));
    }
    const shouldPublish = new URLSearchParams(window.location.search).get('publish') === '1';
    if (shouldPublish) setPublishing(true);
    if (shouldPublish || prefill) {
      router.replace('/showcase', { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreview(null);
        setPublishing(false);
        setOpenWork(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /**
   * 拍同款：把开源作品的角色 + 提示词 + 参数带进首页输入坞。
   * handoff（即时消费）+ query（可分享/可后退重放）双通道。
   */
  const remake = useCallback((work: OpenWork) => {
    putSkillHandoff({
      prompt: work.remakePrompt,
      name: `拍同款 · ${work.title}`,
      skillId: `open-work:${work.id}`,
    });
    putRemakeHandoff({
      id: work.id,
      title: work.title,
      characters: work.characters,
      styleLock: work.styleLock,
      ratio: work.ratio,
      remakePrompt: work.remakePrompt,
    });
    router.push(buildHomeUrl({ remakeId: work.id, text: work.remakePrompt }));
  }, [router]);

  /** 普通作品也支持「用同样的思路做一个」 */
  const remakeFromWork = useCallback((work: WorkItem) => {
    const prompt = `${work.title}：${work.desc}（参考参数 ${work.params}）`;
    putSkillHandoff({ prompt, name: `参考 · ${work.title}`, skillId: `work:${work.id}` });
    router.push(buildHomeUrl({ text: prompt }));
  }, [router]);

  const all = useMemo<WorkItem[]>(() => [...mine, ...WORKS], [mine]);

  const items = useMemo(() => {
    let list = all;
    if (category !== '全部') list = list.filter(w => w.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(w =>
        w.title.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q) || w.author.toLowerCase().includes(q),
      );
    }
    return list;
  }, [all, category, query]);

  /** 点赞：本机持久化（存的是「额外点赞数」偏移，避免演示基数被覆盖） */
  const toggleLike = useCallback((id: string) => {
    updateLikes(prev => {
      const next = { ...prev };
      const current = next[id] ?? 0;
      if (current > 0) delete next[id];
      else next[id] = 1;
      return next;
    });
  }, [updateLikes]);

  const publish = () => {
    if (!draft.title.trim()) {
      setToast('先给作品起个名字');
      return;
    }
    const item: WorkItem = {
      id: `my-${Date.now()}`,
      title: draft.title.trim(),
      desc: draft.desc.trim() || '我自己发布的作品',
      cover: draft.cover,
      category: draft.category,
      author: '我',
      likes: 0,
      params: '本机发布',
      createdAt: '刚刚',
      mine: true,
    };
    const list = [item, ...mine];
    setMine(list);
    saveMyWorks(list);
    setDraft({ title: '', desc: '', category: '短剧', cover: '/cases/short-drama/067.jpg' });
    setPublishing(false);
    setCategory('全部');
    setToast(`已发布「${item.title}」`);
  };

  const removeMine = (id: string) => {
    const list = mine.filter(m => m.id !== id);
    setMine(list);
    saveMyWorks(list);
    setPreview(null);
    setToast('已删除');
  };

  return (
    <div className="xyq-showcase">
      <div className="xyq-showcase-inner">
        <header className="xyq-showcase-head">
          <div>
            <h1>作品社区</h1>
            <p>看看别人做了什么，找点灵感</p>
          </div>
          <button type="button" className="xyq-showcase-publish" onClick={() => setPublishing(true)}>
            <UploadCloud className="w-3.5 h-3.5" /> 发布作品
          </button>
        </header>

        <div className="xyq-showcase-bar">
          <div className="xyq-showcase-cats">
            {(['全部', ...WORK_CATEGORIES] as const).map(c => (
              <button
                key={c}
                type="button"
                className={clsx('xyq-showcase-cat', category === c && 'is-on')}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="xyq-showcase-search">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索作品 / 作者" />
            <Search className="w-3.5 h-3.5" />
          </label>
        </div>

        {/* 真实开源作品：别人完整开源的作品包（角色图 + 分镜 + 提示词 + 成片） */}
        <section className="xyq-open">
          <div className="xyq-open-head">
            <h2>开源作品包</h2>
            <span>
              真实开源 · {openWorkStats().works} 个作品 / {openWorkStats().shots} 个镜头 / {openWorkStats().chars} 张角色图 / {openWorkStats().frames} 张关键帧
            </span>
          </div>
          <div className="xyq-open-grid">
            {ALL_OPEN_WORKS.map(work => (
              <article key={work.id} className="xyq-open-card">
                <button type="button" className="xyq-open-cover" style={{ backgroundImage: `url(${work.cover})` }} onClick={() => setOpenWork(work)}>
                  <span className="xyq-open-badge">开源</span>
                  {work.video && <span className="xyq-work-play"><Play className="w-4 h-4" strokeWidth={2.2} /></span>}
                </button>
                <div className="xyq-open-body">
                  <h3>{work.title} <em>{work.titleEn}</em></h3>
                  <p>{work.logline.slice(0, 62)}…</p>
                  <div className="xyq-open-meta">
                    <span>{work.category}</span>
                    <span>{work.ratio}</span>
                    <span>{work.durationText}</span>
                  </div>
                  <div className="xyq-open-actions">
                    <button type="button" className="xyq-open-detail" onClick={() => setOpenWork(work)}>看细节</button>
                    <button type="button" className="xyq-open-remake" onClick={() => remake(work)}>
                      <Wand2 className="w-3.5 h-3.5" /> 拍同款
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="xyq-showcase-empty">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="xyq-showcase-empty">
            <Sparkles className="w-8 h-8" strokeWidth={1.4} />
            <p>这个分类下还没有作品</p>
            <span>换个分类，或者点右上角发布你自己的</span>
          </div>
        ) : (
          <div className="xyq-showcase-grid">
            {items.map(work => {
              const liked = Boolean(likes[work.id]);
              return (
                <article key={work.id} className="xyq-work">
                  <button type="button" className="xyq-work-open" onClick={() => setPreview(work)}>
                    <span className="xyq-work-cover" style={{ backgroundImage: `url(${work.cover})` }}>
                      <span className="xyq-work-cat">{work.category}</span>
                      {work.mine && <span className="xyq-work-mine">我的</span>}
                      <span className="xyq-work-play"><Play className="w-4 h-4" strokeWidth={2.2} /></span>
                    </span>
                  </button>
                  <div className="xyq-work-meta">
                    <h3>{work.title}</h3>
                    <p>{work.desc}</p>
                    <div className="xyq-work-foot">
                      <span className="xyq-work-author">{work.author}</span>
                      <span className="xyq-work-params">{work.params}</span>
                      <button
                        type="button"
                        className={clsx('xyq-work-like', liked && 'is-on')}
                        onClick={() => toggleLike(work.id)}
                        title={liked ? '取消喜欢' : '喜欢'}
                        aria-pressed={liked}
                      >
                        <Heart className="w-3.5 h-3.5" />
                        {formatLikes(work.likes + (liked ? 1 : 0))}
                      </button>
                    </div>
                    <div className="xyq-work-actions">
                      <button type="button" className="xyq-work-try" onClick={() => remakeFromWork(work)}>
                        <Wand2 className="w-3.5 h-3.5" /> 用同样的思路做一个
                      </button>
                      {work.mine && (
                        <button type="button" className="xyq-work-del" onClick={() => removeMine(work.id)}>
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="xyq-showcase-tip">
          <Star className="w-3.5 h-3.5" />
          示例作品用于展示产品能力；你的点赞与发布存在本机浏览器里，刷新不丢。
        </footer>
      </div>

      {preview && (
        <div className="xyq-showcase-modal" onClick={() => setPreview(null)} role="presentation">
          <div className="xyq-showcase-modal-box" onClick={e => e.stopPropagation()}>
            <button type="button" className="xyq-showcase-modal-close" onClick={() => setPreview(null)} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
            <div className="xyq-showcase-modal-cover" style={{ backgroundImage: `url(${preview.cover})` }}>
              <span className="xyq-work-play is-big"><Play className="w-6 h-6" strokeWidth={2.2} /></span>
            </div>
            <div className="xyq-showcase-modal-info">
              <span className="xyq-work-cat is-inline">{preview.category}</span>
              <h3>{preview.title}</h3>
              <p>{preview.desc}</p>
              <dl>
                <div><dt>作者</dt><dd>{preview.author}</dd></div>
                <div><dt>参数</dt><dd>{preview.params}</dd></div>
                <div><dt>喜欢</dt><dd>{formatLikes(preview.likes + (likes[preview.id] ? 1 : 0))}</dd></div>
                <div><dt>发布</dt><dd>{preview.createdAt}</dd></div>
              </dl>
              <button
                type="button"
                className="xyq-showcase-modal-try"
                onClick={() => { const w = preview; setPreview(null); remakeFromWork(w); }}
              >
                用同样的思路做一个
              </button>
            </div>
          </div>
        </div>
      )}

      {openWork && (
        <div className="xyq-ow-modal" onClick={() => setOpenWork(null)} role="presentation">
          <div className="xyq-ow-box" onClick={e => e.stopPropagation()}>
            <button type="button" className="xyq-showcase-modal-close" onClick={() => setOpenWork(null)} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>

            <header className="xyq-ow-head">
              <span className="xyq-open-badge is-inline">开源作品包</span>
              <h2>{openWork.title} <em>{openWork.titleEn}</em></h2>
              <p>{openWork.logline}</p>
              <div className="xyq-ow-facts">
                <span>作者 {openWork.author}</span>
                <span>{openWork.ratio}</span>
                <span>{openWork.durationText}</span>
                <span className="xyq-ow-src">{openWork.source}</span>
              </div>
            </header>

            <div className="xyq-ow-body">
              {openWork.video && (
                <section className="xyq-ow-sec">
                  <h4>成片</h4>
                  <video className="xyq-ow-video" src={openWork.video} controls preload="metadata" />
                </section>
              )}

              <section className="xyq-ow-sec">
                <h4>角色设定图 <span>{openWork.characters.length} 张</span></h4>
                <div className="xyq-ow-chars">
                  {openWork.characters.map(c => (
                    <figure key={c.name}>
                      <span className="xyq-ow-char-img" style={{ backgroundImage: `url(${c.image})` }} />
                      <figcaption>
                        <b>{c.name}</b>
                        <span>{c.desc}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>

              <section className="xyq-ow-sec">
                <h4>关键帧 <span>{openWork.keyframes.length} 张</span></h4>
                <div className="xyq-ow-frames">
                  {openWork.keyframes.map(k => (
                    <span key={k.id} className="xyq-ow-frame" style={{ backgroundImage: `url(${k.image})` }}>
                      <i>{k.id} · {k.label}</i>
                    </span>
                  ))}
                </div>
              </section>

              <section className="xyq-ow-sec">
                <h4>分镜表 <span>{openWork.beats.reduce((n, b) => n + b.shots.length, 0)} 个镜头</span></h4>
                <div className="xyq-ow-beats">
                  {openWork.beats.map((b, bi) => (
                    <div key={b.id} className="xyq-ow-beat">
                      <div className="xyq-ow-beat-head">
                        <b>{String(bi + 1).padStart(2, '0')} · {b.title}</b>
                        <em>{b.titleEn}</em>
                      </div>
                      <p className="xyq-ow-narration">旁白：{b.narration}</p>
                      {b.shots.map(s => (
                        <div key={s.id} className="xyq-ow-shot">
                          {s.frame && <span className="xyq-ow-shot-img" style={{ backgroundImage: `url(${s.frame})` }} />}
                          <div className="xyq-ow-shot-info">
                            <div className="xyq-ow-shot-top">
                              <code>{s.id}</code>
                              <span>{s.type}</span>
                              <span>{s.duration}s</span>
                              <span>{s.camera}</span>
                              {s.impact && <span className="xyq-ow-impact">冲击缩放</span>}
                            </div>
                            <p>{s.scene}</p>
                            {s.refs.length > 0 && (
                              <div className="xyq-ow-refs">参考图：{s.refs.join(' + ')}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              <section className="xyq-ow-sec">
                <h4>风格锁定 / 角色锁定</h4>
                <div className="xyq-ow-locks">
                  <div><b>Style lock</b><p>{openWork.styleLock}</p></div>
                  <div><b>Character lock</b><p>{openWork.characterLock}</p></div>
                </div>
              </section>
            </div>

            <footer className="xyq-ow-foot">
              <span>素材与提示词来自开源仓库，已落到本机 /public/works/</span>
              <button type="button" className="xyq-open-remake" onClick={() => { const w = openWork; setOpenWork(null); remake(w); }}>
                <Wand2 className="w-3.5 h-3.5" /> 拍同款
              </button>
            </footer>
          </div>
        </div>
      )}

      {publishing && (
        <div className="xyq-showcase-modal" onClick={() => setPublishing(false)} role="presentation">
          <div className="xyq-showcase-modal-box is-form" onClick={e => e.stopPropagation()}>
            <button type="button" className="xyq-showcase-modal-close" onClick={() => setPublishing(false)} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
            <div className="xyq-showcase-form">
              <h3>发布作品</h3>
              <label>
                <span>标题</span>
                <input value={draft.title} maxLength={20} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="给你的作品起个名字" />
              </label>
              <label>
                <span>分类</span>
                <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value as WorkCategory }))}>
                  {WORK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>
                <span>一句话说明</span>
                <input value={draft.desc} maxLength={100} onChange={e => setDraft(d => ({ ...d, desc: e.target.value }))} placeholder="这个作品是什么" />
              </label>
              <label>
                <span>封面</span>
                <div className="xyq-showcase-covers">
                  {['/cases/short-drama/067.jpg', '/cases/animation/081.jpg', '/cases/ecommerce/060.jpg', '/cases/portrait/240.jpg', '/cases/motion/011.jpg', '/cases/free/079.jpg'].map(src => (
                    <button
                      key={src}
                      type="button"
                      className={clsx('xyq-showcase-cover-pick', draft.cover === src && 'is-on')}
                      style={{ backgroundImage: `url(${src})` }}
                      onClick={() => setDraft(d => ({ ...d, cover: src }))}
                      aria-label="选择封面"
                    />
                  ))}
                </div>
              </label>
              <div className="xyq-showcase-form-actions">
                <button type="button" className="is-ghost" onClick={() => setPublishing(false)}>取消</button>
                <button type="button" className="is-primary" onClick={publish}>发布</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="xyq-showcase-toast">{toast}</div>}
    </div>
  );
}
