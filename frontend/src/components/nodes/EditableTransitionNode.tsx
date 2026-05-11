/**
 * EditableTransitionNode - Transitionノードコンポーネント（EditorV2用）
 * 
 * Transitionを表示するカスタムノード
 * 右クリック・ダブルクリックイベント対応、編集機能付き
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
/**
 * EditableTransitionNodeのデータ型
 */
interface EditableTransitionNodeData {
  id: string;
  name?: string;
  description?: string;
  onNodeRightClick?: (event: React.MouseEvent, nodeId: string) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, nodeId: string) => void;
  [key: string]: unknown;
}

/**
 * EditableTransitionNode - 編集可能なTransitionノード
 * 
 * 黒塗りつぶしの細い長方形
 * 右クリック・ダブルクリックで編集機能を提供
 */
const EditableTransitionNode: React.FC<NodeProps<EditableTransitionNodeData>> = memo(({ id, data, selected }) => {
  const { name, description, onNodeRightClick, onNodeDoubleClick } = data;

  /**
   * 右クリックハンドラー
   */
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('🖱️ [EditableTransitionNode] 右クリック受信:', id);
    
    if (onNodeRightClick) {
      onNodeRightClick(event, id);
    }
  }, [id, onNodeRightClick]);

  /**
   * ダブルクリックハンドラー
   */
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('🖱️ [EditableTransitionNode] ダブルクリック受信:', id);
    
    if (onNodeDoubleClick) {
      onNodeDoubleClick(event, id);
    }
  }, [id, onNodeDoubleClick]);

  return (
    <div style={{ position: 'relative' }}>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: '#555' }} 
      />
      
      <div
        style={{
          width: 5.6,
          height: 28,
          background: selected ? '#2196f3' : 'black',
          position: 'relative',
          boxShadow: selected ? '0 0 8px rgba(33, 150, 243, 0.8)' : 'none',
          cursor: 'pointer',
        }}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      >
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
          {name || id}
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: '#555' }} 
      />
    </div>
  );
});

EditableTransitionNode.displayName = 'EditableTransitionNode';

export default EditableTransitionNode;