'use client';

/**
 * 暗号化設定パネル
 *
 * @description
 * 秘匿レベル選択・暗号化アルゴリズム・鍵設定・UPA制約チェック・insertion警告を含む設定パネル。
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Card, Form, Select, Switch, Button, Alert, Space,
  Divider, Typography, Radio, Upload,
} from 'antd';
import {
  LockOutlined, WarningOutlined,
  KeyOutlined, DeleteOutlined, UploadOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import type {
  MaimlTreeNode, EncryptionKey, EncryptionConfig,
  EncryptionAlgorithmType, EncryptionLevelType, KeySourceType,
  UpaCheckResult,
} from '@/types/encryption';
import {
  EncryptionLevel, KeySource, ALGORITHM_OPTIONS, GLOBAL_ELEMENT_TAGS,
  KEY_SOURCE_ACCEPT,
} from '@/types/encryption';
import {
  generateNewKey, uploadKeyFile, checkUpaConstraints as apiCheckUpa,
} from '@/services/encryptionService';

/** デバウンス遅延（ms） */
const PREVIEW_DEBOUNCE_MS = 300;

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EncryptionConfigPanelProps {
  projectName: string;
  /** 暗号化対象ノード一覧（EncryptionManagement から collectTargets で収集済み） */
  targets: MaimlTreeNode[];
  config: EncryptionConfig;
  keys: EncryptionKey[];
  onConfigChange: (config: EncryptionConfig) => void;
  /** プレビューを更新する（デバウンス自動更新から呼ばれる） */
  onPreview: () => void;
  /** 暗号化を実行する */
  onEncrypt: () => void;
  /** 分割ウィザードを開く */
  onOpenSplitWizard?: () => void;
  previewLoading: boolean;
  executing: boolean;
  /** UPA制約違反が存在するか（UPA欄に分割ボタンを表示するか） */
  hasUpaViolation?: boolean;
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/**
 * 選択ノードのカテゴリに基づいて自動適用される秘匿レベルを判定
 */
function getAutoLevel(node: MaimlTreeNode | null): EncryptionLevelType {
  if (!node) return EncryptionLevel.L1;
  const tag = node.tagName;
  if (tag === 'property' || tag === 'content' || node.nodeCategory === 'property' || node.nodeCategory === 'content') {
    return EncryptionLevel.L2;
  }
  if (GLOBAL_ELEMENT_TAGS.includes(tag) || node.nodeCategory === 'global') {
    return EncryptionLevel.L1;
  }
  return EncryptionLevel.L1;
}

/**
 * 実際に適用される秘匿レベルを返す（自動選択の解決）
 */
function resolveLevel(config: EncryptionConfig, node: MaimlTreeNode | null): EncryptionLevelType {
  if (config.encryptionLevel === EncryptionLevel.AUTO) return getAutoLevel(node);
  return config.encryptionLevel;
}

/** UPA制約チェックを表示すべきか */
function shouldShowUpa(config: EncryptionConfig, node: MaimlTreeNode | null): boolean {
  const level = resolveLevel(config, node);
  return level === EncryptionLevel.L2 && node !== null;
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const EncryptionConfigPanel: React.FC<EncryptionConfigPanelProps> = ({
  projectName,
  targets,
  config,
  keys,
  onConfigChange,
  onPreview,
  onEncrypt,
  onOpenSplitWizard,
  previewLoading,
  executing,
  hasUpaViolation = false,
}) => {
  /** 代表ノード（UPAチェック・秘匿レベル自動判定・insertion警告に使用） */
  const representativeNode = targets[0] ?? null;
  const hasSelection = targets.length > 0;

  const [generatingKey, setGeneratingKey] = React.useState(false);
  const [uploadingKey, setUploadingKey] = React.useState(false);
  const [upaResult, setUpaResult] = React.useState<UpaCheckResult | null>(
    representativeNode?.upaCheckResult ?? null,
  );
  const [upaLoading, setUpaLoading] = React.useState(false);

  // デバウンスタイマー参照
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(
    (partial: Partial<EncryptionConfig>) => {
      onConfigChange({ ...config, ...partial });
    },
    [config, onConfigChange],
  );

  // ---------------------------------------------------------------------------
  // デバウンス自動プレビュー更新
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!hasSelection) return;
    // 設定変更時に300msデバウンスでプレビューを自動更新
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onPreview();
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  // config が変わるたびにトリガー（onPreview は安定参照を想定）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // ---------------------------------------------------------------------------
  // 鍵操作
  // ---------------------------------------------------------------------------

  /** AES-256 鍵をランダム生成 */
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
    return false; // antd Upload の自動アップロードを無効化
  };

  /** 鍵を消去 */
  const handleClearKey = () => {
    update({ loadedKey: undefined });
  };

  // ---------------------------------------------------------------------------
  // UPA制約チェック
  // ---------------------------------------------------------------------------

  const handleUpaCheck = useCallback(async () => {
    if (!representativeNode || !projectName) return;
    setUpaLoading(true);
    try {
      const level = resolveLevel(config, representativeNode);
      const result = await apiCheckUpa(projectName, representativeNode.path, level);
      setUpaResult(result);
    } catch {
      setUpaResult({ isValid: false, violations: [{ elementPath: '', message: 'チェックに失敗しました' }] });
    } finally {
      setUpaLoading(false);
    }
  }, [representativeNode, projectName, config]);

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  const autoLevelLabel = getAutoLevel(representativeNode) === EncryptionLevel.L1 ? 'L1' : 'L2';

  return (
    <Card
      size="small"
      title={
        <Space>
          <LockOutlined />
          暗号化設定
          {hasSelection && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
              （対象: {targets.length}件）
            </Text>
          )}
        </Space>
      }
      bodyStyle={{ overflowY: 'auto', maxHeight: 'calc(100vh - 180px)', paddingBottom: 16 }}
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

      {/* 対象ノード一覧 */}
      {hasSelection && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            暗号化対象（{targets.length}件）:
          </Text>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
            {targets.map((n) => (
              <li key={n.path} style={{ fontSize: 11 }}>
                <Text strong style={{ fontSize: 12 }}>
                  {n.label ?? n.key ?? n.tagName}
                </Text>
                <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>
                  {n.path}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Form layout="vertical" size="small">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ 秘匿レベル ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Form.Item label="秘匿レベル" style={{ marginBottom: 8 }}>
          <Radio.Group
            value={config.encryptionLevel}
            onChange={(e) => update({ encryptionLevel: e.target.value as EncryptionLevelType })}
            disabled={!hasSelection}
            style={{ width: '100%' }}
          >
            <Space direction="horizontal" size={16} wrap>
              <Radio value={EncryptionLevel.AUTO}>
                自動選択（推奨）
                {config.encryptionLevel === EncryptionLevel.AUTO && (
                  <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                    → {autoLevelLabel} 適用
                  </Text>
                )}
              </Radio>
              <Radio value={EncryptionLevel.L1}>
                L1：要素全体
              </Radio>
              <Radio value={EncryptionLevel.L2}>
                L2：コンテンツのみ
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Divider style={{ margin: '8px 0' }} />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ 暗号化アルゴリズム ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Form.Item label="暗号化アルゴリズム" style={{ marginBottom: 8 }}>
          <Select
            value={config.algorithm}
            options={ALGORITHM_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
              disabled: opt.disabled,
            }))}
            onChange={(v: EncryptionAlgorithmType) => update({ algorithm: v })}
            disabled={!hasSelection}
          />
        </Form.Item>

        <Divider style={{ margin: '8px 0' }} />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ 鍵設定 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Form.Item label="鍵設定" style={{ marginBottom: 8 }}>
          {/* 鍵ソース選択 */}
          <Radio.Group
            value={config.keySource}
            onChange={(e) => update({ keySource: e.target.value as KeySourceType, loadedKey: undefined })}
            disabled={!hasSelection}
            style={{ marginBottom: 8, width: '100%' }}
          >
            <Space direction="horizontal" size={16} wrap>
              <Radio value={KeySource.NEW_KEY}>新しい共通鍵を生成</Radio>
              <Radio value={KeySource.LOAD_FILE}>
                既存キーファイルを読み込む
              </Radio>
              <Radio value={KeySource.PUBLIC_KEY}>
                受信者公開鍵を使用
              </Radio>
            </Space>
          </Radio.Group>

          {/* 鍵操作UI */}
          {hasSelection && (
            <div style={{ marginTop: 8 }}>
              {config.keySource === KeySource.NEW_KEY && !config.loadedKey && (
                <Button
                  icon={<ThunderboltOutlined />}
                  size="small"
                  loading={generatingKey}
                  onClick={handleGenerateKey}
                >
                  AES-256 鍵を生成
                </Button>
              )}

              {(config.keySource === KeySource.LOAD_FILE || config.keySource === KeySource.PUBLIC_KEY) && !config.loadedKey && (
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

              {/* 鍵識別子表示 */}
              {config.loadedKey ? (
                <Alert
                  type="success"
                  showIcon
                  icon={<KeyOutlined />}
                  style={{ marginTop: 8 }}
                  message={
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12 }}>
                        現在の鍵：<Text code>{config.loadedKey.keyIdentifier}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          ({config.loadedKey.fileName})
                        </Text>
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
                  style={{ marginTop: 8 }}
                  message="鍵が設定されていません（暗号化を実行できません）"
                />
              )}
            </div>
          )}
        </Form.Item>

        <Divider style={{ margin: '8px 0' }} />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ UPA制約チェック結果 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {shouldShowUpa(config, representativeNode) && (
          <Form.Item label="UPA制約チェック" style={{ marginBottom: 8 }}>
            {upaResult === null ? (
              <Button size="small" loading={upaLoading} onClick={handleUpaCheck}>
                チェックを実行
              </Button>
            ) : upaResult.isValid ? (
              <Alert type="success" showIcon message="✓ スキーマ制約: OK" />
            ) : (
              <Alert
                type="error"
                showIcon
                message="UPA制約違反が検出されました"
                description={upaResult.violations.map((v) => v.message).join(' / ')}
                action={
                  <Space direction="vertical" size={4}>
                    <Button size="small" onClick={onOpenSplitWizard}>
                      分割ウィザードを開く
                    </Button>
                    <Button size="small" type="primary" onClick={onEncrypt} loading={executing}>
                      このまま続ける
                    </Button>
                  </Space>
                }
              />
            )}
          </Form.Item>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ insertion 警告 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {targets.some((n) => n.hasInsertion) && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 8 }}
            message="挿入履歴（insertion）が含まれています"
            description="暗号化すると挿入履歴が参照できなくなります。"
          />
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━ オプション ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Divider style={{ margin: '8px 0' }} />
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>オプション</Text>

        <Form.Item label="暗号化日時を記録" style={{ marginBottom: 4 }}>
          <Switch
            size="small"
            checked={config.encryptionProperties.recordTimestamp}
            onChange={(v) =>
              update({ encryptionProperties: { ...config.encryptionProperties, recordTimestamp: v } })
            }
            disabled={!hasSelection}
          />
        </Form.Item>

        <Form.Item label="暗号化者を記録" style={{ marginBottom: 8 }}>
          <Switch
            size="small"
            checked={config.encryptionProperties.recordEncryptor}
            onChange={(v) =>
              update({ encryptionProperties: { ...config.encryptionProperties, recordEncryptor: v } })
            }
            disabled={!hasSelection}
          />
        </Form.Item>

        <Divider style={{ margin: '8px 0' }} />
      </Form>
    </Card>
  );
};

export default EncryptionConfigPanel;
