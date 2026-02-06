/**
 * EditablePlaceNode - Placeノードコンポーネント（EditorV2用）
 * 
 * Material/Condition/Result Placeを表示するカスタムノード
 * 右クリック・ダブルクリックイベント対応、編集機能付き
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { PlaceType } from '@/types/editor';

/**
 * EditablePlaceNodeのデータ型
 */
interface EditablePlaceNodeData {
  id: string;
  placeType: PlaceType;
  name?: string;
  description?: string;
  onNodeRightClick?: (event: React.MouseEvent, nodeId: string) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, nodeId: string) => void;
  [key: string]: unknown;
}

/**
 * Placeタイプに応じたボーダーラジアスを取得
 * @param placeType - Place種別
 * @returns CSSのborderRadius値
 */
const getNodeShape = (placeType: PlaceType): string => {
  switch (placeType) {
    case 'material':
      // Material: 円形
      return '50%';
    case 'condition':
      // Condition: 角丸四角
      return '8px';
    case 'result':
      // Result: 四角
      return '0';
    default:
      return '50%';
  }
};

/**
 * EditablePlaceNode - 編集可能なPlaceノード
 * 
 * Material/Condition/Resultの3種類のPlaceを1つのコンポーネントで処理
 * placeTypeプロパティで形状を切り替え
 */
const EditablePlaceNode: React.FC<NodeProps<EditablePlaceNodeData>> = memo(({ id, data, selected }) => {
  const { placeType, name, description, onNodeRightClick, onNodeDoubleClick } = data;

  /**
   * 右クリックハンドラー
   */
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('🖱️ [EditablePlaceNode] 右クリック受信:', id);
    
    if (onNodeRightClick) {
      onNodeRightClick(event, id);
    }
  }, [id, onNodeRightClick]);

  /**
   * ダブルクリックハンドラー
   */
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('🖱️ [EditablePlaceNode] ダブルクリック受信:', id);
    
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
          width: 35,
          height: 35,
          borderRadius: getNodeShape(placeType),
          border: `2px solid ${selected ? '#2196f3' : 'black'}`,
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: selected ? '0 0 8px rgba(33, 150, 243, 0.8)' : 'none',
          cursor: 'pointer',
        }}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      >
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

EditablePlaceNode.displayName = 'EditablePlaceNode';

export default EditablePlaceNode;