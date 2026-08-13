'use client';

/**
 * 暗号化対象ツリーコンポーネント
 *
 * @description
 * MAIMLファイルの要素をツリー表示し、クリックで暗号化処理対象ノードを選択する。
 * 選択されたノードの配下から暗号化対象要素が自動的に収集される（collectTargets）。
 *
 * - 暗号化可能な要素: クリックで選択可能（チェックボックスなし）
 * - 暗号化不可な要素（uuid, name, place, arc 等）: グレーアウト表示（クリック選択は可能）
 * - 暗号化済みノード: 🔒アイコンを表示
 */

import React, { useMemo } from 'react';
import { Tree, Tag, Tooltip } from 'antd';
import {
  LockOutlined,
  UnlockOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ApartmentOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { MaimlTreeNode } from '@/types/encryption';

interface EncryptionTargetTreeProps {
  treeData: MaimlTreeNode[];
  /** 選択中ノードのパス（クリック選択） */
  selectedPath: string | null;
  /** クリック選択コールバック */
  onSelect: (node: MaimlTreeNode) => void;
}

// ---------------------------------------------------------------------------
// ノードアイコン
// ---------------------------------------------------------------------------

function getNodeIcon(node: MaimlTreeNode): React.ReactNode {
  // 暗号化済みはロックアイコン（優先）
  if (node.isEncrypted) {
    return <LockOutlined style={{ color: '#faad14' }} />;
  }
  // 暗号化不可はグレーのストップアイコン
  if (!node.isEncryptable) {
    return <StopOutlined style={{ color: '#bfbfbf' }} />;
  }
  switch (node.tagName) {
    case 'property':
    case 'content':
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
    case 'material':
    case 'materialTemplate':
      return <ExperimentOutlined style={{ color: '#52c41a' }} />;
    case 'condition':
    case 'conditionTemplate':
      return <ExperimentOutlined style={{ color: '#fa8c16' }} />;
    case 'results':
    case 'resultTemplate':
      return <ExperimentOutlined style={{ color: '#eb2f96' }} />;
    case 'pnml':
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

    /**
     * グレーアウト条件:
     * - 暗号化不可かつ暗号化済みでない要素（メタデータ / Petri Net構造要素）
     * - 暗号化済み要素は通常の色で表示
     */
    const isStructuralNode = !node.isEncryptable && !node.isEncrypted;

    const label = (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: isStructuralNode ? '#bfbfbf' : undefined,
        }}
      >
        {/* ラベルテキスト */}
        <span>{node.label ?? node.key ?? node.id ?? node.tagName}</span>

        {/* タグ名ヒント（コンパクト表示） */}
        {node.tagName !== (node.label ?? node.key ?? node.id) && (
          <span style={{ fontSize: 10, color: isStructuralNode ? '#d9d9d9' : '#8c8c8c' }}>
            [{node.tagName}]
          </span>
        )}

        {/* プレース種別バッジ */}
        <PlaceTypeBadge placeType={node.placeType} />

        {/* 暗号化済みバッジ */}
        {node.isEncrypted && (
          <Tooltip title={`クリックして復号化設定を開く（使用アルゴリズム: ${node.encryptionInfo?.algorithmUri ?? '不明'}）`}>
            <Tag color="warning" style={{ fontSize: 10, marginLeft: 2, cursor: 'pointer' }}>
              🔒 秘匿済み
            </Tag>
          </Tooltip>
        )}

        {/* 暗号化不可ヒント（構造要素のみ） */}
        {isStructuralNode && (
          <Tooltip title="この要素は暗号化できません（メタデータ / Petri Net構造要素）">
            <Tag
              style={{
                fontSize: 10,
                marginLeft: 2,
                color: '#bfbfbf',
                borderColor: '#d9d9d9',
                background: '#fafafa',
              }}
            >
              選択不可
            </Tag>
          </Tooltip>
        )}
      </span>
    );

    return {
      key: node.path,
      title: label,
      icon: getNodeIcon(node),
      // チェックボックスなし・クリック選択のみ
      disabled: false,
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

  /** クリック選択 */
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
