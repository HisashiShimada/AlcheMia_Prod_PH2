'use client';

import React from 'react';
import { Modal, Button, Space, Alert, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Draft復元確認ダイアログ
 * 
 * ローカルストレージに保存されているDraftデータを復元するかどうかをユーザーに確認する
 */

interface DraftRestoreDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** ダイアログを閉じるコールバック */
  onClose: () => void;
  /** Draft復元を選択したときのコールバック */
  onRestoreDraft: () => void;
  /** 新規作成/既存ファイルを開くを選択したときのコールバック */
  onCreateNew: () => void;
  /** Draft情報 */
  draftInfo: {
    /** 最終保存日時 */
    savedAt: string;
    /** Method数 */
    methodCount: number;
    /** ノード数 */
    nodeCount: number;
  };
}

/**
 * Draft復元確認ダイアログコンポーネント
 */
export default function DraftRestoreDialog({
  open,
  onClose,
  onRestoreDraft,
  onCreateNew,
  draftInfo
}: DraftRestoreDialogProps) {
  return (
    <Modal
      title={
        <Space>
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
          <span>一時保存データの復元</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="new" onClick={onCreateNew}>
          新規作成/既存ファイルを開く
        </Button>,
        <Button key="restore" type="primary" onClick={onRestoreDraft}>
          一時保存を復元する
        </Button>
      ]}
      width={500}
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          message="一時保存データが見つかりました"
          description={`最終保存: ${new Date(draftInfo.savedAt).toLocaleString('ja-JP')}`}
          type="info"
          showIcon
        />
        
        <div style={{ 
          padding: '16px', 
          background: '#f5f5f5', 
          borderRadius: '4px' 
        }}>
          <Space orientation="vertical" size="small">
            <Text>
              <strong>Method数:</strong> {draftInfo.methodCount}
            </Text>
            <Text>
              <strong>ノード数:</strong> {draftInfo.nodeCount}
            </Text>
          </Space>
        </div>

        <Alert
          message="注意"
          description="一時保存を復元しない場合、最新の保存済みファイルまたは新規作成から開始します。"
          type="warning"
          showIcon
        />
      </Space>
    </Modal>
  );
}
