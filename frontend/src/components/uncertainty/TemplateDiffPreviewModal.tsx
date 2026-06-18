'use client';

import React from 'react';
import { Modal, Button, Space, Tag } from 'antd';
import type { UncertaintyTemplate } from './UncertaintyListTable';
import mockDiffData from '../../../mock/uncertainty-diff.json';

// ===== 型定義 =====

type ChangeType = 'same' | 'changed' | 'added';
type FieldType = 'text' | 'namespace' | 'scope' | 'textarea' | 'evalBadge' | 'specTag' | 'dateRange' | 'date' | 'extends';

interface ScopeValue {
  company: string;
  dept: string;
}

interface DateRangeValue {
  from: string | null;
  to: string | null;
}

interface DiffField {
  fieldKey: string;
  label: string;
  required: boolean;
  changeType: ChangeType;
  type: FieldType;
  oldValue: string | ScopeValue | DateRangeValue | null;
  newValue: string | ScopeValue | DateRangeValue | null;
}

interface DiffSection {
  label: string;
  num: string;
  fields: DiffField[];
}

interface DiffData {
  templateKey: string;
  templateName: string;
  savedVersion: string;
  savedAt: string;
  summary: {
    changed: number;
    added: number;
    same: number;
  };
  sections: DiffSection[];
}

interface TemplateDiffPreviewModalProps {
  open: boolean;
  template: UncertaintyTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

// ===== カラー定数 =====
const COLOR = {
  changedBg: '#fffbe6',
  changedBorder: '#faad14',
  addedBg: '#f6ffed',
  addedBorder: '#52c41a',
  sameBg: '#fafafa',
  delText: '#cf1322',
  addText: '#389e0d',
};

// ===== サブコンポーネント =====

/** フィールドラベル */
function FieldLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 2 }}>
      {label}
      {required && <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>}
    </div>
  );
}

/** 変更マーカーバッジ */
function ChangeMarker({ type }: { type: 'del' | 'add' | 'new' }) {
  const styleMap = {
    del: { background: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e', label: '〜 変更前' },
    add: { background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', label: '✓ 変更後' },
    new: { background: '#e6fffb', color: '#08979c', border: '1px solid #87e8de', label: '＋ 新規追加' },
  };
  const s = styleMap[type];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        fontWeight: 700,
        padding: '1px 6px',
        borderRadius: 8,
        marginLeft: 'auto',
        flexShrink: 0,
        ...s,
      }}
    >
      {s.label}
    </span>
  );
}

/** テキスト値の表示 */
function TextValue({
  value,
  highlight,
}: {
  value: string | null;
  highlight?: 'del' | 'add';
}) {
  if (value === null || value === '') {
    return <span style={{ color: '#bbb', fontStyle: 'italic', fontSize: 12 }}>— 未設定 —</span>;
  }
  if (highlight === 'del') {
    return (
      <span
        style={{
          background: '#fff1f0',
          padding: '0 3px',
          borderRadius: 3,
          borderBottom: '2px solid #ff4d4f',
          color: COLOR.delText,
          textDecoration: 'line-through',
          fontSize: 12,
        }}
      >
        {value}
      </span>
    );
  }
  if (highlight === 'add') {
    return (
      <span
        style={{
          background: '#f6ffed',
          padding: '0 3px',
          borderRadius: 3,
          borderBottom: `2px solid ${COLOR.addedBorder}`,
          color: COLOR.addText,
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    );
  }
  return <span style={{ fontSize: 13, color: '#222' }}>{value}</span>;
}

/** 名前空間URL表示 */
function NamespaceValue({ value }: { value: string | null }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontFamily: '"Consolas","Monaco",monospace',
        color: '#4a6fa5',
        wordBreak: 'break-all',
        padding: '3px 8px',
        background: '#f6f8fa',
        borderRadius: 4,
      }}
    >
      {value ?? '—'}
    </span>
  );
}

/** スコープパス表示 */
function ScopeValue({
  value,
  highlight,
}: {
  value: ScopeValue | null;
  highlight?: 'del' | 'add';
}) {
  if (!value) return <span style={{ color: '#bbb', fontStyle: 'italic' }}>—</span>;

  const deptStyle =
    highlight === 'del'
      ? { background: '#fff1f0', borderColor: '#ffa39e', color: COLOR.delText }
      : highlight === 'add'
        ? { background: '#f6ffed', borderColor: '#b7eb8f', color: COLOR.addText, fontWeight: 700 as const }
        : {};

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' as const, fontSize: 12 }}>
      <span
        style={{
          padding: '2px 7px',
          borderRadius: 4,
          background: '#f0f4ff',
          color: '#1677ff',
          border: '1px solid #c9d6ff',
          fontSize: 11,
        }}
      >
        {value.company}
      </span>
      <span style={{ color: '#aaa', fontSize: 11 }}>/</span>
      <span
        style={{
          padding: '2px 7px',
          borderRadius: 4,
          background: '#f0f4ff',
          color: '#1677ff',
          border: '1px solid #c9d6ff',
          fontSize: 11,
          ...deptStyle,
        }}
      >
        {highlight === 'del' ? <s>{value.dept}</s> : value.dept}
      </span>
    </div>
  );
}

/** 評価方式バッジ */
function EvalBadge({ value }: { value: string | null }) {
  const isQuant = value === 'quantitative';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        ...(isQuant
          ? { background: '#e6f0ff', color: '#1677ff', border: '1px solid #91caff' }
          : { background: '#f9f0ff', color: '#722ed1', border: '1px solid #d3adf7' }),
      }}
    >
      {isQuant ? '定量（数値）' : '定性（選択肢）'}
    </span>
  );
}

/** スペックタグ（xsi:type / units / formatString） */
function SpecTagValue({
  specKey,
  value,
  highlight,
}: {
  specKey: string;
  value: string | null;
  highlight?: 'del' | 'add';
}) {
  const tagStyle =
    highlight === 'del'
      ? { background: COLOR.changedBg, borderColor: COLOR.changedBorder, color: '#7c5800' }
      : highlight === 'add'
        ? { background: COLOR.addedBg, borderColor: COLOR.addedBorder, color: '#237804' }
        : { background: '#f5f5f5', borderColor: '#e0e0e0', color: '#333' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 8px',
        borderRadius: 4,
        border: '1px solid',
        fontSize: 11,
        fontFamily: '"Consolas","Monaco",monospace',
        ...tagStyle,
      }}
    >
      <span style={{ color: '#888', marginRight: 2 }}>{specKey}:</span>
      {highlight === 'del' ? (
        <span style={{ textDecoration: 'line-through', color: COLOR.delText }}>{value}</span>
      ) : highlight === 'add' ? (
        <span style={{ fontWeight: 600, color: COLOR.addText }}>{value}</span>
      ) : (
        <span>{value}</span>
      )}
    </span>
  );
}

/** 日付範囲表示 */
function DateRangeValue({
  value,
  highlight,
}: {
  value: DateRangeValue | null;
  highlight?: 'del' | 'add';
}) {
  if (!value) return <span style={{ color: '#bbb', fontStyle: 'italic' }}>—</span>;

  const dateStyle = (changed: boolean): React.CSSProperties =>
    changed
      ? highlight === 'del'
        ? {
            background: COLOR.changedBg,
            padding: '1px 5px',
            borderRadius: 3,
            borderBottom: `2px solid ${COLOR.changedBorder}`,
            textDecoration: 'line-through',
            color: COLOR.delText,
          }
        : {
            background: COLOR.addedBg,
            padding: '1px 5px',
            borderRadius: 3,
            borderBottom: `2px solid ${COLOR.addedBorder}`,
            fontWeight: 600,
            color: COLOR.addText,
          }
      : {};

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span
        style={{
          fontFamily: '"Consolas","Monaco",monospace',
          fontSize: 12,
          ...dateStyle(!!highlight),
        }}
      >
        {value.from ?? '未設定'}
      </span>
      <span style={{ color: '#aaa' }}>→</span>
      <span
        style={{
          fontFamily: '"Consolas","Monaco",monospace',
          fontSize: 12,
          ...(value.to ? dateStyle(!!highlight) : { color: '#bbb', fontStyle: 'italic' }),
        }}
      >
        {value.to ?? '(未設定)'}
      </span>
    </div>
  );
}

/** 継承元テンプレート表示 */
function ExtendsValue({ value }: { value: string | null }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontFamily: '"Consolas","Monaco",monospace',
        padding: '3px 8px',
        background: '#f0f4ff',
        borderRadius: 4,
        color: '#1677ff',
      }}
    >
      {value ?? '—'}
    </span>
  );
}

// ===== フィールド行レンダラー =====

function renderFieldValue(field: DiffField, side: 'old' | 'new') {
  const val = side === 'old' ? field.oldValue : field.newValue;
  const isChanged = field.changeType === 'changed';
  const isAdded = field.changeType === 'added';
  const highlight = isChanged ? (side === 'old' ? 'del' : 'add') : isAdded && side === 'new' ? 'add' : undefined;

  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <TextValue
          value={typeof val === 'string' ? val : null}
          highlight={highlight}
        />
      );
    case 'namespace':
      return <NamespaceValue value={typeof val === 'string' ? val : null} />;
    case 'scope':
      return (
        <ScopeValue
          value={val && typeof val === 'object' && 'company' in val ? (val as ScopeValue) : null}
          highlight={highlight}
        />
      );
    case 'evalBadge':
      return <EvalBadge value={typeof val === 'string' ? val : null} />;
    case 'specTag': {
      const specKeyMap: Record<string, string> = {
        xsiType: 'type',
        units: 'units',
        formatString: 'fmt',
      };
      return (
        <SpecTagValue
          specKey={specKeyMap[field.fieldKey] ?? field.fieldKey}
          value={typeof val === 'string' ? val : null}
          highlight={highlight}
        />
      );
    }
    case 'dateRange':
      return (
        <DateRangeValue
          value={val && typeof val === 'object' && 'from' in val ? (val as DateRangeValue) : null}
          highlight={highlight}
        />
      );
    case 'date':
      return (
        <TextValue
          value={typeof val === 'string' ? val : null}
          highlight={highlight}
        />
      );
    case 'extends':
      return <ExtendsValue value={typeof val === 'string' ? val : null} />;
    default:
      return <TextValue value={typeof val === 'string' ? val : null} />;
  }
}

/** 1フィールド行（左右2セル） */
function DiffFieldRow({ field }: { field: DiffField }) {
  const isChanged = field.changeType === 'changed';
  const isAdded = field.changeType === 'added';

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    borderBottom: '1px solid #f0f0f0',
    minHeight: 52,
    ...(isChanged
      ? {
          background: `linear-gradient(90deg, ${COLOR.changedBg} 0%, ${COLOR.changedBg} 50%, ${COLOR.addedBg} 50%, ${COLOR.addedBg} 100%)`,
        }
      : isAdded
        ? {
            background: `linear-gradient(90deg, #fafafa 0%, #fafafa 50%, ${COLOR.addedBg} 50%, ${COLOR.addedBg} 100%)`,
          }
        : {}),
  };

  const oldCellStyle: React.CSSProperties = {
    padding: '10px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    borderRight: '2px solid #e8e8e8',
    ...(isChanged
      ? { background: COLOR.changedBg, borderLeft: `3px solid ${COLOR.changedBorder}` }
      : isAdded
        ? {
            background: 'repeating-linear-gradient(135deg, #f5f5f5 0px, #f5f5f5 4px, #fafafa 4px, #fafafa 10px)',
            opacity: 0.6,
          }
        : {}),
  };

  const newCellStyle: React.CSSProperties = {
    padding: '10px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    ...(isChanged || isAdded
      ? { background: COLOR.addedBg, borderLeft: `3px solid ${COLOR.addedBorder}` }
      : {}),
  };

  return (
    <div style={rowStyle}>
      {/* 旧値セル */}
      <div style={oldCellStyle}>
        <FieldLabel label={field.label} required={field.required} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {isAdded ? (
            <span style={{ color: '#bbb', fontStyle: 'italic', fontSize: 12 }}>— 未設定 —</span>
          ) : (
            renderFieldValue(field, 'old')
          )}
          {isChanged && <ChangeMarker type="del" />}
        </div>
      </div>
      {/* 新値セル */}
      <div style={newCellStyle}>
        <FieldLabel label={field.label} required={field.required} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {renderFieldValue(field, 'new')}
          {isChanged && <ChangeMarker type="add" />}
          {isAdded && <ChangeMarker type="new" />}
        </div>
      </div>
    </div>
  );
}

/** セクションヘッダー（sticky） */
function DiffSectionHeader({ label, num }: { label: string; num: string }) {
  const labelStyle: React.CSSProperties = {
    padding: '8px 22px',
    fontSize: 12,
    fontWeight: 700,
    color: '#555',
    background: '#f0f4ff',
    borderBottom: '1px solid #c9d6ff',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ ...labelStyle, borderRight: '2px solid #d9d9d9' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#1677ff',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {num}
        </span>
        {label}
      </div>
      <div style={labelStyle}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#1677ff',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {num}
        </span>
        {label}
      </div>
    </div>
  );
}

// ===== メインコンポーネント =====

/**
 * 差分プレビューモーダル
 * 保存済みバージョンと現在の編集内容を2カラムで比較表示する
 */
export default function TemplateDiffPreviewModal({
  open,
  template,
  onClose,
  onSave,
}: TemplateDiffPreviewModalProps) {
  if (!template) return null;

  // デモ用: モックデータを使用（実際はAPIから取得）
  const diffData = mockDiffData as DiffData;
  const totalChanged = diffData.summary.changed + diffData.summary.added;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1100}
      style={{ top: 24 }}
      title={null}
      footer={null}
      styles={{
        body: { padding: 0 },
      }}
    >
      {/* ===== ヘッダー ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 22px',
          background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
          color: '#fff',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 700 }}>
            差分プレビュー — {template.key}
          </div>
          <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2 }}>
            保存済み {diffData.savedVersion} と現在の入力値を比較しています
          </div>
        </div>
      </div>

      {/* ===== 変更サマリーバー ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 22px',
          background: '#f6f8fa',
          borderBottom: '1px solid #e0e0e0',
          flexWrap: 'wrap',
        }}
      >
        <SummaryChip type="changed" count={diffData.summary.changed} />
        <SummaryChip type="added" count={diffData.summary.added} />
        <SummaryChip type="same" count={diffData.summary.same} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: '#888' }}>
          <LegendItem type="changed" label="変更あり" />
          <LegendItem type="added" label="新規追加" />
          <LegendItem type="same" label="変更なし" />
        </div>
      </div>

      {/* ===== カラムラベル ===== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '2px solid #d9d9d9',
        }}
      >
        <div
          style={{
            padding: '10px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            borderRight: '2px solid #d9d9d9',
            background: '#fff8f8',
          }}
        >
          <Tag
            style={{
              background: '#fff1f0',
              color: '#cf1322',
              border: '1px solid #ffa39e',
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            {diffData.savedVersion}（保存済み）
          </Tag>
          <span style={{ color: '#888', fontSize: 12 }}>{diffData.savedAt} 登録</span>
        </div>
        <div
          style={{
            padding: '10px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            background: COLOR.addedBg,
          }}
        >
          <Tag
            style={{
              background: COLOR.addedBg,
              color: COLOR.addText,
              border: `1px solid ${COLOR.addedBorder}`,
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            編集中（入力値）
          </Tag>
          <span style={{ color: COLOR.addText, fontSize: 12 }}>● 未保存</span>
        </div>
      </div>

      {/* ===== 差分本体 ===== */}
      <div style={{ overflowY: 'auto', maxHeight: 'calc(88vh - 260px)' }}>
        {diffData.sections.map((section) => (
          <div key={section.num}>
            <DiffSectionHeader label={section.label} num={section.num} />
            {section.fields.map((field) => (
              <DiffFieldRow key={field.fieldKey} field={field} />
            ))}
          </div>
        ))}
      </div>

      {/* ===== フッター ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 22px',
          borderTop: '1px solid #e8e8e8',
          background: '#fafafa',
        }}
      >
        <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>
            <strong>{totalChanged} 項目</strong>に変更があります。保存するとバージョンが更新されます。
          </span>
        </div>
        <Space>
          <Button onClick={onClose}>閉じる</Button>
          <Button type="primary" onClick={onSave}>
            この内容で保存
          </Button>
        </Space>
      </div>
    </Modal>
  );
}

// ===== サマリーチップ =====

function SummaryChip({ type, count }: { type: 'changed' | 'added' | 'same'; count: number }) {
  const styleMap = {
    changed: {
      bg: '#fffbe6', color: '#d48806', border: '#ffe58f', dotBg: '#faad14',
      label: '変更',
    },
    added: {
      bg: '#f6ffed', color: '#389e0d', border: '#b7eb8f', dotBg: '#52c41a',
      label: '追加',
    },
    same: {
      bg: '#f5f5f5', color: '#888', border: '#d9d9d9', dotBg: '#bbb',
      label: '変更なし',
    },
  };
  const s = styleMap[type];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: s.dotBg,
          flexShrink: 0,
        }}
      />
      {s.label} {count} 項目
    </span>
  );
}

// ===== 凡例アイテム =====

function LegendItem({ type, label }: { type: 'changed' | 'added' | 'same'; label: string }) {
  const styleMap = {
    changed: { background: COLOR.changedBg, border: `2px solid ${COLOR.changedBorder}` },
    added:   { background: COLOR.addedBg,   border: `2px solid ${COLOR.addedBorder}` },
    same:    { background: '#fafafa',        border: '1px solid #d9d9d9' },
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          flexShrink: 0,
          ...styleMap[type],
        }}
      />
      <span>{label}</span>
    </div>
  );
}
