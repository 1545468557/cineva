'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, Search, Send, Sparkles, Zap } from 'lucide-react';
import { SKILLS } from '@/config/skills';
import { buildHomeUrl, putDraftHandoff, putSkillHandoff } from '@/lib/handoff';
import './global-dock.css';

export default function GlobalDock() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [skillId, setSkillId] = useState('');
  const [skillQuery, setSkillQuery] = useState('');

  const skillPool = SKILLS.filter(s =>
    !skillQuery.trim() ? true : s.name.toLowerCase().includes(skillQuery.trim().toLowerCase()),
  ).slice(0, 12);

  const pickSkill = (id: string) => {
    const skill = SKILLS.find(s => s.id === id);
    if (!skill) return;
    setSkillId(id);
    setText(skill.prompt);
  };

  const submit = useCallback(() => {
    const value = text.trim();
    if (!value) return;
    const skill = SKILLS.find(s => s.id === skillId);
    if (skill) {
      putSkillHandoff({
        prompt: value,
        name: skill.name,
        skillId: skill.id,
        ratio: skill.ratio,
        style: skill.style,
        videoMode: skill.videoMode,
      });
    } else {
      putDraftHandoff(value, 'dock');
    }
    router.push(buildHomeUrl({ text: value }));
    setText('');
    setSkillId('');
  }, [router, text, skillId]);

  return (
    <div className={clsx('gd-wrap', open && 'is-open')}>
      {open && (
        <div className="gd-panel">
          <div className="gd-panel-row">
            <span className="gd-panel-label"><Zap className="w-3.5 h-3.5" /> 技能</span>
            <label className="gd-panel-search">
              <Search className="w-3 h-3" />
              <input
                value={skillQuery}
                onChange={e => setSkillQuery(e.target.value)}
                placeholder="搜索技能"
              />
            </label>
          </div>
          <div className="gd-panel-row">
            <div className="gd-panel-chips">
              {skillPool.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={clsx('gd-chip', skillId === s.id && 'is-on')}
                  onClick={() => pickSkill(s.id)}
                >
                  {s.name}
                </button>
              ))}
              {skillPool.length === 0 && <span className="gd-panel-empty">没有匹配的技能</span>}
            </div>
          </div>
        </div>
      )}

      <div className="gd-bar">
        <button
          type="button"
          className="gd-toggle"
          onClick={() => setOpen(o => !o)}
          title={open ? '收起技能' : '展开技能'}
          aria-expanded={open}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="描述你的创作需求…"
        />
        <button type="button" className="gd-send" onClick={submit} title="开始创作" disabled={!text.trim()}>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
