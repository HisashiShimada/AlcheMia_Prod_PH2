'use client';

import React, { useState } from 'react';
import {
  Modal, List, Button, Tooltip, Typography, message,
} from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import declaredRaw from '../../../mock/namespace/declaredNamespaces.json';
import termsRaw    from '../../../mock/namespace/terms.json';

const { Text } = Typography;

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
interface NsItem {
  key:      string;
  prefix:   string;
  uri:      string;
  order:    number;
  auto:     boolean;
  category: 'global' | 'organization' | 'personal';
}

export interface NamespaceMaimlEditorProps {
  open:    boolean;
  onClose: () => void;
}

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const NamespaceMaimlEditor: React.FC<NamespaceMaimlEditorProps> = ({ open, onClose }) => {
  const [declared, setDeclared] = useState<NsItem[]>(
    (declaredRaw as NsItem[]).slice().sort((a, b) => a.order - b.order),
  );

  // ──── 削除（×）: personal のみ・使用中チェック付き
  const handleRemove = (key: string) => {
    const item = declared.find((d) => d.key === key);
    if (!item) return;

    const usedCount = (termsRaw as { prefix: string }[]).filter(
      (t) => t.prefix === item.prefix,
    ).length;

    const doRemove = () => {
      setDeclared((prev) => prev.filter((d) => d.key !== key));
      message.success(`「${item.prefix}」をこのMaiMLファイルの宣言から削除しました`);
    };

    if (usedCount > 0) {
      Modal.confirm({
        title:      '使用中の名前空間',
        content:    `「${item.prefix}」は ${usedCount} 件の用語で使用中です。本当に削除しますか？`,
        okText:     '削除する（危険）',
        okType:     'danger',
        cancelText: 'キャンセル',
        onOk:       doRemove,
      });
    } else {
      doRemove();
    }
  };

  // ──────────────────────────────────────────
  // レンダリング
  // ──────────────────────────────────────────
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          このMaiMLファイルに設定されている名前空間
        </span>
      }
      width={640}
      style={{ top: 40 }}
      styles={{ body: { padding: '12px 16px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' } }}
      footer={null}
      maskClosable={false}
    >
      {/* 説明テキスト */}
      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
        個人の名前空間のみ × で削除できます。
      </Text>

      {/* 宣言済み名前空間リスト */}
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
        <List<NsItem>
          size="small"
          dataSource={declared}
          locale={{ emptyText: '設定されている名前空間がありません' }}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '8px 12px',
                background: '#fafafa',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
                {/* prefix */}
                <Text strong style={{ whiteSpace: 'nowrap', minWidth: 80 }}>
                  {item.prefix}
                </Text>

                {/* URI */}
                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.uri}
                >
                  {item.uri}
                </Text>

                {/* 削除ボタン（personal のみ）/ プレースホルダー（それ以外） */}
                {item.category === 'personal' ? (
                  <Tooltip title="削除">
                    <Button
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleRemove(item.key)}
                      style={{ flexShrink: 0 }}
                    />
                  </Tooltip>
                ) : (
                  <span style={{ width: 24, flexShrink: 0 }} />
                )}
              </div>
            </List.Item>
          )}
        />
      </div>

      {/* 件数表示 */}
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12, textAlign: 'right' }}>
        {declared.length} 件の名前空間が設定されています
      </Text>
    </Modal>
  );
};

export default NamespaceMaimlEditor;
