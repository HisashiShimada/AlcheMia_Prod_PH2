/**
 * TransitionNode - Transitionカスタムノード
 * 
 * Ant Design準拠のTransitionノード（矩形）
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { theme } from 'antd';

const { useToken } = theme;

/**
 * TransitionNodeコンポーネント
 */
const TransitionNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const { token } = useToken();
  
  const label = data.label || 'Transition';
  const stereotype = data.stereotype;

  return (
    <div
      style={{
        padding: '16px 20px',
        borderRadius: token.borderRadiusSM,
        border: `2px solid ${selected ? token.colorInfo : token.colorBorder}`,
        background: token.colorBgContainer,
        boxShadow: selected ? token.boxShadowSecondary : 'none',
        minWidth: 100,
        minHeight: 60,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.2s',
      }}
    >
      {/* 入力ハンドル */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: token.colorInfo,
          width: 10,
          height: 10,
          border: `2px solid ${token.colorBgContainer}`,
        }}
      />

      {/* ラベル */}
      <div
        style={{
          fontSize: token.fontSize,
          fontWeight: selected ? 600 : 400,
          color: token.colorText,
          textAlign: 'center',
        }}
      >
        {label}
      </div>

      {/* ステレオタイプ表示 */}
      {stereotype && (
        <div
          style={{
            fontSize: token.fontSizeSM,
            color: token.colorTextSecondary,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          «{stereotype}»
        </div>
      )}

      {/* 出力ハンドル */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: token.colorInfo,
          width: 10,
          height: 10,
          border: `2px solid ${token.colorBgContainer}`,
        }}
      />
    </div>
  );
});

TransitionNode.displayName = 'TransitionNode';

export default TransitionNode;