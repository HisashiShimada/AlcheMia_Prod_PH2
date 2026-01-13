// frontend/src/components/viewer/nodes/MaterialTemplateNode.tsx
// Material Templateノードコンポーネント（reference版互換）

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface MaterialTemplateData {
  label?: string;
  name?: string;
  id?: string;
  nodeType: 'place';
  templateType: 'material';
  description?: string;
  properties?: Record<string, string>;
  selectedProperties?: Record<string, string>;
}

/**
 * Material Templateノード - 円形ノード（Material用）
 * シンプルな円形で、内部は空（白色）
 */
const MaterialTemplateNode: React.FC<NodeProps<MaterialTemplateData>> = memo(({ data, selected }) => {
  return (
    <div style={{ position: 'relative' }}>
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#555' }} 
      />
      
      <div style={{
        width: 35,
        height: 35,
        borderRadius: '50%',
        border: `2px solid ${selected ? '#2196f3' : 'black'}`,
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: selected ? '0 0 8px rgba(33, 150, 243, 0.8)' : 'none',
        cursor: 'pointer',
      }}>
        {/* ラベルを下に配置 */}
        <div style={{
          position: 'absolute',
          bottom: -25,
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
          {data.name || data.label || data.id}
        </div>
        
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
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#555' }} 
      />
    </div>
  );
});

MaterialTemplateNode.displayName = 'MaterialTemplateNode';

export default MaterialTemplateNode;
