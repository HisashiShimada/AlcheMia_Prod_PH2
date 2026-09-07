'use client';

/**
 * 鍵ローテーションモーダル
 *
 * @description
 * 選択した鍵で暗号化された EncryptedData を全て新しい鍵で再暗号化するモーダル。
 * バックエンド未実装のためスタブ表示。
 */

import React, { useState } from 'react';
import { App, Modal, Typography, Alert, Descriptions } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import type { EncryptionKey } from '@/types/encryption';
import * as encryptionService from '@/services/encryptionService';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

interface KeyRotateModalProps {
  open: boolean;
  /** ローテーション対象の鍵 */
  targetKey: EncryptionKey | null;
  onClose: () => void;
  /** ローテーション完了後のコールバック */
  onRotated?: () => void;
}

const KeyRotateModal: React.FC<KeyRotateModalProps> = ({
  open,
  targetKey,
  onClose,
  onRotated,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // ローテーション処理
  // ---------------------------------------------------------------------------

  const handleOk = async () => {
    if (!targetKey) return;
    setLoading(true);
    try {
      const result = await encryptionService.rotateKey(targetKey.keyId);

      if (result.status === 'not_implemented') {
        message.warning(result.message);
      } else {
        message.success(
          `鍵ローテーションを開始しました。対象データ: ${result.targetCount} 件`,
        );
      }
      onRotated?.();
      onClose();
    } catch {
      message.error(t('encryption.keyRotate.failed'));
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  return (
    <Modal
      title={
        <span>
          <SyncOutlined style={{ marginRight: 8 }} />
          鍵ローテーション
        </span>
      }
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="ローテーションを実行"
      cancelText="キャンセル"
      confirmLoading={loading}
      destroyOnHidden
    >
      {targetKey && (
        <>
          <Alert
            type="warning"
            showIcon
            message="この鍵で暗号化された全ての EncryptedData を新しい鍵で再暗号化します。処理中はデータの読み書きができなくなる場合があります。"
            style={{ marginBottom: 16, fontSize: 12 }}
          />

          <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="対象鍵（識別子）">
              <Text code style={{ fontSize: 12 }}>
                {targetKey.keyIdentifier ?? targetKey.keyId}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="鍵名">
              {targetKey.keyName}
            </Descriptions.Item>
            <Descriptions.Item label="暗号化データ件数">
              {targetKey.usageCount.toLocaleString()} 件
            </Descriptions.Item>
          </Descriptions>

          <Alert
            type="info"
            showIcon
            message="鍵ローテーション機能は現在実装中です。本機能は近日中に提供予定です。"
            style={{ fontSize: 12 }}
          />
        </>
      )}
    </Modal>
  );
};

export default KeyRotateModal;
