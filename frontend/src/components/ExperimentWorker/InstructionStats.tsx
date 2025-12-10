import React from 'react';
import { Card, Space, Tag, Typography } from 'antd';
import { BarChartOutlined, FileTextOutlined, ToolOutlined, AimOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface InstructionStatsProps {
  stats: {
    total: number;
    file: number;
    method: number;
    transition: number;
    unread: number;
  };
}

/**
 * 指示統計コンポーネント
 * 指示の件数サマリーを表示
 */
export default function InstructionStats({ stats }: InstructionStatsProps) {
  return (
    <Card style={{ marginBottom: 24 }}>
      <Space size="large" wrap style={{ width: '100%' }}>
        <Space align="center">
          <BarChartOutlined style={{ fontSize: 18, color: '#CF0027' }} />
          <Text strong>指示サマリー:</Text>
        </Space>
        
        <Space align="center">
          <FileTextOutlined style={{ fontSize: 16 }} />
          <Text>全ての指示</Text>
          <Tag color="blue">{stats.total}</Tag>
        </Space>
        
        <Space align="center">
          <FileTextOutlined style={{ fontSize: 16 }} />
          <Text>全体</Text>
          <Tag>{stats.file}</Tag>
        </Space>
        
        <Space align="center">
          <ToolOutlined style={{ fontSize: 16 }} />
          <Text>メソッド</Text>
          <Tag>{stats.method}</Tag>
        </Space>
        
        <Space align="center">
          <AimOutlined style={{ fontSize: 16 }} />
          <Text>トランジション</Text>
          <Tag>{stats.transition}</Tag>
        </Space>
      </Space>
    </Card>
  );
}
