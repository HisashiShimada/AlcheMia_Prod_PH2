// frontend/src/components/viewer/nodes/TransitionNode.tsx
// Transitionノードコンポーネント

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Typography, Space } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TransitionData {
  label: string;
  nodeType: 'transition';
  description?: string;
}

const TransitionNode: React.FC<NodeProps<TransitionData>> = memo(({ data, selected }) => {
  return (
    <Card
      size="small"
      style={{
        minWidth: 120,
        border: selected ? '2px solid #722ed1' : '1px solid #d9d9d9',
        borderRadius: 8,
        background: '#f9f0ff',
        boxShadow: selected ? '0 4px 12px rgba(114, 46, 209, 0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#722ed1' }} />
      
      <Space direction="vertical" size="small" style={{ width: '100%', alignItems: 'center' }}>
        <Space>
          <ThunderboltOutlined style={{ color: '#722ed1' }} />
          <Text strong style={{ fontSize: 12 }}>{data.label}</Text>
        </Space>
        {data.description && <Text type="secondary" style={{ fontSize: 10 }}>{data.description}</Text>}
      </Space>
      
      <Handle type="source" position={Position.Bottom} style={{ background: '#722ed1' }} />
    </Card>
  );
});

TransitionNode.displayName = 'TransitionNode';

export default TransitionNode;
