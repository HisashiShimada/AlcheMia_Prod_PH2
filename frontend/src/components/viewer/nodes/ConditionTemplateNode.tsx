// frontend/src/components/viewer/nodes/ConditionTemplateNode.tsx
// Condition Templateノードコンポーネント

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Typography, Tag, Space } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ConditionTemplateData {
  label: string;
  nodeType: 'place';
  templateType: 'condition';
  description?: string;
  properties?: Record<string, string>;
  selectedProperties?: Record<string, string>;
}

const ConditionTemplateNode: React.FC<NodeProps<ConditionTemplateData>> = memo(({ data, selected }) => {
  return (
    <Card
      size="small"
      style={{
        minWidth: 150,
        border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
        borderRadius: 8,
        background: '#f0f9ff',
        boxShadow: selected ? '0 4px 12px rgba(24, 144, 255, 0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#1890ff' }} />
      
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space>
          <SettingOutlined style={{ color: '#1890ff' }} />
          <Text strong style={{ fontSize: 12 }}>{data.label}</Text>
        </Space>
        <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>Condition</Tag>
        {data.description && <Text type="secondary" style={{ fontSize: 10 }}>{data.description}</Text>}
        {data.selectedProperties && Object.keys(data.selectedProperties).length > 0 && (
          <div style={{ fontSize: 10, color: '#8c8c8c', maxHeight: 60, overflow: 'auto' }}>
            {Object.entries(data.selectedProperties).map(([key, value]) => (
              <div key={key}><Text style={{ fontSize: 10 }}>{key}: {value}</Text></div>
            ))}
          </div>
        )}
      </Space>
      
      <Handle type="source" position={Position.Bottom} style={{ background: '#1890ff' }} />
    </Card>
  );
});

ConditionTemplateNode.displayName = 'ConditionTemplateNode';

export default ConditionTemplateNode;
