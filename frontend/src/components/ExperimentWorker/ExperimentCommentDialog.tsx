'use client';

/**
 * 実験コメントダイアログ
 *
 * 実験中の気づきや注意点をコメントとして記録するダイアログ。
 * 現フェーズ（モック）: onSave コールバックを呼び出すのみ。バックエンドAPIへの保存は別フェーズで実装。
 */

import React, { useState, useCallback } from 'react';
import { Modal, Typography, Input, Space, Divider } from 'antd';
import { CommentOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ExperimentCommentDialogProps {
  open: boolean;
  /** コメントを紐付けるタスクNo */
  taskNo: number;
  /** コメントを紐付けるトランジションID */
  transitionId: string;
  /** ダイアログを閉じる */
  onClose: () => void;
  /** コメントを保存する（保存処理は呼び出し元が担当） */
  onSave: (comment: string) => void;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// コンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_COMMENT_LENGTH = 500;

export default function ExperimentCommentDialog({
  open,
  taskNo,
  transitionId,
  onClose,
  onSave,
}: ExperimentCommentDialogProps) {
  const [comment, setComment] = useState('');

  // ダイアログが閉じられるたびにコメント入力欄をリセット
  const handleClose = useCallback(() => {
    setComment('');
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setComment('');
    onClose();
  }, [comment, onSave, onClose]);

  return (
    <Modal
      title={
        <Space>
          <CommentOutlined style={{ color: '#1677ff' }} />
          <span>実験コメントを記録</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      onOk={handleSave}
      okText="保存"
      cancelText="キャンセル"
      okButtonProps={{ disabled: !comment.trim() }}
      width={560}
      destroyOnHidden
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 対象情報 */}
        <div
          style={{
            padding: '8px 12px',
            background: '#f5f5f5',
            borderRadius: 6,
            border: '1px solid #d9d9d9',
          }}
        >
          <Space split={<Divider type="vertical" style={{ margin: 0 }} />}>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>タスクNo</Text>
              <Text strong style={{ fontSize: 13 }}>#{taskNo}</Text>
            </Space>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>トランジション</Text>
              <Text code style={{ fontSize: 11 }}>{transitionId}</Text>
            </Space>
          </Space>
        </div>

        {/* コメント入力 */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            コメント <Text type="danger">*</Text>
          </Text>
          <TextArea
            rows={6}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="実験中に気づいたこと、異常・注意点、メモなどを入力してください"
            maxLength={MAX_COMMENT_LENGTH}
            showCount
            autoFocus
          />
        </div>
      </Space>
    </Modal>
  );
}
