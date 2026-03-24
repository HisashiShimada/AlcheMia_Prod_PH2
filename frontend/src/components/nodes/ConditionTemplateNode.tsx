// frontend/src/components/viewer/nodes/ConditionTemplateNode.tsx
// Condition Templateノードコンポーネント（reference版互換）

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useAttributeDisplay, ATTRIBUTE_OPTIONS } from '@/contexts/AttributeDisplayContext';

interface ConditionTemplateData {
  label?: string;
  name?: string;
  id?: string;
  nodeType: 'place';
  templateType: 'condition';
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
 * Condition Templateノード - 五角形ノード（Condition用）
 * SVGポリゴンで五角形を描画、内部は空（白色）
 */
const ConditionTemplateNode: React.FC<NodeProps<ConditionTemplateData>> = memo(({ data, selected }) => {
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
        
        <svg 
          width="38.5" 
          height="38.5" 
          style={{ 
            overflow: 'visible', 
            filter: selected ? 'drop-shadow(0 0 4px rgba(33, 150, 243, 0.8))' : 'none',
            cursor: 'pointer',
          }}
        >
          {/* 五角形 */}
          <polygon
            points="19.25,1.75 36.75,14 29.75,33.25 8.75,33.25 1.75,14"
            fill="white"
            stroke={selected ? '#2196f3' : 'black'}
            strokeWidth="2"
          />
          
          {/* ラベル - SVG foreignObjectを使用 */}
          <foreignObject x="-55.75" y="38.5" width="150" height="60">
            <div style={{
              textAlign: 'center',
              fontSize: '10px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: 'bold',
            }}>
              {displayLabel}
            </div>
          </foreignObject>
        </svg>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#555' }} 
      />
    </div>
  );
});

ConditionTemplateNode.displayName = 'ConditionTemplateNode';

export default ConditionTemplateNode;
