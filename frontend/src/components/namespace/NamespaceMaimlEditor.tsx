'use client';

import React, { useState } from 'react';
import {
  Modal, List, Button, Tooltip, Typography, Tag, message,
} from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import declaredRaw from '../../../mock/namespace/declaredNamespaces.json';
import termsRaw    from '../../../mock/namespace/terms.json';

const { Title, Text } = Typography;

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
interface NsItem {
  key: string;
  prefix: string;
  uri: string;
  order: number;
  auto: boolean;
}

export interface NamespaceMaimlEditorProps {
  open: boolean;
  onClose: () => void;
}

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const NamespaceMaimlEditor: React.FC<NamespaceMaimlEditorProps> = ({ open, onClose }) => {
  const [declared, setDeclared] = useState<NsItem[]>(
    (declaredRaw as NsItem[]).slice().sort((a, b) => a.order - b.order),
  );

  // ──── 除去（×）: 使用中チェック付き
  const handleRemove = (key: string) => {
    const item = declared.find((d) => d.key === key);
    if (!item) return;
    const usedCount = (termsRaw as { prefix: string }[]).filter(
      (t) => t.prefix === item.prefix,
    ).length;

    const doRemove = () => {
      setDeclared((prev) => prev.filter((d) => d.key !== key));
      message.success(`「${item.prefix}」をこのMaiMLファイルの宣言から除外しました`);
    };

    if (usedCount > 0) {
      Modal.confirm({
        title:     '使用中の名前空間',
        content:   `「${item.prefix}」は ${usedCount} 件の用語で使用中です。本当に除外しますか？`,
        okText:    '除外する',
        okType:    'danger',
        cancelText:'キャンセル',
        onOk:      doRemove,
      });
    } else {
      doRemove();
    }
  };

  // ──── 閉じる
  const handleClose = () => {
    onClose();
  };

  // ──────────────────────────────────────────
  // レンダリング
  // ──────────────────────────────────────────
  return (
    <Modal
      open={open}
      onCancel={handleClose}
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
        以下の名前空間が自動的に適用されています。不要なものは × で除外できます。
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

                {/* 自動バッジ */}
                {item.auto && (
                  <Tag color="blue" style={{ flexShrink: 0, fontSize: 11 }}>
                    自動
                  </Tag>
                )}

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

                {/* 除外ボタン */}
                <Tooltip title="除外">
                  <Button
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => handleRemove(item.key)}
                    style={{ flexShrink: 0 }}
                  />
                </Tooltip>
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
