// frontend/src/components/viewer/nodes/MaterialTemplateNode.tsx
// Material Templateノードコンポーネント

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Typography, Tag, Space } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface MaterialTemplateData {
  label: string;
  nodeType: 'place';
  templateType: 'material';
  description?: string;
  properties?: Record<string, string>;
  selectedProperties?: Record<string, string>;
}

/**
 * Material Templateノード
 * 材料を表すペトリネットのPlaceノード
 */
const MaterialTemplateNode: React.FC<NodeProps<MaterialTemplateData>> = memo(({ data, selected }) => {
  return (
    <Card
      size="small"
      style={{
        minWidth: 150,
        border: selected ? '2px solid #CF0027' : '1px solid #d9d9d9',
        borderRadius: 8,
        background: '#fff3f3',
        boxShadow: selected ? '0 4px 12px rgba(207, 0, 39, 0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* 入力ハンドル */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#CF0027' }}
      />
      
      {/* ノード内容 */}
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space>
          <ExperimentOutlined style={{ color: '#CF0027' }} />
          <Text strong style={{ fontSize: 12 }}>
            {data.label}
          </Text>
        </Space>
        
        <Tag color="red" style={{ fontSize: 10, margin: 0 }}>
          Material
        </Tag>
        
        {data.description && (
          <Text type="secondary" style={{ fontSize: 10 }}>
            {data.description}
          </Text>
        )}
        
        {data.selectedProperties && Object.keys(data.selectedProperties).length > 0 && (
          <div style={{ 
            fontSize: 10, 
            color: '#8c8c8c',
            maxHeight: 60,
            overflow: 'auto'
          }}>
            {Object.entries(data.selectedProperties).map(([key, value]) => (
              <div key={key}>
                <Text style={{ fontSize: 10 }}>
                  {key}: {value}
                </Text>
              </div>
            ))}
          </div>
        )}
      </Space>
      
      {/* 出力ハンドル */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#CF0027' }}
      />
    </Card>
  );
});

MaterialTemplateNode.displayName = 'MaterialTemplateNode';

export default MaterialTemplateNode;
