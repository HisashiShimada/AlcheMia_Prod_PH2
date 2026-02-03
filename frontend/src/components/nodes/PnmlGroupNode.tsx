// frontend/src/components/nodes/PnmlGroupNode.tsx
// PNML要素グループ用のフレームノードコンポーネント

'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';

interface PnmlGroupNodeData {
  label?: string;
  description?: string;
  pnmlId?: string;
}

/**
 * PnmlGroupNode - PNML要素グループ用のフレームノード
 * 複数PNML要素を持つペトリネットで、各PNML要素をフレームで囲むために使用
 */
const PnmlGroupNode: React.FC<NodeProps<PnmlGroupNodeData>> = memo(({ data }) => {
  const { description, pnmlId } = data;
  
  // ヘッダーに表示するテキスト（description優先、なければid）
  const headerText = description || pnmlId || 'PNML Group';
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '2px dashed #1976d2',
        borderRadius: '8px',
        backgroundColor: 'rgba(25, 118, 210, 0.03)',
        position: 'relative',
        pointerEvents: 'none', // フレーム自体はクリック不可
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          position: 'absolute',
          top: '-8px',
          left: '8px',
          backgroundColor: '#1976d2',
          color: 'white',
          padding: '2px 4px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 500,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          lineHeight: 1,
        }}
      >
        <span style={{ 
          color: 'white', 
          fontWeight: 500,
          fontSize: '10px',
          lineHeight: 1,
        }}>
          {headerText}
        </span>
      </div>
    </div>
  );
});

PnmlGroupNode.displayName = 'PnmlGroupNode';

export default PnmlGroupNode;