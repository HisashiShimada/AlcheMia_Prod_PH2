'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Typography, Space, Button, theme, Input, Select, Row, Col, Spin } from 'antd';
import { FolderOutlined, CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WorkerProject } from '@/services/projectApiService';
import { useCodeMaster } from '@/hooks/useCodeMaster';

const { Text } = Typography;

/**
 * プロジェクト選択モーダルのProps
 */
interface ProjectSelectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  onProjectChange: (value: string | null) => void;
  projects: WorkerProject[];
  loading: boolean;
}

/**
 * テーブルデータの型定義
 */
interface ProjectTableData {
  key: string;
  projectId: string;
  projectName: string;
  projectCd?: string;
  projectStatus: number;
  isCurrentlySelected: boolean;
}

/**
 * プロジェクト選択モーダルコンポーネント
 * プロジェクトを選択するためのテーブル形式のモーダル
 */
export default function ProjectSelectionModal({
  open,
  onClose,
  selectedProject,
  onProjectChange,
  projects,
  loading,
}: ProjectSelectionModalProps) {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const { options: projectStatusOptions } = useCodeMaster('project_status');
  const [tempProject, setTempProject] = useState<string>(selectedProject);
  
  // フィルター状態
  const [searchText, setSearchText] = useState<string>('');
  const [selectedProjectName, setSelectedProjectName] = useState<string | undefined>(undefined);

  // ダイアログが開かれた時に現在の選択状態とフィルターをリセット
  useEffect(() => {
    if (open) {
      setTempProject(selectedProject);
      setSearchText('');
      setSelectedProjectName(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // テーブルデータの作成
  const allTableData: ProjectTableData[] = useMemo(() => {
    return projects.map((project) => ({
      key: project.projectId,
      projectId: project.projectId,
      projectName: project.projectName,
      projectCd: project.projectCd,
      projectStatus: project.projectStatus,
      isCurrentlySelected: selectedProject === project.projectId,
    }));
  }, [projects, selectedProject]);

  // プロジェクト名の選択肢
  const projectNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(allTableData.map(item => item.projectName)));
    return uniqueNames.sort().map(name => ({ label: name, value: name }));
  }, [allTableData]);

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    return allTableData.filter(item => {
      // あいまい検索（プロジェクト名、プロジェクトコード）
      const matchesSearch = !searchText || 
        item.projectName.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.projectCd && item.projectCd.toLowerCase().includes(searchText.toLowerCase()));
      
      // プロジェクト名フィルター
      const matchesProjectName = !selectedProjectName || item.projectName === selectedProjectName;
      
      return matchesSearch && matchesProjectName;
    });
  }, [allTableData, searchText, selectedProjectName]);

  // テーブルカラムの定義
  const columns: ColumnsType<ProjectTableData> = [
    {
      title: 'プロジェクト名',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 250,
      render: (text: string) => (
        <Space>
          <FolderOutlined style={{ color: token.colorPrimary }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'プロジェクトCD',
      dataIndex: 'projectCd',
      key: 'projectCd',
      width: 150,
      render: (text: string) => (
        <Text>{text}</Text>
      ),
    },
    {
      title: '状態',
      dataIndex: 'projectStatus',
      key: 'projectStatus',
      width: 120,
      align: 'center',
      render: (projectStatus: number) => {
        const label = projectStatusOptions.find(opt => opt.value === projectStatus)?.label ?? String(projectStatus);
        return <Text>{label}</Text>;
      },
    },
  ];

  // 決定ボタンの処理
  const handleOk = () => {
    onProjectChange(tempProject || null);
    onClose();
  };

  // キャンセルボタンの処理
  const handleCancel = () => {
    // 一時変数をリセット
    setTempProject(selectedProject);
    onClose();
  };

  // 選択解除ボタンの処理
  const handleClearSelection = () => {
    setTempProject('');
  };

  // 行選択の設定
  const rowSelection = {
    type: 'radio' as const,
    selectedRowKeys: tempProject ? [tempProject] : [],
    onChange: (selectedRowKeys: React.Key[]) => {
      setTempProject(selectedRowKeys[0] as string);
    },
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      width={900}
      title={
        <Space>
          <FolderOutlined style={{ color: token.colorPrimary }} />
          <Text strong>{t('experimentWork.projectSelection.title')}</Text>
        </Space>
      }
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            danger
            icon={<CloseOutlined />}
            onClick={handleClearSelection}
            disabled={!tempProject}
          >
            {t('experimentWork.projectSelection.clearSelection')}
          </Button>
          <Space>
            <Button onClick={handleCancel}>
              {t('experimentWork.projectSelection.cancel')}
            </Button>
            <Button
              type="primary"
              onClick={handleOk}
              icon={<CheckOutlined />}
            >
              {t('experimentWork.projectSelection.confirm')}
            </Button>
          </Space>
        </Space>
      }
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* フィルタリングコントロール */}
        <Row gutter={16}>
          <Col flex="400px">
            <Input
              placeholder="プロジェクト名またはコードで検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              disabled={loading}
            />
          </Col>
          <Col flex="200px">
            <Select
              placeholder="プロジェクト名でフィルタ"
              value={selectedProjectName}
              onChange={setSelectedProjectName}
              allowClear
              style={{ width: '100%' }}
              options={projectNameOptions}
              disabled={loading}
            />
          </Col>
        </Row>

        {/* テーブル */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowSelection={rowSelection}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `合計: ${total} 件`,
            pageSizeOptions: ['10', '20', '50', '100'],
            showQuickJumper: true,
          }}
          scroll={{ y: 350 }}
          size="middle"
          locale={{
            emptyText: loading ? <Spin /> : 'プロジェクトがありません'
          }}
        />
      </Space>
    </Modal>
  );
}
