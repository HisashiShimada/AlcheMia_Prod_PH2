// frontend/src/components/viewer/nodes/ResultTemplateNode.tsx
// Result Templateノードコンポーネント（reference版互換）

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useAttributeDisplay, ATTRIBUTE_OPTIONS } from '@/contexts/AttributeDisplayContext';

interface ResultTemplateData {
  label?: string;
  name?: string;
  id?: string;
  nodeType: 'place';
  templateType: 'result';
  description?: string;
  properties?: Record<string, string>;
  selectedProperties?: Record<string, string>;
  // 表示切替用フィールド
  templateId?: string;
  templateName?: string;
  templateDescription?: string;
  template?: { id?: string; name?: string; description?: string };
}

/**
 * Result Templateノード - 矩形ノード（Result用）
 * シンプルな矩形で、内部は空（白色）
 */
const ResultTemplateNode: React.FC<NodeProps<ResultTemplateData>> = memo(({ data, selected }) => {
  const { selectedAttribute } = useAttributeDisplay();

  const displayLabel = (() => {
    switch (selectedAttribute) {
      case ATTRIBUTE_OPTIONS.NODE_ID:              return data.id || '';
      case ATTRIBUTE_OPTIONS.NODE_NAME:            return data.name || data.label || data.id || '';
      case ATTRIBUTE_OPTIONS.NODE_DESCRIPTION:     return data.description || '';
      case ATTRIBUTE_OPTIONS.TEMPLATE_ID:          return data.template?.id || data.templateId || '';
      case ATTRIBUTE_OPTIONS.TEMPLATE_NAME:        return data.template?.name || data.templateName || '';
      case ATTRIBUTE_OPTIONS.TEMPLATE_DESCRIPTION: return data.template?.description || data.templateDescription || '';
      default:                                     return data.name || data.label || data.id || '';
    }
  })();

  return (
    <div style={{ position: 'relative' }}>
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#555' }} 
      />
      
      <div>
        {/* 選択されたプロパティキャプション（縦並び） */}
        {data.selectedProperties && Object.keys(data.selectedProperties).length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            background: 'rgba(33, 150, 243, 0.95)',
            border: '1px solid #2196f3',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 10,
            minWidth: '120px',
            maxWidth: '250px',
            color: '#fff',
          }}>
            {Object.entries(data.selectedProperties).map(([key, value]) => (
              <div key={key} style={{ 
                marginBottom: '2px',
                wordBreak: 'break-word'
              }}>
                <strong>{key}:</strong> {String(value)}
              </div>
            ))}
          </div>
        )}
        
        <div style={{
          width: 42,
          height: 28,
          border: `2px solid ${selected ? '#2196f3' : 'black'}`,
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px',
          position: 'relative',
          boxShadow: selected ? '0 0 8px rgba(33, 150, 243, 0.8)' : 'none',
          cursor: 'pointer',
        }}>
          {/* ラベルを下に配置 */}
          <div style={{
            position: 'absolute',
            bottom: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            fontSize: '10px',
            width: '150px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 'bold',
          }}>
            {displayLabel}
          </div>
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right}
        style={{ background: '#555' }} 
      />
    </div>
  );
});

ResultTemplateNode.displayName = 'ResultTemplateNode';

export default ResultTemplateNode;
