'use client';

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  message,
  Typography,
} from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Task, IssueStatus } from '@/types/experimentWorker';

const { TextArea } = Input;
const { Text } = Typography;

interface IssueReportModalProps {
  visible: boolean;
  task: Task | null;
  initialStatus?: IssueStatus; // 問題の初期ステータス（デフォルト: 'unresolved'）
  onClose: () => void;
  onCommentSubmit?: (taskId: string, comment: string) => void;
  onStatusChange?: (taskId: string, newStatus: IssueStatus) => void;
}

/**
 * 問題報告モーダル
 * サブタスク一覧の「報告」ボタンから呼び出される独立したモーダル
 * 
 * Phase 2026-01-06: UI修正
 * - 問題タイプコンボボックスを削除
 * - ステータス変更ボタンを追加（未解決/解決）
 * - コメント送信ボタンに名称変更
 * 
 * Note: destroyOnClose=trueにより、モーダルが閉じる度にコンポーネントが破棄され、
 * 次回開く時には新しいインスタンスが作成されるため、initialStatusが正しく反映される
 */
export default function IssueReportModal({
  visible,
  task,
  initialStatus = 'unresolved',
  onClose,
  onCommentSubmit,
  onStatusChange
}: IssueReportModalProps) {
  const [form] = Form.useForm();
  const [comment, setComment] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<IssueStatus>(initialStatus);

  // フォームクリア
  const handleClear = () => {
    form.resetFields();
    setComment('');
  };

  // コメント送信
  const handleCommentSubmit = () => {
    if (!task) {
      message.error('タスク情報が見つかりません');
      return;
    }

    if (!comment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    // TODO: バックエンドAPIへの送信処理を実装
    console.log('コメント送信:', {
      taskId: task.taskId,
      comment: comment.trim(),
    });

    if (onCommentSubmit) {
      onCommentSubmit(task.taskId, comment.trim());
    }

    message.success('コメントを送信しました');
    setComment('');
    form.setFieldsValue({ comment: '' });
  };

  // ステータスを「未解決」に変更
  const handleSetUnresolved = () => {
    if (!task) {
      message.error('タスク情報が見つかりません');
      return;
    }

    if (!comment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    // TODO: バックエンドAPIへの送信処理を実装
    console.log('ステータス変更（未解決）:', {
      taskId: task.taskId,
      newStatus: 'unresolved',
      comment: comment.trim(),
    });

    if (onStatusChange) {
      onStatusChange(task.taskId, 'unresolved');
    }

    setCurrentStatus('unresolved');
    message.success('ステータスを「未解決」に変更しました');
    setComment('');
    form.setFieldsValue({ comment: '' });
  };

  // ステータスを「解決済」に変更
  const handleSetResolved = () => {
    if (!task) {
      message.error('タスク情報が見つかりません');
      return;
    }

    if (!comment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    // TODO: バックエンドAPIへの送信処理を実装
    console.log('ステータス変更（解決済）:', {
      taskId: task.taskId,
      newStatus: 'resolved',
      comment: comment.trim(),
    });

    if (onStatusChange) {
      onStatusChange(task.taskId, 'resolved');
    }

    setCurrentStatus('resolved');
    message.success('ステータスを「解決済」に変更しました');
    setComment('');
    form.setFieldsValue({ comment: '' });
  };

  // モーダルを閉じる際の処理
  const handleCancel = () => {
    handleClear();
    onClose();
  };

  // ボタンの活性状態を判定
  const hasComment = comment.trim().length > 0;
  const canResolve = hasComment && currentStatus === 'unresolved';
  const canUnresolve = hasComment && currentStatus === 'resolved';

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>問題報告</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      {/* タスク情報表示 */}
      {task && (
        <div
          style={{
            background: '#f5f5f5',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '24px',
          }}
        >
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '14px' }}>
              メソッド: {task.methodName}
            </Text>
            <Text style={{ fontSize: '14px', color: '#595959' }}>
              タスク: {task.taskName}
            </Text>
          </Space>
        </div>
      )}

      {/* ステータス表示 */}
      <div style={{ marginBottom: '16px' }}>
        <Text strong>現在のステータス: </Text>
        <Text
          style={{
            color: currentStatus === 'unresolved' ? '#faad14' : '#52c41a',
            fontWeight: 'bold',
          }}
        >
          {currentStatus === 'unresolved' ? '未解決' : '解決済'}
        </Text>
      </div>

      {/* 問題報告フォーム */}
      <Form form={form} layout="vertical">
        <Form.Item
          label="コメントを追加"
          name="comment"
          rules={[
            { required: true, message: 'コメントを入力してください' },
          ]}
        >
          <TextArea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={6}
            placeholder="コメントを入力してください"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* ボタンエリア */}
        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
            {/* 左側: キャンセル・クリア */}
            <Space>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
              <Button onClick={handleClear}>
                クリア
              </Button>
            </Space>
            
            {/* 右側: コメント送信・未解決・解決 */}
            <Space>
              <Button
                type="primary"
                onClick={handleCommentSubmit}
                disabled={!hasComment}
              >
                コメント送信
              </Button>
              <Button
                onClick={handleSetUnresolved}
                disabled={!canUnresolve}
              >
                未解決
              </Button>
              <Button
                onClick={handleSetResolved}
                disabled={!canResolve}
                style={{
                  backgroundColor: canResolve ? '#52c41a' : undefined,
                  borderColor: canResolve ? '#52c41a' : undefined,
                  color: canResolve ? '#fff' : undefined,
                }}
              >
                解決
              </Button>
            </Space>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
