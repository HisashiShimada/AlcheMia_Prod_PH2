'use client';

/**
 * 暗号化対象ツリーコンポーネント
 *
 * @description
 * MAIMLファイルの要素をツリー表示し、暗号化対象ノードを選択する。
 * 暗号化済みノードは錠前アイコンで表示し、選択不可（復号化は別途対応）。
 */

import React, { useMemo } from 'react';
import { Tree, Tag, Tooltip } from 'antd';
import {
  LockOutlined,
  UnlockOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { MaimlTreeNode } from '@/types/encryption';

interface EncryptionTargetTreeProps {
  treeData: MaimlTreeNode[];
  selectedPath: string | null;
  onSelect: (node: MaimlTreeNode) => void;
}

// ---------------------------------------------------------------------------
// ノードアイコン
// ---------------------------------------------------------------------------

function getNodeIcon(node: MaimlTreeNode): React.ReactNode {
  if (node.isEncrypted) {
    return <LockOutlined style={{ color: '#faad14' }} />;
  }
  switch (node.tagName) {
    case 'property':
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
    case 'place':
      return <ExperimentOutlined style={{ color: '#52c41a' }} />;
    case 'transition':
      return <ApartmentOutlined style={{ color: '#722ed1' }} />;
    default:
      return <UnlockOutlined style={{ color: '#8c8c8c' }} />;
  }
}

// ---------------------------------------------------------------------------
// プレース種別バッジ
// ---------------------------------------------------------------------------

const PLACE_TYPE_COLOR: Record<string, string> = {
  Material: 'blue',
  Condition: 'orange',
  Result: 'green',
};

function PlaceTypeBadge({ placeType }: { placeType?: string }) {
  if (!placeType) return null;
  return (
    <Tag color={PLACE_TYPE_COLOR[placeType] ?? 'default'} style={{ marginLeft: 4, fontSize: 10 }}>
      {placeType}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// ツリーデータ変換
// ---------------------------------------------------------------------------

function convertToAntdTree(
  nodes: MaimlTreeNode[],
  nodeMap: Map<string, MaimlTreeNode>,
): DataNode[] {
  return nodes.map((node) => {
    nodeMap.set(node.path, node);

    const label = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {node.label ?? node.key ?? node.id ?? node.tagName}
        <PlaceTypeBadge placeType={node.placeType} />
        {node.isEncrypted && (
          <Tooltip title={`暗号化済み: ${node.encryptionInfo?.algorithmUri ?? '不明'}`}>
            <Tag color="warning" style={{ fontSize: 10, marginLeft: 2 }}>
              暗号化済
            </Tag>
          </Tooltip>
        )}
      </span>
    );

    return {
      key: node.path,
      title: label,
      icon: getNodeIcon(node),
      // 暗号化済みノードはツリーで選択はできるが、ConfigPanelで復号化モードになる
      children: node.children ? convertToAntdTree(node.children, nodeMap) : undefined,
      isLeaf: !node.children || node.children.length === 0,
    };
  });
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const EncryptionTargetTree: React.FC<EncryptionTargetTreeProps> = ({
  treeData,
  selectedPath,
  onSelect,
}) => {
  /** ノードマップ（pathをキーにノードを取得） */
  const nodeMap = useMemo(() => new Map<string, MaimlTreeNode>(), []);

  /** Ant Design Tree 用データ */
  const antdTreeData = useMemo(() => {
    nodeMap.clear();
    return convertToAntdTree(treeData, nodeMap);
  }, [treeData, nodeMap]);

  const handleSelect = (selectedKeys: React.Key[]) => {
    const key = selectedKeys[0] as string;
    if (!key) return;
    const node = nodeMap.get(key);
    if (node) onSelect(node);
  };

  return (
    <Tree
      showIcon
      blockNode
      defaultExpandAll
      selectedKeys={selectedPath ? [selectedPath] : []}
      treeData={antdTreeData}
      onSelect={handleSelect}
      style={{ padding: '0 8px 8px' }}
    />
  );
};

export default EncryptionTargetTree;
