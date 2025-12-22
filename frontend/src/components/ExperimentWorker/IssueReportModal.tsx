'use client';

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  message,
  Typography,
} from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Task, IssueType, IssueReportData } from '@/types/experimentWorker';

const { TextArea } = Input;
const { Text } = Typography;

interface IssueReportModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSubmit?: (data: IssueReportData) => void;
}

/**
 * 問題報告モーダル
 * サブタスク一覧の「報告」ボタンから呼び出される独立したモーダル
 */
export default function IssueReportModal({
  visible,
  task,
  onClose,
  onSubmit
}: IssueReportModalProps) {
  const [form] = Form.useForm();
  const [issueType, setIssueType] = useState<IssueType>('material_shortage');
  const [comment, setComment] = useState<string>('');

  // フォームクリア
  const handleClear = () => {
    form.resetFields();
    setIssueType('material_shortage');
    setComment('');
  };

  // 報告送信
  const handleSubmit = () => {
    if (!task) {
      message.error('タスク情報が見つかりません');
      return;
    }

    if (!comment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    const reportData: IssueReportData = {
      taskId: task.taskId,
      issueType,
      comment: comment.trim(),
    };

    // TODO: バックエンドAPIへの送信処理を実装
    console.log('問題報告送信:', reportData);

    if (onSubmit) {
      onSubmit(reportData);
    }

    message.success('問題報告を送信しました');
    handleClear();
    onClose();
  };

  // モーダルを閉じる際の処理
  const handleCancel = () => {
    handleClear();
    onClose();
  };

  // 問題タイプの選択肢
  const issueTypeOptions = [
    { label: '材料不足', value: 'material_shortage' },
    { label: '機器故障', value: 'equipment_failure' },
    { label: '手順不明確', value: 'procedure_unclear' },
    { label: '安全性の懸念', value: 'safety_concern' },
    { label: '品質問題', value: 'quality_issue' },
    { label: '時間制約', value: 'time_constraint' },
    { label: 'その他', value: 'other' },
  ];

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

      {/* 問題報告フォーム */}
      <Form form={form} layout="vertical">
        <Form.Item
          label="問題タイプ"
          name="issueType"
          initialValue="material_shortage"
        >
          <Select
            value={issueType}
            onChange={(value: IssueType) => setIssueType(value)}
            options={issueTypeOptions}
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="コメント"
          name="comment"
          rules={[
            { required: true, message: '問題の詳細を入力してください' },
            { min: 10, message: 'コメントは10文字以上で入力してください' },
          ]}
        >
          <TextArea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={6}
            placeholder="問題の詳細を具体的に入力してください&#13;&#10;例: 〇〇の材料が不足しており、実験を続行できません。"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 送信ボタン */}
        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ float: 'right' }}>
            <Button onClick={handleCancel}>
              キャンセル
            </Button>
            <Button onClick={handleClear}>
              クリア
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={!comment.trim()}
            >
              報告
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
