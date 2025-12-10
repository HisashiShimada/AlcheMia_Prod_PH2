import React from 'react';
import { Card, Select, Space, Typography } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { projectsData } from '@/data/projectsData';

const { Text } = Typography;

interface ProjectSelectorProps {
  selectedProject: string;
  onProjectChange: (value: string) => void;
}

/**
 * プロジェクト選択コンポーネント
 * プロジェクトの選択を提供
 */
export default function ProjectSelector({
  selectedProject,
  onProjectChange,
}: ProjectSelectorProps) {
  return (
    <Card style={{ marginBottom: 24 }}>
      <Space align="center" size="middle" style={{ width: '100%' }}>
        <FolderOutlined style={{ fontSize: 20, color: '#CF0027' }} />
        <Text strong style={{ minWidth: 100 }}>
          プロジェクト:
        </Text>
        <Select
          value={selectedProject || undefined}
          onChange={onProjectChange}
          placeholder="プロジェクトを選択してください"
          style={{ minWidth: 300, flex: 1, maxWidth: 600 }}
          size="large"
        >
          {Object.entries(projectsData).map(([projectId, project]) => (
            <Select.Option key={projectId} value={projectId}>
              <Space>
                <Text strong>{project.projectName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {project.fileName}
                </Text>
              </Space>
            </Select.Option>
          ))}
        </Select>
      </Space>
    </Card>
  );
}
