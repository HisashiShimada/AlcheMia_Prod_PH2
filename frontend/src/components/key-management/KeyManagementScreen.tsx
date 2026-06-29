'use client';

/**
 * 鍵管理画面コンテナ
 *
 * @description
 * 暗号化鍵の一覧・作成・削除を管理する画面。
 * ExperimentAdminMenu のタブ5として表示される。
 * 鍵は組織全体の共有リソースであるため、特定プロジェクトに依存しない独立画面として配置。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Alert, Typography } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import KeyManagement from '@/components/encryption/KeyManagement';
import * as encryptionService from '@/services/encryptionService';
import type { EncryptionKey } from '@/types/encryption';

const { Title } = Typography;

const KeyManagementScreen: React.FC = () => {
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // データ取得
  // ---------------------------------------------------------------------------

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const keyList = await encryptionService.listKeys();
      setKeys(keyList);
    } catch {
      setError('鍵一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" tip="読み込み中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100%', overflow: 'auto' }}>
      {/* ページヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <KeyOutlined style={{ marginRight: 8 }} />
          暗号化鍵管理
        </Title>
      </div>

      {/* 鍵管理テーブル */}
      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <KeyManagement keys={keys} onKeysChange={loadKeys} />
      </div>
    </div>
  );
};

export default KeyManagementScreen;
