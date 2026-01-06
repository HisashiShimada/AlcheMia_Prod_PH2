'use client';

import React, { useState, useMemo } from 'react';
import {
  Modal,
  Table,
  Button,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Card,
  List,
  Divider,
  message,
  Row,
  Col,
} from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Issue,
  IssueStatus,
  IssueTargetType,
  IssueReportFormData,
  IssueComment,
} from '@/types/experimentWorker';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface IssueManagementModalProps {
  visible: boolean;
  transitionId: string;
  transitionName: string;
  issues: Issue[];
  onClose: () => void;
  onSubmitIssue?: (issue: IssueReportFormData) => void;
  onSubmitComment?: (issueId: string, comment: string) => void;
  onUpdateStatus?: (issueId: string, status: IssueStatus) => void;
  viewMode?: boolean; // 参照専用モード（デフォルト: false）
  filterTaskId?: string; // フィルタリング用タスクID
}

/**
 * 問題管理モーダル
 * トランジションに関連する問題の一覧表示、詳細閲覧、コメント入力機能を提供
 */
export default function IssueManagementModal({
  visible,
  transitionId,
  transitionName,
  issues,
  onClose,
  onSubmitIssue,
  onSubmitComment,
  onUpdateStatus,
  viewMode = false,
  filterTaskId,
}: IssueManagementModalProps) {
  const [form] = Form.useForm();
  const [commentForm] = Form.useForm();
  
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  // フィルタリング用のstate
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');

  // フィルタリングされた問題一覧
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // タスクIDフィルタ（参照専用モード用）
      if (filterTaskId && issue.taskId !== filterTaskId) {
        return false;
      }
      
      // あいまい検索（タイトル、内容）
      const matchesSearch =
        searchText === '' ||
        issue.title.toLowerCase().includes(searchText.toLowerCase()) ||
        issue.content.toLowerCase().includes(searchText.toLowerCase());

      // ステータスフィルタ
      const matchesStatus =
        statusFilter === 'all' || issue.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [issues, searchText, statusFilter, filterTaskId]);

  // 問題ステータス表示用のヘルパー関数
  const getStatusTag = (status: IssueStatus) => {
    if (status === 'resolved') {
      return (
        <Tag icon={<CheckCircleOutlined />} color="success">
          解決済
        </Tag>
      );
    }
    return (
      <Tag icon={<ExclamationCircleOutlined />} color="warning">
        未解決
      </Tag>
    );
  };

  // 対象タイプ表示用のヘルパー関数
  const getTargetTypeText = (targetType: IssueTargetType) => {
    const typeMap = {
      project: 'プロジェクト',
      task: 'タスク',
      transition: 'トランジション',
    };
    return typeMap[targetType] || targetType;
  };

  // 対象名を取得するヘルパー関数
  const getTargetName = (issue: Issue): string => {
    switch (issue.targetType) {
      case 'project':
        return issue.projectName || '';
      case 'task':
        return issue.taskName || '';
      case 'transition':
        return issue.transitionName || '';
      default:
        return '';
    }
  };

  // 問題一覧テーブルの列定義（2行表示）
  const columns: ColumnsType<Issue> = [
    {
      title: '問題情報',
      key: 'issueInfo',
      render: (_, record: Issue) => (
        <div style={{ padding: '4px 0' }}>
          {/* 上段: タイトル */}
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: '14px' }}>
              {record.title}
            </Text>
          </div>
          {/* 下段: 状態と対象 */}
          <Space size="middle">
            {getStatusTag(record.status)}
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {getTargetTypeText(record.targetType)}
              {getTargetName(record) && (
                <>: {getTargetName(record)}</>
              )}
            </Text>
          </Space>
        </div>
      ),
    },
  ];

  // 新規問題報告フォームの送信
  const handleSubmitNewIssue = async () => {
    try {
      const values = await form.validateFields();
      
      if (onSubmitIssue) {
        onSubmitIssue(values as IssueReportFormData);
      }

      message.success('問題を報告しました');
      form.resetFields();
      setShowNewIssueForm(false);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // コメント送信
  const handleCommentSubmit = () => {
    if (!selectedIssue) return;
    
    if (!newComment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    // コメントを送信
    if (onSubmitComment) {
      onSubmitComment(selectedIssue.issueId, newComment.trim());
    }

    message.success('コメントを送信しました');
    setNewComment('');
    commentForm.resetFields();
  };

  // ステータスを「未解決」に変更
  const handleSetUnresolved = () => {
    if (!selectedIssue) return;
    
    if (!newComment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    // コメントを送信
    if (onSubmitComment) {
      onSubmitComment(selectedIssue.issueId, newComment.trim());
    }

    // ステータスを更新
    if (onUpdateStatus) {
      onUpdateStatus(selectedIssue.issueId, 'unresolved');
    }

    message.success('ステータスを「未解決」に変更しました');
    setNewComment('');
    commentForm.resetFields();
  };

  // ステータスを「解決済」に変更
  const handleSetResolved = () => {
    if (!selectedIssue) return;
    
    if (!newComment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    // コメントを送信
    if (onSubmitComment) {
      onSubmitComment(selectedIssue.issueId, newComment.trim());
    }

    // ステータスを更新
    if (onUpdateStatus) {
      onUpdateStatus(selectedIssue.issueId, 'resolved');
    }

    message.success('ステータスを「解決済」に変更しました');
    setNewComment('');
    commentForm.resetFields();
  };

  // モーダルを閉じる
  const handleClose = () => {
    setSelectedIssue(null);
    setShowNewIssueForm(false);
    form.resetFields();
    commentForm.resetFields();
    setNewComment('');
    onClose();
  };

  // 問題選択時のハンドラ
  const handleSelectIssue = (issue: Issue) => {
    setSelectedIssue(issue);
    setShowNewIssueForm(false);
  };

  // 新規問題報告ボタン押下
  const handleNewIssueClick = () => {
    setShowNewIssueForm(true);
    setSelectedIssue(null);
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>問題報告 - {transitionName}</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      destroyOnClose
    >
      {/* 新規問題報告ボタン（参照専用モードでは非表示） */}
      {!viewMode && (
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleNewIssueClick}
          >
            新規問題報告
          </Button>
        </div>
      )}

      {/* 2カラムレイアウト */}
      <Row gutter={16}>
        {/* 左側: 問題一覧 */}
        <Col span={10}>
          <Card
            title="問題一覧"
            size="small"
            style={{ height: 'calc(70vh - 100px)' }}
            bodyStyle={{ padding: 12, overflow: 'auto', height: 'calc(100% - 38px)' }}
          >
            {/* フィルタUI */}
            <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 12 }}>
              <Input
                placeholder="タイトル、内容で検索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: '100%' }}
              />
              <Select
                placeholder="ステータスで絞り込み"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                style={{ width: '100%' }}
                allowClear
                onClear={() => setStatusFilter('all')}
              >
                <Select.Option value="all">すべて</Select.Option>
                <Select.Option value="unresolved">未解決</Select.Option>
                <Select.Option value="resolved">解決済</Select.Option>
              </Select>
            </Space>

            {/* テーブル */}
            <Table
              columns={columns}
              dataSource={filteredIssues}
              rowKey="issueId"
              size="small"
              pagination={false}
              scroll={{ y: 'calc(70vh - 280px)' }}
              onRow={(record) => ({
                onClick: () => handleSelectIssue(record),
                style: {
                  cursor: 'pointer',
                  backgroundColor:
                    selectedIssue?.issueId === record.issueId
                      ? '#e6f7ff'
                      : undefined,
                },
              })}
              locale={{
                emptyText: '問題が報告されていません',
              }}
            />
          </Card>
        </Col>

        {/* 右側: 問題詳細または新規報告フォーム */}
        <Col span={14}>
          <Card
            title={showNewIssueForm ? '新規問題報告' : '問題詳細'}
            size="small"
            style={{ height: 'calc(70vh - 100px)' }}
            bodyStyle={{ padding: 16, overflow: 'auto', height: 'calc(100% - 38px)' }}
          >
            {/* 新規問題報告フォーム */}
            {showNewIssueForm && (
              <Form form={form} layout="vertical">
                <Form.Item
                  label="タイトル"
                  name="title"
                  rules={[
                    { required: true, message: 'タイトルを入力してください' },
                    { max: 100, message: 'タイトルは100文字以内で入力してください' },
                  ]}
                >
                  <Input placeholder="問題のタイトルを入力" maxLength={100} />
                </Form.Item>

                <Form.Item
                  label="対象"
                  name="targetType"
                  initialValue="transition"
                  rules={[{ required: true, message: '対象を選択してください' }]}
                >
                  <Select>
                    <Select.Option value="project">プロジェクト</Select.Option>
                    <Select.Option value="task">タスク</Select.Option>
                    <Select.Option value="transition">トランジション</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="問題タイプ"
                  name="issueType"
                  rules={[{ required: true, message: '問題タイプを選択してください' }]}
                >
                  <Select placeholder="問題タイプを選択">
                    <Select.Option value="material_shortage">材料不足</Select.Option>
                    <Select.Option value="equipment_failure">機器故障</Select.Option>
                    <Select.Option value="procedure_unclear">手順不明確</Select.Option>
                    <Select.Option value="safety_concern">安全性の懸念</Select.Option>
                    <Select.Option value="quality_issue">品質問題</Select.Option>
                    <Select.Option value="time_constraint">時間制約</Select.Option>
                    <Select.Option value="other">その他</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="内容"
                  name="content"
                  rules={[
                    { required: true, message: '内容を入力してください' },
                    { min: 10, message: '内容は10文字以上で入力してください' },
                  ]}
                >
                  <TextArea
                    rows={8}
                    placeholder="問題の詳細を具体的に入力してください"
                    maxLength={1000}
                    showCount
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space style={{ float: 'right' }}>
                    <Button onClick={() => setShowNewIssueForm(false)}>
                      キャンセル
                    </Button>
                    <Button type="primary" onClick={handleSubmitNewIssue}>
                      保存
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            )}

            {/* 問題詳細表示 */}
            {!showNewIssueForm && selectedIssue && (
              <div>
                {/* 基本情報 */}
                <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
                  <div>
                    <Text type="secondary">タイトル:</Text>
                    <Title level={5} style={{ margin: '4px 0 0 0' }}>
                      {selectedIssue.title}
                    </Title>
                  </div>
                  <Space size="large">
                    <div>
                      <Text type="secondary">状態: </Text>
                      {getStatusTag(selectedIssue.status)}
                    </div>
                    <div>
                      <Text type="secondary">対象: </Text>
                      <Text>
                        {getTargetTypeText(selectedIssue.targetType)}
                        {getTargetName(selectedIssue) && (
                          <>: {getTargetName(selectedIssue)}</>
                        )}
                      </Text>
                    </div>
                  </Space>
                  <Space size="large">
                    <div>
                      <Text type="secondary">報告者: </Text>
                      <Text>{selectedIssue.reportedBy?.userName || '-'}</Text>
                    </div>
                    <div>
                      <Text type="secondary">報告時刻: </Text>
                      <Text>
                        {new Date(selectedIssue.reportedAt).toLocaleString('ja-JP')}
                      </Text>
                    </div>
                  </Space>
                </Space>

                <Divider style={{ margin: '12px 0' }} />

                {/* 内容 */}
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" strong>
                    内容:
                  </Text>
                  <div
                    style={{
                      marginTop: 8,
                      padding: 12,
                      backgroundColor: '#fafafa',
                      borderRadius: 4,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedIssue.content}
                  </div>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* コメント一覧 */}
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" strong>
                    コメント: ({selectedIssue.comments.length})
                  </Text>
                  <List
                    style={{ marginTop: 8, maxHeight: '200px', overflow: 'auto' }}
                    dataSource={selectedIssue.comments}
                    locale={{ emptyText: 'コメントがありません' }}
                    renderItem={(comment: IssueComment) => (
                      <List.Item style={{ padding: '8px 0' }}>
                        <div style={{ width: '100%' }}>
                          <div style={{ marginBottom: 4 }}>
                            <Text strong style={{ fontSize: '13px' }}>
                              {comment.createdBy.userName}
                            </Text>
                            <Text
                              type="secondary"
                              style={{ fontSize: '12px', marginLeft: 8 }}
                            >
                              {new Date(comment.createdAt).toLocaleString('ja-JP')}
                            </Text>
                          </div>
                          <div
                            style={{
                              padding: 8,
                              backgroundColor: '#f5f5f5',
                              borderRadius: 4,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {comment.content}
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>

                {/* コメント入力（参照専用モードでは非表示） */}
                {!viewMode && (
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" strong>
                      コメントを追加
                    </Text>
                    <TextArea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      placeholder="コメントを入力..."
                      maxLength={500}
                      showCount
                      style={{ marginTop: 8 }}
                    />
                  </div>
                )}

                {/* ボタンエリア（参照専用モードでは非表示） */}
                {!viewMode && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button
                      type="primary"
                      onClick={handleCommentSubmit}
                      disabled={!newComment.trim()}
                    >
                      コメント送信
                    </Button>
                    <Button
                      onClick={handleSetUnresolved}
                      disabled={!newComment.trim() || selectedIssue.status === 'unresolved'}
                    >
                      未解決
                    </Button>
                    <Button
                      onClick={handleSetResolved}
                      disabled={!newComment.trim() || selectedIssue.status === 'resolved'}
                      style={{
                        backgroundColor: newComment.trim() && selectedIssue.status === 'unresolved' ? '#52c41a' : undefined,
                        borderColor: newComment.trim() && selectedIssue.status === 'unresolved' ? '#52c41a' : undefined,
                        color: newComment.trim() && selectedIssue.status === 'unresolved' ? '#fff' : undefined,
                      }}
                    >
                      解決
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 問題未選択時 */}
            {!showNewIssueForm && !selectedIssue && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#999',
                }}
              >
                <Text type="secondary">問題を選択してください</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}
