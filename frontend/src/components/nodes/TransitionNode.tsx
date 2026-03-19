// frontend/src/components/viewer/nodes/TransitionNode.tsx
// Transitionノードコンポーネント（reference版互換）

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useAttributeDisplay, ATTRIBUTE_OPTIONS } from '@/contexts/AttributeDisplayContext';

interface TransitionData {
  label?: string;
  name?: string;
  id?: string;
  nodeType: 'transition';
  description?: string;
  // 表示切替用フィールド
  instructionId?: string;
  instructionName?: string;
  instructionDescription?: string;
}

/**
 * Transitionノード - 長方形ノード（Transition用）
 * 黒塗りつぶしの細い長方形
 */
const TransitionNode: React.FC<NodeProps<TransitionData>> = memo(({ data, selected }) => {
  const { selectedAttribute } = useAttributeDisplay();

  const displayLabel = (() => {
    switch (selectedAttribute) {
      case ATTRIBUTE_OPTIONS.NODE_ID:              return data.id || '';
      case ATTRIBUTE_OPTIONS.NODE_NAME:            return data.name || data.label || data.id || '';
      case ATTRIBUTE_OPTIONS.NODE_DESCRIPTION:     return data.description || '';
      case ATTRIBUTE_OPTIONS.TEMPLATE_ID:          return data.instructionId || '';
      case ATTRIBUTE_OPTIONS.TEMPLATE_NAME:        return data.instructionName || data.name || data.label || data.id || '';
      case ATTRIBUTE_OPTIONS.TEMPLATE_DESCRIPTION: return data.instructionDescription || data.description || '';
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
      
      <div style={{
        width: 5.6,
        height: 28,
        background: selected ? '#2196f3' : 'black',
        position: 'relative',
        boxShadow: selected ? '0 0 8px rgba(33, 150, 243, 0.8)' : 'none',
        cursor: 'pointer',
      }}>
        {/* ラベルを下部に配置 */}
        <div style={{
          position: 'absolute',
          top: 32,
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
      
      <Handle 
        type="source" 
        position={Position.Right}
        style={{ background: '#555' }} 
      />
    </div>
  );
});

TransitionNode.displayName = 'TransitionNode';

export default TransitionNode;
