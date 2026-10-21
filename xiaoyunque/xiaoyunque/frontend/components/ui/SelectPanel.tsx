'use client';

import React from 'react';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  badgeTone?: 'new' | 'best' | 'hot';
  preview?: React.ReactNode;
}

export interface SegmentedTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>;

/* ─── 分段切换（参考图里的 图片 / 视频 / 音频 那一排） ─── */
export function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: SegmentedTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="xyq-seg" role="tablist">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isOn = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isOn}
            className={clsx('xyq-seg-item', isOn && 'is-on')}
            onClick={() => onChange(tab.id)}
          >
            {Icon ? <Icon className="w-4 h-4" /> : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── 单个选项行：图标块 + 名称 + 徽标 + 说明 + 选中标记 ─── */
export function OptionRow({
  option,
  selected,
  onSelect,
  icon: Icon,
  compact,
}: {
  option: SelectOption;
  selected: boolean;
  onSelect: (id: string) => void;
  icon?: IconType;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={clsx('xyq-option', selected && 'is-selected', compact && 'is-compact')}
      onClick={() => onSelect(option.id)}
    >
      {option.preview ? (
        <span className="xyq-option-preview">{option.preview}</span>
      ) : Icon ? (
        <span className="xyq-option-icon">
          <Icon className="w-4 h-4" strokeWidth={1.7} />
        </span>
      ) : null}
      <span className="xyq-option-body">
        <span className="xyq-option-head">
          <span className="xyq-option-label">{option.label}</span>
          {option.badge ? (
            <span className={clsx('xyq-option-badge', option.badgeTone && `is-${option.badgeTone}`)}>
              {option.badge}
            </span>
          ) : null}
        </span>
        {option.description ? <span className="xyq-option-desc">{option.description}</span> : null}
      </span>
      {selected ? <Check className="xyq-option-check" strokeWidth={2.2} /> : null}
    </button>
  );
}

/* ─── 二级选择器：折叠一行，展开后是模型 / 选项列表 ─── */
export function SubSelect({
  icon: Icon,
  title,
  valueLabel,
  expanded,
  onToggle,
  children,
}: {
  icon?: IconType;
  title: string;
  valueLabel: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx('xyq-sub-select', expanded && 'is-open')}>
      <button type="button" className="xyq-sub-select-head" onClick={onToggle} aria-expanded={expanded}>
        {Icon ? (
          <span className="xyq-option-icon">
            <Icon className="w-4 h-4" strokeWidth={1.7} />
          </span>
        ) : null}
        <span className="xyq-option-body">
          <span className="xyq-option-head">
            <span className="xyq-option-label">{title}</span>
          </span>
          <span className="xyq-option-desc">{valueLabel}</span>
        </span>
        <ChevronDown className={clsx('xyq-sub-select-chevron', expanded && 'is-open')} strokeWidth={2} />
      </button>
      {expanded ? <div className="xyq-sub-select-body">{children}</div> : null}
    </div>
  );
}

/* ─── 下拉选单面板外壳 ─── */
export default function SelectPanel({
  open,
  onClose,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  children,
  footer,
  width = 460,
  align = 'left',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  tabs?: SegmentedTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  align?: 'left' | 'right';
}) {
  if (!open) return null;
  return (
    <>
      <div className="xyq-panel-backdrop" onClick={onClose} />
      <div
        className={clsx('xyq-select-panel', align === 'right' && 'is-right')}
        style={{ width }}
        role="dialog"
        aria-label={title}
      >
        <div className="xyq-select-panel-head">
          <span className="xyq-select-panel-title">{title}</span>
          {subtitle ? <span className="xyq-select-panel-subtitle">{subtitle}</span> : null}
        </div>
        {tabs && tabs.length > 0 && activeTab && onTabChange ? (
          <SegmentedTabs tabs={tabs} active={activeTab} onChange={onTabChange} />
        ) : null}
        <div className="xyq-select-panel-body">{children}</div>
        {footer ? <div className="xyq-select-panel-foot">{footer}</div> : null}
      </div>
    </>
  );
}
