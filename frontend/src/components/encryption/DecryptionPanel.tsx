'use client';

/**
 * 復号化設定パネル
 *
 * @description
 * 暗号化済み要素を選択した時に表示される復号化設定パネル。
 * 使用する鍵を選択し、復号化プレビューまたは実行ができる。
 */

import React, { useState } from 'react';
import {
  Card, Form, Select, Input, Button, Space, Typography,
  Alert, Divider, Modal,
} from 'antd';
import {
  UnlockOutlined, EyeOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { MaimlTreeNode, EncryptionKey } from '@/types/encryption';

const { Text } = Typography;
const { Password } = Input;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DecryptionPanelProps {
  /** プロジェクト名 */
  projectName: string;
  /** 選択中のノード（暗号化済み要素） */
  selectedNode: MaimlTreeNode | null;
  /** 利用可能な鍵一覧 */
  keys: EncryptionKey[];
  /** プレビュー実行中か */
  previewLoading: boolean;
  /** 復号化実行中か */
  executing: boolean;
  /** 復号化プレビューを実行するコールバック */
  onDecryptPreview: (keyId: string, password?: string) => void;
  /** 復号化を実行するコールバック */
  onDecryptExecute: (keyId: string, password?: string) => void;
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/** PBKDF2（パスワード導出）アルゴリズムかどうかを判定 */
function isPbkdf2Algorithm(algorithmUri?: string): boolean {
  return algorithmUri?.includes('pbkdf2') ?? false;
}

/** アルゴリズムURIから表示名を生成 */
function formatAlgorithmLabel(algorithmUri?: string): string {
  if (!algorithmUri) return '不明';
  const match = algorithmUri.match(/xmlenc#(.+)$/);
  return match ? match[1].toUpperCase().replace(/-/g, '-') : algorithmUri;
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const DecryptionPanel: React.FC<DecryptionPanelProps> = ({
  projectName,
  selectedNode,
  keys,
  previewLoading,
  executing,
  onDecryptPreview,
  onDecryptExecute,
}) => {
  const [selectedKeyId, setSelectedKeyId] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string>('');

  const encryptionInfo = selectedNode?.encryptionInfo;
  const needsPassword = isPbkdf2Algorithm(encryptionInfo?.algorithmUri);

  // 実行ボタン用確認ダイアログ
  const handleDecryptExecuteClick = () => {
    if (!selectedKeyId) return;
    Modal.confirm({
      title: '復号化の実行',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>以下の要素を復号化します。この操作はMAIMLファイルを書き換えます。</p>
          <p>
            <Text strong>対象要素：</Text>
            <Text code style={{ fontSize: 11 }}>{selectedNode?.label ?? selectedNode?.path}</Text>
          </p>
          <p style={{ color: '#fa8c16' }}>
            復号化前のデータはバックアップに保存されます。
          </p>
        </div>
      ),
      okText: '復号化する',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: () => onDecryptExecute(selectedKeyId, password || undefined),
    });
  };

  // 未選択時
  if (!selectedNode) {
    return (
      <Card size="small" style={{ margin: '8px 0' }}>
        <Text type="secondary">ツリーから暗号化済み要素を選択してください。</Text>
      </Card>
    );
  }

  // 暗号化済みでない要素が選択された場合
  if (!selectedNode.isEncrypted) {
    return (
      <Card size="small" style={{ margin: '8px 0' }}>
        <Text type="secondary">
          選択した要素は暗号化されていません。
        </Text>
      </Card>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      {/* 選択中の要素情報 */}
      <Card
        size="small"
        style={{ marginBottom: 12, background: '#fff7e6', borderColor: '#ffd591' }}
      >
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 13 }}>
            <UnlockOutlined style={{ marginRight: 6, color: '#fa8c16' }} />
            復号化設定
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            対象：
            <Text code style={{ fontSize: 11 }}>
              {selectedNode.label ?? selectedNode.id ?? selectedNode.key ?? selectedNode.path}
            </Text>
          </Text>
          {encryptionInfo && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              アルゴリズム：{formatAlgorithmLabel(encryptionInfo.algorithmUri)}
              {encryptionInfo.keyName && (
                <span style={{ marginLeft: 8 }}>
                  鍵名：<Text code style={{ fontSize: 11 }}>{encryptionInfo.keyName}</Text>
                </span>
              )}
            </Text>
          )}
        </Space>
      </Card>

      {/* 復号化設定フォーム */}
      <Form layout="vertical" size="small">
        {/* 使用する鍵 */}
        <Form.Item
          label="使用する鍵"
          required
          help={
            !selectedKeyId ? (
              <Text type="secondary" style={{ fontSize: 11 }}>
                復号化に使用する鍵を選択してください
              </Text>
            ) : null
          }
        >
          <Select
            placeholder="鍵を選択..."
            value={selectedKeyId}
            onChange={setSelectedKeyId}
            style={{ width: '100%' }}
            optionFilterProp="label"
            showSearch
            options={keys
              .filter((k) => k.isActive)
              .map((k) => ({
                value: k.keyId,
                label: k.keyName,
                disabled: false,
              }))}
            notFoundContent={
              <Text type="secondary" style={{ fontSize: 12 }}>
                利用可能な鍵がありません
              </Text>
            }
          />
        </Form.Item>

        {/* パスワード（PBKDF2の場合のみ表示） */}
        {needsPassword && (
          <Form.Item label="パスワード" required>
            <Password
              placeholder="復号化用パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Form.Item>
        )}
      </Form>

      <Divider style={{ margin: '12px 0' }} />

      {/* 鍵未選択の警告 */}
      {!selectedKeyId && (
        <Alert
          type="warning"
          message="鍵を選択してください"
          description="復号化を行うには使用する鍵を選択する必要があります。"
          showIcon
          style={{ marginBottom: 12, fontSize: 12 }}
        />
      )}

      {/* ボタン */}
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button
          icon={<EyeOutlined />}
          loading={previewLoading}
          disabled={!selectedKeyId || (needsPassword && !password)}
          onClick={() => selectedKeyId && onDecryptPreview(selectedKeyId, password || undefined)}
        >
          復号化プレビュー
        </Button>
        <Button
          type="primary"
          danger
          icon={<UnlockOutlined />}
          loading={executing}
          disabled={!selectedKeyId || (needsPassword && !password)}
          onClick={handleDecryptExecuteClick}
        >
          復号化実行
        </Button>
      </Space>
    </div>
  );
};

export default DecryptionPanel;
