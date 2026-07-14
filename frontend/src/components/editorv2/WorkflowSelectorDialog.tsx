/**
 * WorkflowSelectorDialog - ワークフロー選択ダイアログ
 *
 * プロジェクトテーブルベースで自分が編集可能なプロジェクトを検索・選択し、
 * 選択したプロジェクトの最新MAIMLをワークフローとして追加する。
 *
 * @version 2.0.0 プロジェクトベース化
 * @date 2026-07-14
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Input,
  Button,
  Alert,
  Typography,
  Space,
  Table,
  Select,
  Row,
  Col,
  Spin,
  message,
} from 'antd';
import {
  FileOutlined,
  SearchOutlined,
  FolderOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getProjects, getProjectMaiml } from '@/services/projectApiService';
import type { Project } from '@/types/project';
import type { WorkflowProjectSelection } from '@/types/project';
import { useCodeMaster } from '@/hooks/useCodeMaster';

const { Text } = Typography;

/**
 * WorkflowSelectorDialog Props
 */
interface WorkflowSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: WorkflowProjectSelection) => void;
}

/**
 * テーブル行データ型
 */
interface ProjectRowData {
  key: string;
  projectId: string;
  projectName: string;
  status: number;
  statusName?: string;
  organizationGroupName?: string;
}

/**
 * ワークフロー選択ダイアログコンポーネント
 *
 * 編集可能かつMAIML登録済みのプロジェクト一覧をテーブル形式で表示し、
 * 選択後にそのプロジェクトのMAIML本文を取得してワークフローとして追加する。
 */
const WorkflowSelectorDialog: React.FC<WorkflowSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedProjectName, setSelectedProjectName] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { options: projectStatusOptions } = useCodeMaster('project_status');

  // ダイアログが開かれた時にプロジェクト一覧を取得
  useEffect(() => {
    if (!open) return;

    setSelectedProjectId(null);
    setSearchText('');
    setSelectedProjectName(undefined);
    setCurrentPage(1);

    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const response = await getProjects();
        if (response.success && response.data) {
          // 編集可能かつMAIML登録済みのプロジェクトのみ抽出
          const editableWithMaiml = response.data.projects.filter(
            (p) => p.isEditable === true && !!p.maimlFileKey
          );
          setProjects(editableWithMaiml);
        } else {
          message.error('プロジェクト一覧の取得に失敗しました');
        }
      } catch (err) {
        console.error('[WorkflowSelectorDialog] プロジェクト取得エラー:', err);
        message.error('プロジェクト一覧の取得に失敗しました');
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [open]);

  // テーブル用データに変換
  const allTableData: ProjectRowData[] = useMemo(() => {
    return projects.map((p) => ({
      key: p.id,
      projectId: p.id,
      projectName: p.name,
      status: p.status,
      statusName: p.statusName,
      organizationGroupName: p.organizationGroupName,
    }));
  }, [projects]);

  // プロジェクト名フィルタの選択肢
  const projectNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(allTableData.map((item) => item.projectName)));
    return uniqueNames.sort().map((name) => ({ label: name, value: name }));
  }, [allTableData]);

  // フィルタリング済みデータ
  const filteredData = useMemo(() => {
    return allTableData.filter((item) => {
      const matchesSearch =
        !searchText || item.projectName.toLowerCase().includes(searchText.toLowerCase());
      const matchesProjectName =
        !selectedProjectName || item.projectName === selectedProjectName;
      return matchesSearch && matchesProjectName;
    });
  }, [allTableData, searchText, selectedProjectName]);

  // テーブルカラム定義
  const columns: ColumnsType<ProjectRowData> = [
    {
      title: 'プロジェクト名',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (text: string) => (
        <Space>
          <FolderOutlined style={{ color: '#1677ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center' as const,
      render: (status: number, record: ProjectRowData) => {
        const label =
          record.statusName ||
          projectStatusOptions.find((opt) => opt.value === status)?.label ||
          String(status);
        return <Text>{label}</Text>;
      },
    },
    {
      title: 'グループ',
      dataIndex: 'organizationGroupName',
      key: 'organizationGroupName',
      width: 160,
      render: (text?: string) => <Text>{text || '-'}</Text>,
    },
  ];

  // 行選択設定
  const rowSelection = {
    type: 'radio' as const,
    selectedRowKeys: selectedProjectId ? [selectedProjectId] : [],
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedProjectId(selectedRowKeys[0] as string || null);
    },
  };

  // 確定ボタン押下：MAIMLを取得してonSelectに渡す
  const handleConfirm = async () => {
    if (!selectedProjectId) {
      message.warning('プロジェクトを選択してください');
      return;
    }

    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    if (!selectedProject) return;

    setIsConfirming(true);
    try {
      const maimlResponse = await getProjectMaiml(selectedProjectId);
      if (!maimlResponse.success || !maimlResponse.data) {
        throw new Error(maimlResponse.error?.message || 'MAIMLファイルの取得に失敗しました');
      }

      const maimlContent = maimlResponse.data.maimlContent;
      if (!maimlContent) {
        throw new Error('MAIMLファイルの内容が空です');
      }

      onSelect({
        projectId: selectedProjectId,
        projectName: selectedProject.name,
        maimlContent,
      });
      onClose();
    } catch (err) {
      console.error('[WorkflowSelectorDialog] MAIML取得エラー:', err);
      message.error((err as Error).message || 'MAIMLファイルの取得に失敗しました');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileOutlined />
          <span>ワークフロー選択（プロジェクトから追加）</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={900}
      style={{ top: 40 }}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isConfirming}>
          キャンセル
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<CheckOutlined />}
          onClick={handleConfirm}
          disabled={!selectedProjectId || isConfirming || isLoadingProjects}
          loading={isConfirming}
        >
          {isConfirming ? '取得中...' : 'ワークフロー追加'}
        </Button>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Text type="secondary">
          編集可能なプロジェクトを選択してください（MAIML登録済みのプロジェクトのみ表示）
        </Text>

        {/* フィルタコントロール */}
        <Row gutter={16}>
          <Col flex="400px">
            <Input
              placeholder="プロジェクト名で検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              disabled={isLoadingProjects}
            />
          </Col>
          <Col flex="220px">
            <Select
              placeholder="プロジェクト名でフィルタ"
              value={selectedProjectName}
              onChange={setSelectedProjectName}
              allowClear
              style={{ width: '100%' }}
              options={projectNameOptions}
              disabled={isLoadingProjects}
            />
          </Col>
        </Row>

        {/* プロジェクト一覧テーブル */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowSelection={rowSelection}
          loading={isLoadingProjects}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
            pageSizeOptions: ['20', '50', '100'],
            showQuickJumper: true,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (_, newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            },
          }}
          scroll={{ y: 350 }}
          size="middle"
          locale={{
            emptyText: isLoadingProjects ? (
              <Spin />
            ) : (
              '編集可能なMAIML登録済みプロジェクトがありません'
            ),
          }}
          onRow={(record) => ({
            onClick: () => setSelectedProjectId(record.projectId),
            style: { cursor: 'pointer' },
          })}
        />

        {/* 選択中プロジェクト情報 */}
        {selectedProjectId && (() => {
          const proj = projects.find((p) => p.id === selectedProjectId);
          return proj ? (
            <Alert
              message="選択中のプロジェクト"
              description={
                <Text>
                  <strong>{proj.name}</strong>
                  {proj.organizationGroupName && (
                    <Text type="secondary"> （{proj.organizationGroupName}）</Text>
                  )}
                </Text>
              }
              type="info"
              showIcon
            />
          ) : null;
        })()}
      </Space>
    </Modal>
  );
};

export default WorkflowSelectorDialog;
