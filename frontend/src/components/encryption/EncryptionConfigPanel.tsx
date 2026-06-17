'use client';

/**
 * 暗号化設定パネル
 *
 * @description
 * 暗号化アルゴリズム・鍵方式・各種オプションを設定し、
 * プレビュー生成・暗号化実行・復号化実行を行うパネル。
 */

import React from 'react';
import {
  Card, Form, Select, Switch, Button, Alert, Space,
  Divider, InputNumber, Input, Typography,
} from 'antd';
import {
  LockOutlined, UnlockOutlined, EyeOutlined, WarningOutlined,
} from '@ant-design/icons';
import type {
  MaimlTreeNode, EncryptionKey, EncryptionConfig,
  EncryptionAlgorithmType, KeyMethodType,
} from '@/types/encryption';
import {
  EncryptionAlgorithmLabel, KeyMethod,
} from '@/types/encryption';

const { Text } = Typography;

interface EncryptionConfigPanelProps {
  selectedNode: MaimlTreeNode | null;
  config: EncryptionConfig;
  keys: EncryptionKey[];
  onConfigChange: (config: EncryptionConfig) => void;
  onPreview: () => void;
  onEncrypt: () => void;
  previewLoading: boolean;
  executing: boolean;
}

const ALGORITHM_OPTIONS = Object.entries(EncryptionAlgorithmLabel).map(([value, label]) => ({
  value,
  label,
}));

const EncryptionConfigPanel: React.FC<EncryptionConfigPanelProps> = ({
  selectedNode,
  config,
  keys,
  onConfigChange,
  onPreview,
  onEncrypt,
  previewLoading,
  executing,
}) => {
  const isEncrypted = selectedNode?.isEncrypted ?? false;
  const hasSelection = selectedNode !== null;

  const activeKeys = keys.filter((k) => k.isActive);

  // ---------------------------------------------------------------------------
  // 設定変更ヘルパー
  // ---------------------------------------------------------------------------

  const update = (partial: Partial<EncryptionConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  return (
    <Card
      size="small"
      title={
        <Space>
          <LockOutlined />
          暗号化設定
        </Space>
      }
    >
      {/* ノード未選択 */}
      {!hasSelection && (
        <Alert
          message="左のツリーから暗号化対象の要素を選択してください"
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      {/* 暗号化済みノード */}
      {hasSelection && isEncrypted && (
        <Alert
          icon={<WarningOutlined />}
          message={`このノードは既に暗号化されています（${selectedNode.encryptionInfo?.algorithmUri ?? '不明'}）`}
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      {/* 選択ノード情報 */}
      {hasSelection && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>選択中：</Text>
          <Text strong style={{ fontSize: 13, marginLeft: 4 }}>
            {selectedNode.label ?? selectedNode.key ?? selectedNode.tagName}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{selectedNode.path}</Text>
        </div>
      )}

      <Form layout="vertical" size="small">
        {/* 暗号化アルゴリズム */}
        <Form.Item label="暗号化アルゴリズム" style={{ marginBottom: 8 }}>
          <Select
            value={config.algorithm}
            options={ALGORITHM_OPTIONS}
            onChange={(v: EncryptionAlgorithmType) => update({ algorithm: v })}
            disabled={!hasSelection}
          />
        </Form.Item>

        {/* 鍵指定方式 */}
        <Form.Item label="鍵の指定方法" style={{ marginBottom: 8 }}>
          <Select
            value={config.keyMethod}
            onChange={(v: KeyMethodType) => update({ keyMethod: v })}
            disabled={!hasSelection}
            options={[
              { value: KeyMethod.KEY_NAME, label: '既存の鍵名を使用' },
              { value: KeyMethod.PBKDF2,   label: 'パスワードから鍵を導出（PBKDF2）' },
            ]}
          />
        </Form.Item>

        {/* 鍵名選択（keyName方式） */}
        {config.keyMethod === KeyMethod.KEY_NAME && (
          <Form.Item label="暗号化鍵" style={{ marginBottom: 8 }}>
            <Select
              value={config.keyName}
              placeholder="鍵を選択してください"
              onChange={(v: string) => update({ keyName: v })}
              disabled={!hasSelection}
              allowClear
              options={activeKeys.map((k) => ({
                value: k.keyName,
                label: `${k.keyName} (${k.algorithm})`,
              }))}
            />
          </Form.Item>
        )}

        {/* PBKDF2設定 */}
        {config.keyMethod === KeyMethod.PBKDF2 && (
          <>
            <Form.Item label="パスワード" style={{ marginBottom: 8 }}>
              <Input.Password
                value={config.pbkdf2Config?.password ?? ''}
                onChange={(e) =>
                  update({
                    pbkdf2Config: {
                      ...config.pbkdf2Config,
                      password: e.target.value,
                      iterationCount: config.pbkdf2Config?.iterationCount ?? 10000,
                    },
                  })
                }
                disabled={!hasSelection}
                placeholder="パスワードを入力"
              />
            </Form.Item>
            <Form.Item label="繰り返し回数（PBKDF2）" style={{ marginBottom: 8 }}>
              <InputNumber
                min={1000}
                max={1000000}
                step={1000}
                value={config.pbkdf2Config?.iterationCount ?? 10000}
                onChange={(v) =>
                  update({
                    pbkdf2Config: {
                      ...config.pbkdf2Config,
                      password: config.pbkdf2Config?.password ?? '',
                      iterationCount: v ?? 10000,
                    },
                  })
                }
                disabled={!hasSelection}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </>
        )}

        <Divider style={{ margin: '8px 0' }} />

        {/* オプション */}
        <Form.Item label="暗号化日時を記録" style={{ marginBottom: 4 }}>
          <Switch
            size="small"
            checked={config.encryptionProperties.recordTimestamp}
            onChange={(v) =>
              update({
                encryptionProperties: { ...config.encryptionProperties, recordTimestamp: v },
              })
            }
            disabled={!hasSelection}
          />
        </Form.Item>

        <Form.Item label="暗号化者を記録" style={{ marginBottom: 8 }}>
          <Switch
            size="small"
            checked={config.encryptionProperties.recordEncryptor}
            onChange={(v) =>
              update({
                encryptionProperties: { ...config.encryptionProperties, recordEncryptor: v },
              })
            }
            disabled={!hasSelection}
          />
        </Form.Item>

        <Divider style={{ margin: '8px 0' }} />

        {/* アクションボタン */}
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button
            icon={<EyeOutlined />}
            onClick={onPreview}
            loading={previewLoading}
            disabled={!hasSelection || isEncrypted}
          >
            プレビュー
          </Button>
          {!isEncrypted ? (
            <Button
              type="primary"
              icon={<LockOutlined />}
              onClick={onEncrypt}
              loading={executing}
              disabled={!hasSelection || !config.keyName && config.keyMethod === KeyMethod.KEY_NAME}
              danger={false}
            >
              暗号化を実行
            </Button>
          ) : (
            <Button
              icon={<UnlockOutlined />}
              onClick={onEncrypt}
              loading={executing}
              disabled={!hasSelection}
            >
              復号化を実行
            </Button>
          )}
        </Space>
      </Form>
    </Card>
  );
};

export default EncryptionConfigPanel;
