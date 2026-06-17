'use client';

/**
 * 暗号化対象ツリーコンポーネント
 *
 * @description
 * MAIMLファイルの要素をツリー表示し、暗号化対象ノードをチェックボックスで選択する。
 *
 * - 暗号化可能な要素: チェックボックスで選択可能
 * - 暗号化不可な要素（uuid, name, place, arc 等）: チェックボックスが disabled（グレーアウト）
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
  /** 選択中ノードのパス（単一選択・クリック用） */
  selectedPath: string | null;
  /** チェック済みパスの Set（チェックボックス用） */
  checkedPaths: Set<string>;
  /** クリック選択コールバック */
  onSelect: (node: MaimlTreeNode) => void;
  /** チェックボックス変更コールバック */
  onCheck: (checkedPaths: Set<string>) => void;
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

    const isGrayedOut = !node.isEncryptable;

    const label = (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: isGrayedOut ? '#bfbfbf' : undefined,
        }}
      >
        {/* ラベルテキスト */}
        <span>{node.label ?? node.key ?? node.id ?? node.tagName}</span>

        {/* タグ名ヒント（コンパクト表示） */}
        {node.tagName !== (node.label ?? node.key ?? node.id) && (
          <span style={{ fontSize: 10, color: isGrayedOut ? '#d9d9d9' : '#8c8c8c' }}>
            [{node.tagName}]
          </span>
        )}

        {/* プレース種別バッジ */}
        <PlaceTypeBadge placeType={node.placeType} />

        {/* 暗号化済みバッジ */}
        {node.isEncrypted && (
          <Tooltip title={`暗号化済み: ${node.encryptionInfo?.algorithmUri ?? '不明'}`}>
            <Tag color="warning" style={{ fontSize: 10, marginLeft: 2 }}>
              🔒 暗号化済
            </Tag>
          </Tooltip>
        )}

        {/* 暗号化不可ヒント */}
        {!node.isEncryptable && (
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
      /**
       * checkable=false にするとチェックボックス自体が非表示になる。
       * disabled にするとチェックボックスはグレーで表示され選択不可になる。
       * 仕様: チェックボックスを disabled（灰色表示）にする
       */
      disableCheckbox: !node.isEncryptable,
      disabled: false, // ノード全体の選択は可能（クリックで詳細確認できる）
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
  checkedPaths,
  onSelect,
  onCheck,
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

  /** チェックボックス変更 */
  const handleCheck = (
    checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] },
  ) => {
    const keys = Array.isArray(checked) ? checked : checked.checked;
    onCheck(new Set(keys as string[]));
  };

  return (
    <Tree
      checkable
      showIcon
      blockNode
      defaultExpandAll
      checkedKeys={Array.from(checkedPaths)}
      selectedKeys={selectedPath ? [selectedPath] : []}
      treeData={antdTreeData}
      onSelect={handleSelect}
      onCheck={handleCheck}
      style={{ padding: '0 8px 8px' }}
    />
  );
};

export default EncryptionTargetTree;
