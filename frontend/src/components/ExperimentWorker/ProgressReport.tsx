'use client';

import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Progress,
  Space,
  Typography,
  Empty,
  Button,
  Form,
  Select,
  Slider,
  Input,
  Divider,
  message,
} from 'antd';
import { BarChartOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { TransitionProgress, ProgressStatus } from '@/types/experimentWorker';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ProgressReportProps {
  progressData: TransitionProgress[];
}

// 報告タイプの定義
type ReportType = 'progress' | 'issue' | 'milestone';

// 問題タイプの定義
type IssueType = 'technical' | 'resource' | 'schedule' | 'quality' | 'other';

// ステータスの表示色を取得
const getStatusColor = (status: ProgressStatus): string => {
  switch (status) {
    case 'not_started':
      return 'default';
    case 'in_progress':
      return 'blue';
    case 'completed':
      return 'green';
    case 'on_hold':
      return 'orange';
    case 'issue':
      return 'red';
    default:
      return 'default';
  }
};

// ステータスのラベルを取得
const getStatusLabel = (status: ProgressStatus): string => {
  switch (status) {
    case 'not_started':
      return '未着手';
    case 'in_progress':
      return '進行中';
    case 'completed':
      return '完了';
    case 'on_hold':
      return '保留';
    case 'issue':
      return '課題あり';
    default:
      return '不明';
  }
};

/**
 * 進捗報告コンポーネント
 * トランジションの進捗状況を一覧表示
 * チェックボックスで選択したトランジションに対して進捗報告を入力
 */
export default function ProgressReport({ progressData }: ProgressReportProps) {
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [reportType, setReportType] = useState<ReportType>('progress');
  const [status, setStatus] = useState<ProgressStatus>('in_progress');
  const [progressRate, setProgressRate] = useState<number>(0);
  const [issueType, setIssueType] = useState<IssueType>('technical');
  const [comment, setComment] = useState<string>('');

  if (!progressData || progressData.length === 0) {
    return (
      <Card>
        <Empty description="進捗データがありません" />
      </Card>
    );
  }

  // 行選択の設定
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // テーブルの列定義
  const columns: ColumnsType<TransitionProgress> = [
    {
      title: 'トランジション名',
      dataIndex: 'transitionName',
      key: 'transitionName',
      width: 200,
      render: (text: string, record: TransitionProgress) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.transitionId}
          </Text>
        </div>
      ),
    },
    {
      title: '進捗率',
      dataIndex: 'progressRate',
      key: 'progressRate',
      width: 180,
      render: (rate: number) => (
        <Space>
          <Progress
            percent={rate}
            size="small"
            style={{ width: 120 }}
            status={rate === 100 ? 'success' : rate === 0 ? 'exception' : 'active'}
          />
        </Space>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ProgressStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '進捗報告数',
      dataIndex: 'reportCount',
      key: 'reportCount',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
      ),
    },
    {
      title: '未解決課題数',
      dataIndex: 'issueCount',
      key: 'issueCount',
      width: 120,
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'red' : 'default'}>{count}</Tag>
      ),
    },
  ];

  // サマリー統計
  const totalCount = progressData.length;
  const completedCount = progressData.filter((p) => p.status === 'completed').length;
  const inProgressCount = progressData.filter((p) => p.status === 'in_progress').length;
  const notStartedCount = progressData.filter((p) => p.status === 'not_started').length;
  const issueCount = progressData.filter((p) => p.status === 'issue').length;
  const avgProgress = totalCount > 0
    ? Math.round(progressData.reduce((sum, p) => sum + p.progressRate, 0) / totalCount)
    : 0;

  // フォームクリア
  const handleClear = () => {
    setComment('');
    setProgressRate(0);
    form.resetFields();
  };

  // 報告送信
  const handleSubmit = () => {
    if (reportType === 'issue' && !comment.trim()) {
      message.warning('問題報告にはコメントが必須です');
      return;
    }

    // TODO: バックエンドAPIへの送信処理を実装
    console.log('報告送信:', {
      reportType,
      selectedTransitions: selectedRowKeys,
      status: reportType === 'progress' ? status : undefined,
      progressRate: reportType === 'progress' ? progressRate : undefined,
      issueType: reportType === 'issue' ? issueType : undefined,
      comment,
    });

    message.success('進捗報告を送信しました');
    handleClear();
    setSelectedRowKeys([]);
  };

  return (
    <div>
      {/* サマリー情報 */}
      <Space size="large" wrap style={{ marginBottom: 24 }}>
        <Card size="small" style={{ minWidth: 150 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>合計トランジション数</Text>
          <Title level={3} style={{ margin: 0 }}>{totalCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>完了</Text>
          <Title level={3} style={{ margin: 0, color: '#52c41a' }}>{completedCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>進行中</Text>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>{inProgressCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>未着手</Text>
          <Title level={3} style={{ margin: 0, color: '#8c8c8c' }}>{notStartedCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>課題あり</Text>
          <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>{issueCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 140 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>平均進捗率</Text>
          <Title level={3} style={{ margin: 0 }}>{avgProgress}%</Title>
        </Card>
      </Space>

      {/* トランジション一覧 */}
      <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 0 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          トランジション一覧
        </Title>
        <Text type="secondary">
          選択中: {selectedRowKeys.length} / {totalCount} 件
        </Text>
      </Space>

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={progressData}
        rowKey={(record) => `${record.transitionId}-${record.methodId}`}
        pagination={{ pageSize: 10 }}
        size="small"
        scroll={{ x: 900 }}
      />

      {/* 進捗報告フォーム */}
      {selectedRowKeys.length > 0 && (
        <Card
          style={{ marginTop: 24 }}
          title={
            <Space>
              <FileTextOutlined style={{ color: '#1890ff' }} />
              <span>進捗報告</span>
              <Tag color="blue">{selectedRowKeys.length} 件選択中</Tag>
            </Space>
          }
        >
          <Form form={form} layout="vertical">
            {/* 報告タイプ選択 */}
            <Form.Item label="報告タイプ" name="reportType" initialValue="progress">
              <Select
                value={reportType}
                onChange={(value: ReportType) => setReportType(value)}
                options={[
                  { label: '進捗更新', value: 'progress' },
                  { label: '問題報告', value: 'issue' },
                  { label: 'マイルストーン到達', value: 'milestone' },
                ]}
              />
            </Form.Item>

            <Divider />

            {/* 進捗更新フォーム */}
            {reportType === 'progress' && (
              <>
                <Form.Item label="ステータス" name="status" initialValue="in_progress">
                  <Select
                    value={status}
                    onChange={(value: ProgressStatus) => setStatus(value)}
                    options={[
                      { label: '未着手', value: 'not_started' },
                      { label: '進行中', value: 'in_progress' },
                      { label: '完了', value: 'completed' },
                      { label: '保留', value: 'on_hold' },
                      { label: '課題あり', value: 'issue' },
                    ]}
                  />
                </Form.Item>

                <Form.Item label={`進捗率: ${progressRate}%`} name="progressRate">
                  <Slider
                    value={progressRate}
                    onChange={(value: number) => setProgressRate(value)}
                    step={5}
                    marks={{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
                    tooltip={{ formatter: (value) => `${value}%` }}
                  />
                </Form.Item>

                <Form.Item label="コメント" name="comment">
                  <TextArea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="進捗状況の詳細を入力してください"
                  />
                </Form.Item>
              </>
            )}

            {/* 問題報告フォーム */}
            {reportType === 'issue' && (
              <>
                <Form.Item label="問題タイプ" name="issueType" initialValue="technical">
                  <Select
                    value={issueType}
                    onChange={(value: IssueType) => setIssueType(value)}
                    options={[
                      { label: '技術的問題', value: 'technical' },
                      { label: 'リソース不足', value: 'resource' },
                      { label: 'スケジュール遅延', value: 'schedule' },
                      { label: '品質問題', value: 'quality' },
                      { label: 'その他', value: 'other' },
                    ]}
                  />
                </Form.Item>

                <Form.Item
                  label="コメント"
                  name="comment"
                  rules={[{ required: true, message: '問題の詳細を入力してください' }]}
                >
                  <TextArea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="問題の詳細を入力してください"
                  />
                </Form.Item>
              </>
            )}

            {/* マイルストーン到達フォーム */}
            {reportType === 'milestone' && (
              <Form.Item label="コメント" name="comment">
                <TextArea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="マイルストーン到達の詳細を入力してください"
                />
              </Form.Item>
            )}

            {/* 送信ボタン */}
            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ float: 'right' }}>
                <Button onClick={handleClear}>クリア</Button>
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  disabled={reportType === 'issue' && !comment.trim()}
                >
                  報告を送信
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}
