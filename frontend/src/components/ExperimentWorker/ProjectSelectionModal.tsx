'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Typography, Space, Button, theme, Input, Select, Row, Col } from 'antd';
import { FolderOutlined, CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { projectsData } from '@/data/projectsData';
import { useLanguage } from '@/contexts/LanguageContext';
import { isSelectableStatus, ProjectStatus } from '@/types/experimentWorker';

const { Text } = Typography;

/**
 * プロジェクト選択モーダルのProps
 */
interface ProjectSelectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  onProjectChange: (value: string | null) => void;
}

/**
 * テーブルデータの型定義
 */
interface ProjectTableData {
  key: string;
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  description: string;
  owner: string;
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
}: ProjectSelectionModalProps) {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const [tempProject, setTempProject] = useState<string>(selectedProject);
  
  // フィルター状態
  const [searchText, setSearchText] = useState<string>('');
  const [selectedProjectName, setSelectedProjectName] = useState<string | undefined>(undefined);
  const [selectedOwner, setSelectedOwner] = useState<string | undefined>(undefined);

  // ダイアログが開かれた時に現在の選択状態とフィルターをリセット
  useEffect(() => {
    if (open) {
      setTempProject(selectedProject);
      setSearchText('');
      setSelectedProjectName(undefined);
      setSelectedOwner(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // テーブルデータの作成（選択可能な状態のプロジェクトのみ）
  const allTableData: ProjectTableData[] = useMemo(() => {
    return Object.keys(projectsData)
      .map((projectId) => {
        const project = projectsData[projectId];
        const owner = project.workAssignment?.assignedBy?.userName || t('experimentWork.projectSelection.unknownOwner');
        
        return {
          key: projectId,
          projectId,
          projectName: project.projectName,
          status: project.status,
          description: project.description || '',
          owner,
          isCurrentlySelected: selectedProject === projectId,
        };
      })
      .filter((project) => isSelectableStatus(project.status)); // 選択可能な状態のみ
  }, [selectedProject, t]);

  // プロジェクト名の選択肢
  const projectNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(allTableData.map(item => item.projectName)));
    return uniqueNames.sort().map(name => ({ label: name, value: name }));
  }, [allTableData]);

  // 所有者の選択肢
  const ownerOptions = useMemo(() => {
    const uniqueOwners = Array.from(new Set(allTableData.map(item => item.owner)));
    return uniqueOwners.sort().map(owner => ({ label: owner, value: owner }));
  }, [allTableData]);

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    return allTableData.filter(item => {
      // あいまい検索（プロジェクト名、説明、所有者）
      const matchesSearch = !searchText || 
        item.projectName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description.toLowerCase().includes(searchText.toLowerCase()) ||
        item.owner.toLowerCase().includes(searchText.toLowerCase());
      
      // プロジェクト名フィルター
      const matchesProjectName = !selectedProjectName || item.projectName === selectedProjectName;
      
      // 所有者フィルター
      const matchesOwner = !selectedOwner || item.owner === selectedOwner;
      
      return matchesSearch && matchesProjectName && matchesOwner;
    });
  }, [allTableData, searchText, selectedProjectName, selectedOwner]);

  // テーブルカラムの定義
  const columns: ColumnsType<ProjectTableData> = [
    {
      title: t('experimentWork.projectSelection.projectName'),
      dataIndex: 'projectName',
      key: 'projectName',
      width: 200,
      render: (text: string) => (
        <Space>
          <FolderOutlined style={{ color: token.colorPrimary }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '状態',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center',
      render: (status: ProjectStatus) => (
        <Text>{t(`experimentWork.projectStatus.${status}`)}</Text>
      ),
    },
    {
      title: t('experimentWork.projectSelection.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Text type="secondary">{text || '-'}</Text>
      ),
    },
    {
      title: t('experimentWork.projectSelection.owner'),
      dataIndex: 'owner',
      key: 'owner',
      width: 150,
      render: (text: string) => (
        <Text>{text}</Text>
      ),
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
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* フィルタリングコントロール */}
        <Row gutter={16}>
          <Col flex="400px">
            <Input
              placeholder={t('experimentWork.projectSelection.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col flex="200px">
            <Select
              placeholder={t('experimentWork.projectSelection.projectNameFilter')}
              value={selectedProjectName}
              onChange={setSelectedProjectName}
              allowClear
              style={{ width: '100%' }}
              options={projectNameOptions}
            />
          </Col>
          <Col flex="150px">
            <Select
              placeholder={t('experimentWork.projectSelection.ownerFilter')}
              value={selectedOwner}
              onChange={setSelectedOwner}
              allowClear
              style={{ width: '100%' }}
              options={ownerOptions}
            />
          </Col>
        </Row>

        {/* テーブル */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${t('common.total')}: ${total} ${t('common.items')}`,
            pageSizeOptions: ['10', '20', '50', '100'],
            showQuickJumper: true,
          }}
          scroll={{ y: 350 }}
          size="middle"
        />
      </Space>
    </Modal>
  );
}
