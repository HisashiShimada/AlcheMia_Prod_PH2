'use client';

/**
 * AttentionItemList.tsx
 *
 * 要注意項目（良好以外の評価）リストコンポーネント
 *
 * @remarks
 * AttentionItem[] を受け取り、severity 順（不良 → 要確認）で表示する。
 */

import React from 'react';
import { Typography, Flex, Tag, Empty } from 'antd';
import { ExclamationCircleFilled, WarningFilled } from '@ant-design/icons';
import type { AttentionItem, AttentionItemListProps } from '@/types/aggregationRule';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────────────────────

function makeLabel(item: AttentionItem): string {
  const parts: string[] = [item.evaluationUnit];
  if (item.methodId)     parts.push(`METHOD:${item.methodId}`);
  if (item.taskNo != null) parts.push(`TASK:${item.taskNo}`);
  if (item.transitionId) parts.push(`TRANSITION:${item.transitionId}`);
  return parts.join(' / ');
}

// ─────────────────────────────────────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────────────────────────────────────

const AttentionItemList: React.FC<AttentionItemListProps> = ({ items }) => {
  if (items.length === 0) {
    return <Empty description="要注意項目なし" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />;
  }

  return (
    <Flex vertical gap={4}>
      {items.map((item, idx) => (
        <Flex
          key={idx}
          align="flex-start"
          gap={8}
          style={{
            padding: '4px 8px',
            borderRadius: 4,
            backgroundColor: item.severity === 'bad' ? '#fff1f0' : '#fffbe6',
            borderLeft: `3px solid ${item.severity === 'bad' ? '#ff4d4f' : '#faad14'}`,
          }}
        >
          {/* アイコン */}
          {item.severity === 'bad' ? (
            <ExclamationCircleFilled style={{ color: '#ff4d4f', marginTop: 2, flexShrink: 0 }} />
          ) : (
            <WarningFilled style={{ color: '#faad14', marginTop: 2, flexShrink: 0 }} />
          )}

          {/* バッジ */}
          <Tag
            color={item.severity === 'bad' ? 'error' : 'warning'}
            style={{ flexShrink: 0, fontSize: 11 }}
          >
            {item.evaluationValue}
          </Tag>

          {/* ラベル */}
          <Text style={{ fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
            {makeLabel(item)}
          </Text>

          {/* コメント */}
          {item.comment && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.comment}
            </Text>
          )}
        </Flex>
      ))}
    </Flex>
  );
};

export default AttentionItemList;
