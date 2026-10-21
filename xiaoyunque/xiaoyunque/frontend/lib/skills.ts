/* 技能汇总查询入口
   把两处技能来源（技能库 config/skills.ts + 首页场景卡 config/scenes.ts）合成一个查询视图，
   避免跨页引用时各写一遍 find/filter。 */

import { SKILLS, findSkill as findSkillInLibrary, type SkillItem } from '@/config/skills';
import { SCENES, type SceneSkill, type SceneSkillIcon, type SceneTone } from '@/config/scenes';

export type { SkillItem, SceneSkill, SceneSkillIcon, SceneTone };
export { SKILLS };

/** 场景技能卡的统一形态（与 SkillItem 解耦，但保留同一批参数） */
export interface UnifiedSkill {
  id: string;
  name: string;
  desc: string;
  prompt: string;
  category: string;
  ratio?: string;
  style?: string;
  videoMode?: 'first_frame' | 'start_end_frame' | 'reference';
  /** 来源：场景卡 or 技能库 */
  from: 'scene' | 'library';
}

function fromSceneSkill(skill: SceneSkill, sceneLabel: string): UnifiedSkill {
  return {
    id: skill.id,
    name: skill.label,
    desc: skill.hint,
    prompt: skill.prompt,
    category: sceneLabel,
    ratio: skill.ratio,
    style: skill.style,
    videoMode: skill.videoMode,
    from: 'scene',
  };
}

/** 全部技能（场景卡优先，技能库补充同 id 覆盖） */
export function allSkills(): UnifiedSkill[] {
  const map = new Map<string, UnifiedSkill>();
  SCENES.forEach(scene => {
    scene.skills.forEach(skill => {
      const id = `${scene.id}:${skill.id}`;
      map.set(id, fromSceneSkill(skill, scene.label));
    });
  });
  SKILLS.forEach(skill => {
    map.set(`library:${skill.id}`, {
      id: skill.id,
      name: skill.name,
      desc: skill.desc,
      prompt: skill.prompt,
      category: skill.category,
      ratio: skill.ratio,
      style: skill.style,
      videoMode: skill.videoMode,
      from: 'library',
    });
  });
  return [...map.values()];
}

/**
 * 按 id 查技能。优先精确匹配技能库 id，其次匹配「场景:技能」组合，
 * 最后退化为按 name/label 模糊匹配，让深链尽量能解析出内容。
 */
export function findSkill(id: string): UnifiedSkill | null {
  const key = String(id || '').trim();
  if (!key) return null;

  const direct = findSkillInLibrary(key);
  if (direct) return {
    id: direct.id,
    name: direct.name,
    desc: direct.desc,
    prompt: direct.prompt,
    category: direct.category,
    ratio: direct.ratio,
    style: direct.style,
    videoMode: direct.videoMode,
    from: 'library',
  };

  for (const scene of SCENES) {
    const hit = scene.skills.find(s => `${scene.id}:${s.id}` === key || s.id === key);
    if (hit) return fromSceneSkill(hit, scene.label);
  }

  const fuzzy = SKILLS.find(s => s.name === key) || null;
  if (fuzzy) return {
    id: fuzzy.id,
    name: fuzzy.name,
    desc: fuzzy.desc,
    prompt: fuzzy.prompt,
    category: fuzzy.category,
    ratio: fuzzy.ratio,
    style: fuzzy.style,
    videoMode: fuzzy.videoMode,
    from: 'library',
  };
  return null;
}

export type { SkillItem as LibrarySkillItem };
