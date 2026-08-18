'use client';

/**
 * 電子署名管理コンポーネント
 *
 * @description
 * MAIMLファイルのDocument全体に対する電子署名（XMLDSig）の
 * 実行・削除・状態確認を行うメインコンポーネント。
 *
 * 暗号化と異なり、署名は特定の要素を選択する必要がなく
 * Document全体に対して一括適用される。
 *
 * @remarks スタブ実装中 - バックエンドAPI実装後に signatureService.ts を更新してください
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  Tag,
  Spin,
  Typography,
  Divider,
  App,
} from 'antd';
import {
  SafetyCertificateOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import * as signatureService from '@/services/signatureService';
import type { SignatureStatus } from '@/types/signature';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

interface SignatureManagementProps {
  /** 対象プロジェクト名 */
  projectName: string;
}

const SignatureManagement: React.FC<SignatureManagementProps> = ({ projectName }) => {
  const { message } = App.useApp();

  // ---------------------------------------------------------------------------
  // 状態管理
  // ---------------------------------------------------------------------------
  const { t } = useLanguage();
  const [statusLoading, setStatusLoading] = useState(true);
  const [signStatus, setSignStatus] = useState<SignatureStatus>({ status: 'none' });
  const [applying, setApplying] = useState(false);
  const [removing, setRemoving] = useState(false);

  // ---------------------------------------------------------------------------
  // データ取得
  // ---------------------------------------------------------------------------

  /** 署名ステータスを取得 */
  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const result = await signatureService.getSignatureStatus(projectName);
      setSignStatus(result);
    } catch {
      message.error(t('signature.loadFailed'));
    } finally {
      setStatusLoading(false);
    }
  }, [projectName, message]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ---------------------------------------------------------------------------
  // イベントハンドラ
  // ---------------------------------------------------------------------------

  /** 署名を実行する */
  const handleApplySignature = useCallback(async () => {
    setApplying(true);
    try {
      await signatureService.applySignature(projectName);
      setSignStatus({
        status: 'signed',
        signedAt: new Date().toISOString(),
      });
      message.success(t('signature.signSuccess'));
    } catch {
      message.error(t('signature.signFailed'));
    } finally {
      setApplying(false);
    }
  }, [projectName, message]);

  /** 署名を削除する */
  const handleRemoveSignature = useCallback(async () => {
    setRemoving(true);
    try {
      await signatureService.removeSignature(projectName);
      setSignStatus({ status: 'none' });
      message.success(t('signature.deleteSuccess'));
    } catch {
      message.error(t('signature.deleteFailed'));
    } finally {
      setRemoving(false);
    }
  }, [projectName, message]);

  // ---------------------------------------------------------------------------
  // 描画ヘルパー
  // ---------------------------------------------------------------------------

  /** 署名日時を日本語形式でフォーマット */
  const formatSignedAt = (isoString?: string): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%', padding: '16px 0' }}>

      {/* 署名状態カード */}
      <Card
        title={
          <Space>
            <SafetyCertificateOutlined />
            <span>署名状態</span>
          </Space>
        }
        extra={
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadStatus}
            loading={statusLoading}
          >
            更新
          </Button>
        }
      >
        {statusLoading ? (
          <Spin />
        ) : (
          <Space orientation="vertical" size="small">
            <Space>
              <Text type="secondary">現在の状態:</Text>
              {signStatus.status === 'signed' ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  署名済み
                </Tag>
              ) : (
                <Tag color="warning" icon={<ExclamationCircleOutlined />}>
                  署名なし
                </Tag>
              )}
            </Space>
            <Space>
              <Text type="secondary">最終署名日時:</Text>
              <Text>{formatSignedAt(signStatus.signedAt)}</Text>
            </Space>
          </Space>
        )}
      </Card>

      {/* 操作カード */}
      <Card
        title={
          <Space>
            <span>操作</span>
          </Space>
        }
      >
        <Space wrap>
          <Button
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={handleApplySignature}
            loading={applying}
            disabled={statusLoading}
          >
            署名を実行
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleRemoveSignature}
            loading={removing}
            disabled={statusLoading || signStatus.status !== 'signed'}
          >
            署名を削除
          </Button>
        </Space>
        <Divider style={{ margin: '12px 0' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          ※ 署名を実行すると、MAIMLファイルのアーカイブファイルが作成されます
        </Text>
      </Card>

      {/* 注意事項 */}
      <Alert
        type="warning"
        message="注意事項"
        description={
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
            <li>署名はDocument全体に適用されます</li>
            <li>暗号化を実行すると、既存の署名は無効化されます</li>
            <li>暗号化後は必ず再署名を実行してください</li>
            <li>署名を実行するとアーカイブファイルが作成されます</li>
          </ul>
        }
        showIcon
      />

    </Space>
  );
};

export default SignatureManagement;
