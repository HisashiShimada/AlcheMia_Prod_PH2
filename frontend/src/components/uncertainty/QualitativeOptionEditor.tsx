'use client';

import React, { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { ColorPicker } from 'antd';

const { Text } = Typography;

/** 定性選択肢の型定義 */
export interface QualitativeOption {
  id: number;
  /** 表示ラベル（任意） */
  label?: string;
  value: string;
  color: string;
  /** アイコン識別子（任意） */
  icon?: string;
  isDefault: boolean;
}

interface QualitativeOptionEditorProps {
  /** 選択肢リスト */
  options: QualitativeOption[];
  /** ラジオname属性（モーダル間で重複しないよう） */
  radioName?: string;
  /** 選択肢リストの更新コールバック */
  onChange: (options: QualitativeOption[]) => void;
}

/** ===== ソート可能な1行コンポーネント ===== */
interface SortableRowProps {
  option: QualitativeOption;
  index: number;
  radioName: string;
  isLast: boolean;
  onUpdate: (id: number, field: keyof QualitativeOption, val: string | boolean) => void;
  onRemove: (id: number) => void;
  onSetDefault: (id: number) => void;
}

function SortableRow({
  option,
  index,
  radioName,
  isLast,
  onUpdate,
  onRemove,
  onSetDefault,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: option.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    background: isDragging ? '#f0f5ff' : '#fff',
    border: `1px solid ${isDragging ? '#91caff' : '#f0f0f0'}`,
    borderRadius: 4,
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
    marginBottom: 4,
    cursor: 'default',
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* ドラッグハンドル */}
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          color: '#bbb',
          fontSize: 14,
          flexShrink: 0,
          touchAction: 'none',
          width: 22,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HolderOutlined />
      </span>

      {/* 順序番号 */}
      <Text style={{ fontSize: 12, color: '#888', width: 24, flexShrink: 0, textAlign: 'center' }}>
        {index + 1}
      </Text>

      {/* 値 */}
      <Input
        size="small"
        value={option.value}
        onChange={(e) => onUpdate(option.id, 'value', e.target.value)}
        placeholder="value *"
        style={{ width: 110, flexShrink: 0 }}
      />

      {/* 表示色 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, width: 130 }}>
        <ColorPicker
          size="small"
          value={option.color}
          onChange={(_, hex) => onUpdate(option.id, 'color', hex)}
        />
        <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#555', width: 70 }}>
          {option.color.toUpperCase()}
        </Text>
      </div>

      {/* デフォルト値 */}
      <div style={{ width: 72, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <input
          type="radio"
          name={radioName}
          checked={option.isDefault}
          onChange={() => onSetDefault(option.id)}
          style={{ cursor: 'pointer', accentColor: '#1677ff', width: 15, height: 15 }}
        />
      </div>

      {/* 削除 */}
      <div style={{ width: 32, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemove(option.id)}
          disabled={isLast}
        />
      </div>
    </div>
  );
}

/**
 * 定性評価 選択肢エディタコンポーネント
 * dnd-kit を使ったドラッグ＆ドロップで並び替え可能
 */
export default function QualitativeOptionEditor({
  options,
  radioName = 'defaultOption',
  onChange,
}: QualitativeOptionEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  /** ドラッグ終了時に順序を更新 */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = options.findIndex((o) => o.id === active.id);
      const newIndex = options.findIndex((o) => o.id === over.id);
      onChange(arrayMove(options, oldIndex, newIndex));
    },
    [options, onChange]
  );

  /** フィールド更新 */
  const handleUpdate = useCallback(
    (id: number, field: keyof QualitativeOption, val: string | boolean) => {
      onChange(options.map((o) => (o.id !== id ? o : { ...o, [field]: val })));
    },
    [options, onChange]
  );

  /** 削除 */
  const handleRemove = useCallback(
    (id: number) => {
      onChange(options.filter((o) => o.id !== id));
    },
    [options, onChange]
  );

  /** デフォルト設定 */
  const handleSetDefault = useCallback(
    (id: number) => {
      onChange(options.map((o) => ({ ...o, isDefault: o.id === id })));
    },
    [options, onChange]
  );

  /** 追加（idは現在の最大値+1） */
  const handleAdd = useCallback(() => {
    const maxId = options.reduce((m, o) => Math.max(m, o.id), 0);
    onChange([
      ...options,
      { id: maxId + 1, value: '', color: '#6366F1', isDefault: false },
    ]);
  }, [options, onChange]);

  return (
    <div>
      {/* ヘッダー行 */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '4px 8px',
          fontSize: 11,
          fontWeight: 700,
          color: '#888',
          marginBottom: 4,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <span style={{ width: 22 }} />
        <span style={{ width: 24, textAlign: 'center' }}>順</span>
        <span style={{ width: 110 }}>値 (value) *</span>
        <span style={{ width: 130 }}>表示色</span>
        <span style={{ width: 72, textAlign: 'center' }}>デフォルト</span>
        <span style={{ width: 32, textAlign: 'center' }}>操作</span>
      </div>

      {/* ソータブルリスト */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {options.map((option, index) => (
            <SortableRow
              key={option.id}
              option={option}
              index={index}
              radioName={radioName}
              isLast={options.length <= 1}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onSetDefault={handleSetDefault}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* 追加ボタン */}
      <Button
        icon={<PlusOutlined />}
        onClick={handleAdd}
        style={{ marginTop: 8, marginBottom: 4 }}
      >
        選択肢を追加
      </Button>
      <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
        ※ 左端のアイコンをドラッグして並び順を変更できます。
      </div>
    </div>
  );
}
