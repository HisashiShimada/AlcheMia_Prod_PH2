/**
 * ResultPlaceNode - Result Placeカスタムノード
 * 
 * Ant Design準拠のResult Placeノード
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { theme } from 'antd';

const { useToken } = theme;

/**
 * ResultPlaceNodeコンポーネント
 */
const ResultPlaceNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const { token } = useToken();
  
  const isFormatFile = data.isFormatFile || false;
  const label = data.label || 'Result';
  const templateRef = data.templateRef;

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: token.borderRadiusLG,
        border: `2px solid ${selected ? token.colorSuccess : token.colorBorder}`,
        background: isFormatFile ? token.colorSuccessBg : token.colorBgContainer,
        boxShadow: selected ? token.boxShadowSecondary : 'none',
        minWidth: 120,
        transition: 'all 0.2s',
      }}
    >
      {/* 入力ハンドル */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: token.colorSuccess,
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
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      {/* テンプレート参照表示 */}
      {templateRef && (
        <div
          style={{
            fontSize: token.fontSizeSM,
            color: token.colorTextSecondary,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          📄 {templateRef}
        </div>
      )}

      {/* フォーマットファイルバッジ */}
      {isFormatFile && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            background: token.colorSuccess,
            color: token.colorBgContainer,
            fontSize: token.fontSizeSM,
            padding: '2px 8px',
            borderRadius: token.borderRadiusSM,
            fontWeight: 600,
          }}
        >
          Format
        </div>
      )}

      {/* 出力ハンドル */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: token.colorSuccess,
          width: 10,
          height: 10,
          border: `2px solid ${token.colorBgContainer}`,
        }}
      />
    </div>
  );
});

ResultPlaceNode.displayName = 'ResultPlaceNode';

export default ResultPlaceNode;