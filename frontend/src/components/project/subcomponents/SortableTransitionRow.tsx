'use client';

import React from 'react';
import { Select, Typography, Tag, Tooltip, theme } from 'antd';
import { HolderOutlined, LinkOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { canMoveToOrder } from '@/utils/experimentPlanHelpers';
import type { SortableTransitionRowProps } from '@/types/experimentPlanDialog';

const { Text } = Typography;
const { useToken } = theme;

// ============================================================
// SortableTransitionRow — ドラッグ&ドロップ可能なトランジション行
// ============================================================

const SortableTransitionRow: React.FC<SortableTransitionRowProps> = ({
  id,
  order,
  step,
  name,
  prerequisiteTransitionIds,
  allTransitionOrderItems,
  maxOrder,
  onOrderChange,
  disabled,
  token,
}) => {
  const hasPrereqs = prerequisiteTransitionIds.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 6px',
    border: `1px solid ${hasPrereqs ? token.colorInfoBorder : token.colorBorder}`,
    borderRadius: token.borderRadius,
    backgroundColor: hasPrereqs ? token.colorInfoBg : token.colorFillAlter,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* ドラッグハンドル（常に表示） */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: disabled ? 'not-allowed' : 'grab',
          color: token.colorTextQuaternary,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <HolderOutlined style={{ fontSize: 12 }} />
      </div>

      {/* 順序番号 Select */}
      <Select
        size="small"
        value={order}
        onChange={(val) => onOrderChange(id, val)}
        disabled={disabled}
        style={{ width: 52, flexShrink: 0 }}
        popupMatchSelectWidth={false}
        options={Array.from({ length: maxOrder }, (_, i) => {
          const targetOrder = i + 1;
          const { canMove } = canMoveToOrder(id, targetOrder, allTransitionOrderItems);
          return {
            label: String(targetOrder),
            value: targetOrder,
            // 依存先が targetOrder 以降にある場合は選択不可
            disabled: !canMove,
          };
        })}
      />

      {/* ステップ番号 Tag */}
      <Tooltip title={`ステップ ${step}（依存の深さ ${step - 1}）`}>
        <Tag
          color="purple"
          style={{ margin: 0, cursor: 'default', fontSize: 10, flexShrink: 0 }}
        >
          S{step}
        </Tag>
      </Tooltip>

      {/* トランジション名 */}
      <Text
        style={{
          fontSize: 11,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          color: token.colorText,
        }}
        title={name}
      >
        {name}
      </Text>

      {/* 依存関係アイコン（prerequisiteTransitionIds が空でない場合のみ） */}
      {hasPrereqs && (
        <Tooltip
          title={
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                依存関係あり（以下より後に実行）
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {prerequisiteTransitionIds.map((prereqId) => {
                  const prereq = allTransitionOrderItems.find((t) => t.id === prereqId);
                  return (
                    <li key={prereqId}>
                      {prereq?.name ?? prereqId}（順序: {prereq?.order ?? '?'}）
                    </li>
                  );
                })}
              </ul>
            </div>
          }
        >
          <Tag
            color="blue"
            icon={<LinkOutlined />}
            style={{ margin: 0, cursor: 'default', fontSize: 10, flexShrink: 0 }}
          >
            依存
          </Tag>
        </Tooltip>
      )}
    </div>
  );
};

export default SortableTransitionRow;
