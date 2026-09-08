'use client';

/**
 * 復号化設定パネル
 *
 * @description
 * 暗号化済み要素を選択した時に表示される復号化設定パネル。
 * 複数要素を一括復号化できる。
 * 鍵選択は「鍵設定」タブ（DecryptionKeyPanel）で行い、
 * このパネルでは渡された keyId / password を使って実行・プレビューのみを担当する。
 */

import React, { useEffect, useRef } from 'react';
import {
  App, Card, Button, Space, Typography,
  Alert, Divider,
} from 'antd';
import {
  UnlockOutlined, SyncOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { MaimlTreeNode } from '@/types/encryption';

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DecryptionPanelProps {
  /** プロジェクト名 */
  projectName: string;
  /** 復号化対象ノード一覧（暗号化済み要素） */
  targets: MaimlTreeNode[];
  /** 復号化に使用する鍵ID（鍵設定タブから渡される） */
  keyId: string | undefined;
  /** 復号化用パスワード（PBKDF2の場合、鍵設定タブから渡される） */
  password?: string;
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
  projectName: _projectName,
  targets,
  keyId,
  password,
  previewLoading,
  executing,
  onDecryptPreview,
  onDecryptExecute,
}) => {
  const { modal } = App.useApp();
  /** 代表ノード（アルゴリズム情報表示に使用） */
  const representativeNode = targets[0] ?? null;
  const encryptionInfo = representativeNode?.encryptionInfo;

  /** デバウンスタイマー参照 */
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // デバウンス自動プレビュー更新
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!keyId) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onDecryptPreview(keyId, password || undefined);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  // keyId / password / targets が変わるたびにトリガー
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyId, password, targets]);

  // 実行ボタン用確認ダイアログ
  const handleDecryptExecuteClick = () => {
    if (!keyId) return;
    modal.confirm({
      title: '復号化の実行',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>以下の要素を復号化します。この操作はMAIMLファイルを書き換えます。</p>
          <ul style={{ paddingLeft: 16, margin: '4px 0' }}>
            {targets.map((n) => (
              <li key={n.path} style={{ fontSize: 12 }}>
                <Text code style={{ fontSize: 11 }}>
                  {n.label ?? n.path}
                </Text>
              </li>
            ))}
          </ul>
          <p style={{ color: '#fa8c16', marginTop: 8 }}>
            復号化前のデータはバックアップに保存されます。
          </p>
        </div>
      ),
      okText: '復号化する',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: () => onDecryptExecute(keyId, password || undefined),
    });
  };

  // 未選択時
  if (targets.length === 0) {
    return (
      <Card size="small" style={{ margin: '8px 0' }}>
        <Text type="secondary">ツリーから暗号化済み要素を選択してください。</Text>
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
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal', marginLeft: 8 }}>
              （対象: {targets.length}件）
            </Text>
          </Text>

          {/* 対象要素リスト */}
          <div
            style={{
              maxHeight: 120,
              overflowY: 'auto',
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 4,
              padding: '4px 8px',
            }}
          >
            <ul style={{ margin: 0, paddingLeft: 16 }}>
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

          {/* 代表ノードのアルゴリズム情報 */}
          {encryptionInfo && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              アルゴリズム：{formatAlgorithmLabel(encryptionInfo.algorithmUri)}
              {encryptionInfo.keyName && (
                <span style={{ marginLeft: 8 }}>
                  鍵名：<Text code style={{ fontSize: 11 }}>{encryptionInfo.keyName}</Text>
                </span>
              )}
              {targets.length > 1 && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ※ 代表ノードの情報を表示
                </Text>
              )}
            </Text>
          )}
        </Space>
      </Card>

      {/* 鍵未設定の案内 */}
      {!keyId && (
        <Alert
          type="warning"
          message="復号化用の鍵が選択されていません"
          description="「鍵設定」タブの「復号化用の鍵」セクションで鍵を選択してください。"
          showIcon
          style={{ marginBottom: 12, fontSize: 12 }}
        />
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* ボタン */}
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button
          icon={<SyncOutlined />}
          loading={previewLoading}
          disabled={!keyId}
          onClick={() => keyId && onDecryptPreview(keyId, password || undefined)}
        >
          プレビューを更新
        </Button>
        <Button
          type="primary"
          danger
          icon={<UnlockOutlined />}
          loading={executing}
          disabled={!keyId}
          onClick={handleDecryptExecuteClick}
        >
          {targets.length > 1 ? `復号化実行（${targets.length}件）` : '復号化実行'}
        </Button>
      </Space>
    </div>
  );
};

export default DecryptionPanel;
