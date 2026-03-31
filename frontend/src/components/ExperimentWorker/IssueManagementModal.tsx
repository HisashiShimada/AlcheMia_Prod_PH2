'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCodeMaster } from '@/hooks/useCodeMaster';
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
  Spin,
} from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Issue,
  IssueStatus,
  IssueTargetType,
  IssueComment,
  ProjectStatus,
} from '@/types/experimentWorker';
import {
  getIssues,
  createIssue,
  addComment,
  updateIssueStatus,
} from '@/services/issueApiService';
import { extractErrorMessage } from '@/utils/errorUtils';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface IssueManagementModalProps {
  open: boolean;
  /** タイトルに表示する名前 */
  targetName: string;
  /** 問題一覧取得・新規報告に必要なプロジェクトID */
  projectId: string;
  /** コメント追加・ステータス変更に必要なプロジェクト名 */
  projectName: string;
  /** オプション: 省略時はプロジェクト全件を取得 */
  methodId?: string;
  /** オプション: タスク単位の絞り込みに使用 */
  taskNo?: number;
  /** オプション: トランジション単位の絞り込みに使用 */
  transitionId?: string;
  onClose: () => void;
  viewMode?: boolean; // 参照専用モード（デフォルト: false）
  filterTaskId?: string; // フィルタリング用タスクID
  projectStatus?: ProjectStatus | null; // プロジェクトステータス（編集可否の判定用）
}

/**
 * 問題管理モーダル
 * 問題一覧の取得・新規報告・コメント送信・ステータス変更をモーダル内部で行う
 */
export default function IssueManagementModal({
  open,
  targetName,
  projectId,
  projectName,
  methodId,
  taskNo,
  transitionId,
  onClose,
  viewMode = false,
  filterTaskId,
  projectStatus,
}: IssueManagementModalProps) {
  const [form] = Form.useForm();
  const [commentForm] = Form.useForm();

  // 問題一覧（内部state）
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  // 選択中の問題IDのみをstateで保持する
  // selectedIssue 自体は issues state から useMemo で導出することで、
  // 再取得のたびに自動的に最新データが反映される
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newComment, setNewComment] = useState('');

  // フィルタリング用のstate
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');

  // 問題タイプ選択肢をコードマスターAPIから取得
  const { options: issueTypeOptions, loading: issueTypeLoading } = useCodeMaster('issue_type');

  // プロジェクトが承認依頼中の場合は編集不可
  const isApprovalPending = projectStatus === 'waiting_approval';
  const isEditDisabled = viewMode || isApprovalPending;

  // 問題一覧を再取得する関数
  const fetchIssues = useCallback(async () => {
    if (!projectId) return;
    setIssuesLoading(true);
    try {
      const data = await getIssues({ projectId, methodId, taskNo, transitionId });
      setIssues(data);
    } catch (error) {
      console.error('[IssueManagementModal] fetchIssues error:', error);
      message.error(extractErrorMessage(error));
    } finally {
      setIssuesLoading(false);
    }
  }, [projectId, methodId, taskNo, transitionId]);

  // モーダルが開いた時に問題一覧を取得する
  useEffect(() => {
    if (open) {
      fetchIssues();
    }
  }, [open, fetchIssues]);

  // 選択中の問題を issues state から導出する
  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.issueId === selectedIssueId) ?? null,
    [issues, selectedIssueId]
  );

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
        (issue.title ?? '').toLowerCase().includes(searchText.toLowerCase()) ||
        (issue.content ?? '').toLowerCase().includes(searchText.toLowerCase());

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

      await createIssue({
        projectId,
        methodId,
        issueType: values.issueType,
        targetType: values.targetType,
        taskNo,
        transitionId,
        title: values.title,
        description: values.content,
      });

      message.success('問題を報告しました');
      form.resetFields();
      setShowNewIssueForm(false);
      // 一覧を再取得
      await fetchIssues();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // Form validation error - do nothing
        return;
      }
      console.error('[IssueManagementModal] handleSubmitNewIssue error:', error);
      message.error(extractErrorMessage(error));
    }
  };

  // コメント送信
  const handleCommentSubmit = async () => {
    if (!selectedIssue) return;

    if (!newComment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    try {
      await addComment({
        projectName,
        issueId: selectedIssue.issueId,
        comment: newComment.trim(),
      });

      message.success('コメントを送信しました');
      setNewComment('');
      commentForm.resetFields();
      // 一覧を再取得（コメントが追加された状態を反映）
      await fetchIssues();
    } catch (error) {
      console.error('[IssueManagementModal] handleCommentSubmit error:', error);
      message.error(extractErrorMessage(error));
    }
  };

  // ステータスを「未解決」に変更
  const handleSetUnresolved = async () => {
    if (!selectedIssue) return;

    if (!newComment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    try {
      // コメントを送信してからステータスを更新
      await addComment({
        projectName,
        issueId: selectedIssue.issueId,
        comment: newComment.trim(),
      });
      await updateIssueStatus({
        projectName,
        issueId: selectedIssue.issueId,
        status: 'unresolved',
      });

      message.success('ステータスを「未解決」に変更しました');
      setNewComment('');
      commentForm.resetFields();
      // 一覧を再取得
      await fetchIssues();
    } catch (error) {
      console.error('[IssueManagementModal] handleSetUnresolved error:', error);
      message.error(extractErrorMessage(error));
    }
  };

  // ステータスを「解決済」に変更
  const handleSetResolved = async () => {
    if (!selectedIssue) return;

    if (!newComment.trim()) {
      message.warning('コメントを入力してください');
      return;
    }

    try {
      // コメントを送信してからステータスを更新
      await addComment({
        projectName,
        issueId: selectedIssue.issueId,
        comment: newComment.trim(),
      });
      await updateIssueStatus({
        projectName,
        issueId: selectedIssue.issueId,
        status: 'resolved',
      });

      message.success('ステータスを「解決済」に変更しました');
      setNewComment('');
      commentForm.resetFields();
      // 一覧を再取得
      await fetchIssues();
    } catch (error) {
      console.error('[IssueManagementModal] handleSetResolved error:', error);
      message.error(extractErrorMessage(error));
    }
  };

  // モーダルを閉じる
  const handleClose = () => {
    setSelectedIssueId(null);
    setShowNewIssueForm(false);
    form.resetFields();
    commentForm.resetFields();
    setNewComment('');
    setIssues([]);
    onClose();
  };

  // 問題選択時のハンドラ
  const handleSelectIssue = (issue: Issue) => {
    setSelectedIssueId(issue.issueId);
    setShowNewIssueForm(false);
  };

  // 新規問題報告ボタン押下
  const handleNewIssueClick = () => {
    setShowNewIssueForm(true);
    setSelectedIssueId(null);
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>
            {viewMode ? '問題確認' : '問題報告'} - {targetName}
          </span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      destroyOnHidden
      data-testid="issue-management-modal"
    >
      {/* 新規問題報告ボタン（参照専用モードまたは承認依頼中は非表示） */}
      {!viewMode && (
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleNewIssueClick}
            disabled={isEditDisabled}
            title={isApprovalPending ? 'プロジェクトが承認依頼中のため、新規問題報告はできません' : undefined}
            data-testid="issue-management-new-issue-button"
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
            styles={{ body: { padding: 12, overflow: 'auto', height: 'calc(100% - 38px)' } }}
          >
            {/* フィルタUI */}
            <Space orientation="vertical" size="small" style={{ width: '100%', marginBottom: 12 }}>
              <Input
                placeholder="タイトル、内容で検索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: '100%' }}
                data-testid="issue-management-search-input"
              />
              <Select
                placeholder="ステータスで絞り込み"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                style={{ width: '100%' }}
                allowClear
                onClear={() => setStatusFilter('all')}
                data-testid="issue-management-status-filter"
              >
                <Select.Option value="all">すべて</Select.Option>
                <Select.Option value="unresolved">未解決</Select.Option>
                <Select.Option value="resolved">解決済</Select.Option>
              </Select>
            </Space>

            {/* テーブル */}
            <Spin spinning={issuesLoading}>
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
            </Spin>
          </Card>
        </Col>

        {/* 右側: 問題詳細または新規報告フォーム */}
        <Col span={14}>
          <Card
            title={showNewIssueForm ? '新規問題報告' : '問題詳細'}
            size="small"
            style={{ height: 'calc(70vh - 100px)' }}
            styles={{ body: { padding: 16, overflow: 'auto', height: 'calc(100% - 38px)' } }}
          >
            {/* 新規問題報告フォーム */}
            {showNewIssueForm && (
              <Form form={form} layout="vertical" data-testid="issue-management-new-issue-form">
                <Form.Item
                  label="タイトル"
                  name="title"
                  rules={[
                    { required: true, message: 'タイトルを入力してください' },
                    { max: 100, message: 'タイトルは100文字以内で入力してください' },
                  ]}
                >
                  <Input placeholder="問題のタイトルを入力" maxLength={100} data-testid="issue-management-title-input" />
                </Form.Item>

                <Form.Item
                  label="対象"
                  name="targetType"
                  initialValue="transition"
                  rules={[{ required: true, message: '対象を選択してください' }]}
                >
                  <Select data-testid="issue-management-target-type-select">
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
                  <Select
                    placeholder="問題タイプを選択"
                    loading={issueTypeLoading}
                    options={issueTypeOptions}
                    data-testid="issue-management-issue-type-select"
                  />
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
                    data-testid="issue-management-content-textarea"
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space style={{ float: 'right' }}>
                    <Button onClick={() => setShowNewIssueForm(false)} data-testid="issue-management-form-cancel-button">
                      キャンセル
                    </Button>
                    <Button type="primary" onClick={handleSubmitNewIssue} data-testid="issue-management-form-save-button">
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
                <Space orientation="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
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

                {/* コメント入力（参照専用モードでは非表示、承認依頼中は非活性） */}
                {!viewMode && (
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" strong>
                      コメントを追加
                    </Text>
                    <TextArea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      placeholder={isApprovalPending ? 'プロジェクトが承認依頼中のため、コメントを追加できません' : 'コメントを入力...'}
                      maxLength={500}
                      showCount
                      style={{ marginTop: 8 }}
                      disabled={isEditDisabled}
                      data-testid="issue-management-comment-textarea"
                    />
                  </div>
                )}

                {/* ボタンエリア（参照専用モードでは非表示、承認依頼中は非活性） */}
                {!viewMode && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button
                      type="primary"
                      onClick={handleCommentSubmit}
                      disabled={!newComment.trim() || isEditDisabled}
                      title={isApprovalPending ? 'プロジェクトが承認依頼中のため、コメント送信はできません' : undefined}
                      data-testid="issue-management-comment-submit-button"
                    >
                      コメント送信
                    </Button>
                    <Button
                      onClick={handleSetUnresolved}
                      disabled={!newComment.trim() || selectedIssue.status === 'unresolved' || isEditDisabled}
                      title={isApprovalPending ? 'プロジェクトが承認依頼中のため、ステータス変更はできません' : undefined}
                      data-testid="issue-management-set-unresolved-button"
                    >
                      未解決
                    </Button>
                    <Button
                      onClick={handleSetResolved}
                      disabled={!newComment.trim() || selectedIssue.status === 'resolved' || isEditDisabled}
                      title={isApprovalPending ? 'プロジェクトが承認依頼中のため、ステータス変更はできません' : undefined}
                      style={{
                        backgroundColor: newComment.trim() && selectedIssue.status === 'unresolved' && !isEditDisabled ? '#52c41a' : undefined,
                        borderColor: newComment.trim() && selectedIssue.status === 'unresolved' && !isEditDisabled ? '#52c41a' : undefined,
                        color: newComment.trim() && selectedIssue.status === 'unresolved' && !isEditDisabled ? '#fff' : undefined,
                      }}
                      data-testid="issue-management-set-resolved-button"
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
