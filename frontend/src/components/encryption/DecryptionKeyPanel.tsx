'use client';

/**
 * 復号化用の鍵設定パネル
 *
 * @description
 * 暗号化済み要素を復号化する際に使用する鍵を選択するコンポーネント。
 * 鍵設定タブ内の「復号化用の鍵」セクションとして配置される。
 *
 * - 既存鍵一覧からの選択（Select）
 * - パスワード入力（PBKDF2アルゴリズム使用時のみ表示）
 * - 選択した鍵ID・パスワードを親コンポーネントに通知
 */

import React from 'react';
import {
  Card, Form, Select, Input, Space, Alert, Typography,
} from 'antd';
import { UnlockOutlined } from '@ant-design/icons';
import type { EncryptionKey } from '@/types/encryption';

const { Text } = Typography;
const { Password } = Input;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DecryptionKeyState {
  keyId: string | undefined;
  password: string;
}

interface DecryptionKeyPanelProps {
  /** 利用可能な鍵一覧 */
  keys: EncryptionKey[];
  /** 現在選択中の鍵IDとパスワード */
  value: DecryptionKeyState;
  /** 鍵選択・パスワード変更時のコールバック */
  onChange: (state: DecryptionKeyState) => void;
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/** PBKDF2（パスワード導出）アルゴリズムかどうかを判定 */
function isPbkdf2Key(algorithm: string): boolean {
  return algorithm.toLowerCase().includes('pbkdf2');
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const DecryptionKeyPanel: React.FC<DecryptionKeyPanelProps> = ({
  keys,
  value,
  onChange,
}) => {
  const activeKeys = keys.filter((k) => k.isActive);
  const selectedKey = activeKeys.find((k) => k.keyId === value.keyId);
  const needsPassword = selectedKey ? isPbkdf2Key(selectedKey.algorithm) : false;

  const handleKeyChange = (keyId: string) => {
    onChange({ keyId, password: '' });
  };

  const handlePasswordChange = (password: string) => {
    onChange({ ...value, password });
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <UnlockOutlined style={{ color: '#fa8c16' }} />
          復号化用の鍵
        </Space>
      }
    >
      <Form layout="vertical" size="small">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ 鍵の選択 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Form.Item
          label="使用する鍵"
          help={
            !value.keyId ? (
              <Text type="secondary" style={{ fontSize: 11 }}>
                復号化に使用する鍵を選択してください
              </Text>
            ) : null
          }
          style={{ marginBottom: 8 }}
        >
          <Select
            placeholder="鍵を選択..."
            value={value.keyId}
            onChange={handleKeyChange}
            style={{ width: '100%' }}
            optionFilterProp="label"
            showSearch
            allowClear
            onClear={() => onChange({ keyId: undefined, password: '' })}
            options={activeKeys.map((k) => ({
              value: k.keyId,
              label: k.keyName,
            }))}
            notFoundContent={
              <Text type="secondary" style={{ fontSize: 12 }}>
                利用可能な鍵がありません
              </Text>
            }
          />
        </Form.Item>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ パスワード（PBKDF2の場合のみ） ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {needsPassword && (
          <Form.Item label="パスワード" required style={{ marginBottom: 8 }}>
            <Password
              placeholder="復号化用パスワードを入力"
              value={value.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              autoComplete="current-password"
            />
          </Form.Item>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ 状態表示 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {value.keyId ? (
          <Alert
            type="info"
            showIcon
            message={
              <Text style={{ fontSize: 12 }}>
                選択中：<Text code>{selectedKey?.keyName ?? value.keyId}</Text>
                {needsPassword && !value.password && (
                  <Text type="warning" style={{ marginLeft: 8, fontSize: 11 }}>
                    ※ パスワードが未入力です
                  </Text>
                )}
              </Text>
            }
            style={{ fontSize: 12 }}
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            message="復号化用の鍵が選択されていません"
            description="鍵が選択されるまで復号化を実行できません。"
            style={{ fontSize: 12 }}
          />
        )}
      </Form>
    </Card>
  );
};

export default DecryptionKeyPanel;
