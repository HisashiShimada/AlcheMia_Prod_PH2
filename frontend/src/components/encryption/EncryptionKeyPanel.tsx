'use client';

/**
 * 暗号化用の鍵設定パネル
 *
 * @description
 * 1MAIMLファイルに対する暗号化用の鍵を設定するコンポーネント。
 * 鍵設定タブ内の「暗号化用の鍵」セクションとして配置される。
 *
 * - 新しい共通鍵を生成（アルゴリズム選択あり）
 * - 既存キーファイルを読み込む（アルゴリズム選択なし・鍵依存）
 * - 受信者公開鍵を使用（アルゴリズム選択なし・鍵依存）
 */

import React from 'react';
import {
  Card, Form, Select, Radio, Space, Button, Alert, Upload, Typography,
} from 'antd';
import {
  LockOutlined, KeyOutlined, DeleteOutlined, UploadOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import type {
  EncryptionKey, EncryptionConfig,
  EncryptionAlgorithmType, KeySourceType,
} from '@/types/encryption';
import {
  KeySource, ALGORITHM_OPTIONS, KEY_SOURCE_ACCEPT,
} from '@/types/encryption';
import {
  generateNewKey, uploadKeyFile,
} from '@/services/encryptionService';

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EncryptionKeyPanelProps {
  config: EncryptionConfig;
  keys: EncryptionKey[];
  onConfigChange: (config: EncryptionConfig) => void;
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const EncryptionKeyPanel: React.FC<EncryptionKeyPanelProps> = ({
  config,
  keys: _keys,
  onConfigChange,
}) => {
  const [generatingKey, setGeneratingKey] = React.useState(false);
  const [uploadingKey, setUploadingKey] = React.useState(false);

  const update = React.useCallback(
    (partial: Partial<EncryptionConfig>) => {
      onConfigChange({ ...config, ...partial });
    },
    [config, onConfigChange],
  );

  // ---------------------------------------------------------------------------
  // 鍵操作
  // ---------------------------------------------------------------------------

  /** AES鍵をランダム生成 */
  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    try {
      const keyName = `key-${Date.now()}`;
      const info = await generateNewKey(keyName, config.algorithm);
      update({ loadedKey: info });
    } catch {
      // TODO: エラーハンドリング
    } finally {
      setGeneratingKey(false);
    }
  };

  /** 鍵ファイルをアップロード */
  const handleUploadKeyFile = async (file: File) => {
    setUploadingKey(true);
    try {
      const keySource = config.keySource as 'load_file' | 'public_key';
      const info = await uploadKeyFile(file, file.name, config.algorithm, keySource);
      update({ loadedKey: info });
    } catch {
      // TODO: エラーハンドリング
    } finally {
      setUploadingKey(false);
    }
    return false;
  };

  /** 鍵を消去 */
  const handleClearKey = () => {
    update({ loadedKey: undefined });
  };

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  return (
    <Card
      size="small"
      title={
        <Space>
          <LockOutlined style={{ color: '#1677ff' }} />
          暗号化用の鍵
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Form layout="vertical" size="small">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ 鍵ソース選択 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Form.Item label="鍵ソース" style={{ marginBottom: 8 }}>
          <Radio.Group
            value={config.keySource}
            onChange={(e) => update({ keySource: e.target.value as KeySourceType, loadedKey: undefined })}
            style={{ width: '100%' }}
          >
            <Space direction="horizontal" size={16} wrap>
              <Radio value={KeySource.NEW_KEY}>新しい共通鍵を生成</Radio>
              <Radio value={KeySource.LOAD_FILE}>既存キーファイルを読み込む</Radio>
              <Radio value={KeySource.PUBLIC_KEY}>受信者公開鍵を使用</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ アルゴリズム（新規生成時のみ） ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {config.keySource === KeySource.NEW_KEY && (
          <Form.Item label="暗号化アルゴリズム" style={{ marginBottom: 8 }}>
            <Select
              value={config.algorithm}
              options={ALGORITHM_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
                disabled: opt.disabled,
              }))}
              onChange={(v: EncryptionAlgorithmType) => update({ algorithm: v })}
              style={{ maxWidth: 300 }}
            />
          </Form.Item>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ 鍵操作 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!config.loadedKey && (
          <div style={{ marginBottom: 8 }}>
            {config.keySource === KeySource.NEW_KEY && (
              <Button
                icon={<ThunderboltOutlined />}
                size="small"
                loading={generatingKey}
                onClick={handleGenerateKey}
              >
                {ALGORITHM_OPTIONS.find((o) => o.value === config.algorithm)?.label ?? 'AES-256-CBC'} 鍵を生成
              </Button>
            )}

            {(config.keySource === KeySource.LOAD_FILE || config.keySource === KeySource.PUBLIC_KEY) && (
              <Upload
                accept={KEY_SOURCE_ACCEPT[config.keySource]}
                showUploadList={false}
                beforeUpload={(file) => { handleUploadKeyFile(file); return false; }}
              >
                <Button icon={<UploadOutlined />} size="small" loading={uploadingKey}>
                  ファイルを選択
                </Button>
              </Upload>
            )}
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ 現在の鍵表示 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {config.loadedKey ? (
          <Alert
            type="success"
            showIcon
            icon={<KeyOutlined />}
            message={
              <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                <Text style={{ fontSize: 12 }}>
                  現在の鍵：<Text code>{config.loadedKey.keyIdentifier}</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({config.loadedKey.fileName})
                  </Text>
                  {/* ファイル読込・公開鍵の場合はアルゴリズムを鍵ファイル依存として表示 */}
                  {config.keySource !== KeySource.NEW_KEY && (
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>
                      ｜アルゴリズム：鍵ファイルに依存
                    </Text>
                  )}
                </Text>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleClearKey}
                >
                  鍵を消去
                </Button>
              </Space>
            }
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            message="暗号化用の鍵が設定されていません"
            description="上記の方法で鍵を設定してください。鍵が設定されるまで暗号化を実行できません。"
            style={{ fontSize: 12 }}
          />
        )}
      </Form>
    </Card>
  );
};

export default EncryptionKeyPanel;
