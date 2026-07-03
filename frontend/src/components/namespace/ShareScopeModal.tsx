
'use client';

import React, { useState, useMemo } from 'react';
import { Modal, Tree, Typography, Alert } from 'antd';
import {
  BankOutlined,
  TeamOutlined,
  UserOutlined,
  GlobalOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────

/** 共有元のロール */
export type ShareSourceRole =
  | { kind: 'sys_admin' }
  | { kind: 'dept_owner'; deptKey: string; deptLabel: string }
  | { kind: 'team_owner'; teamKey: string; teamLabel: string };

/** 共有先として選択されたノード情報 */
export interface ShareTarget {
  key: string;
  label: string;
  prefix: string;
}

/** ツリーノード（共有先選択用） */
export interface ScopeNode {
  key: string;
  label: string;
  prefix?: string;
  icon?: React.ReactNode;
  selectable?: boolean;
  children?: ScopeNode[];
}

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────
interface ShareScopeModalProps {
  open: boolean;
  /** 共有する用語の件数 */
  termCount: number;
  /** ログインユーザーのロール（共有先の範囲を制限するため） */
  sourceRole: ShareSourceRole;
  /** 共有先ツリーデータ（NamespaceMain から渡す） */
  scopeNodes: ScopeNode[];
  onClose: () => void;
  /** 共有先が確定されたときのコールバック */
  onShare: (target: ShareTarget) => void;
}

// ──────────────────────────────────────────────
// ロール別の共有先制限ラベル
// ──────────────────────────────────────────────
const getRoleDescription = (role: ShareSourceRole): string => {
  switch (role.kind) {
    case 'sys_admin':
      return '組織まで共有できます';
    case 'dept_owner':
      return `「${role.deptLabel}」（部署）まで共有できます`;
    case 'team_owner':
      return `「${role.teamLabel}」（チーム）まで共有できます`;
  }
};

// ──────────────────────────────────────────────
// ロール別に選択可能なノードキーを判定
// ──────────────────────────────────────────────
const isNodeSelectable = (nodeKey: string, nodeDepth: number, role: ShareSourceRole): boolean => {
  switch (role.kind) {
    case 'sys_admin':
      // 組織ノード（depth=0）を含む全ノードが選択可能
      return nodeDepth >= 0;
    case 'dept_owner':
      // チーム（depth=2）・メンバー（depth=3）・部署（depth=1）まで選択可能
      // 組織ノード（depth=0）は選択不可
      return nodeDepth >= 1;
    case 'team_owner':
      // チーム（depth=2）・メンバー（depth=3）のみ選択可能
      return nodeDepth >= 2;
  }
};

// ──────────────────────────────────────────────
// ノードアイコン（depth別）
// ──────────────────────────────────────────────
const getNodeIcon = (depth: number) => {
  if (depth === 0) return <GlobalOutlined style={{ color: '#1677ff' }} />;
  if (depth === 1) return <BankOutlined style={{ color: '#52c41a' }} />;
  if (depth === 2) return <TeamOutlined style={{ color: '#fa8c16' }} />;
  return <UserOutlined style={{ color: '#8c8c8c' }} />;
};

// ──────────────────────────────────────────────
// ScopeNode → Ant Design Tree データに変換
// ──────────────────────────────────────────────
const toAntTreeData = (
  nodes: ScopeNode[],
  role: ShareSourceRole,
  depth = 0,
): object[] =>
  nodes.map((n) => {
    const selectable = isNodeSelectable(n.key, depth, role);
    return {
      key: n.key,
      title: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {getNodeIcon(depth)}
          <span style={{ color: selectable ? undefined : '#bbb' }}>
            {n.label}
          </span>
          {n.prefix && (
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
              {n.prefix}
            </Text>
          )}
          {!selectable && (
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
              （選択不可）
            </Text>
          )}
        </span>
      ),
      selectable,
      children: n.children ? toAntTreeData(n.children, role, depth + 1) : undefined,
    };
  });

// ──────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────
const ShareScopeModal: React.FC<ShareScopeModalProps> = ({
  open,
  termCount,
  sourceRole,
  scopeNodes,
  onClose,
  onShare,
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // 選択されたキーからノード情報を逆引き
  const findNode = (key: string, nodes: ScopeNode[]): ScopeNode | null => {
    for (const n of nodes) {
      if (n.key === key) return n;
      if (n.children) {
        const found = findNode(key, n.children);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = useMemo(
    () => (selectedKey ? findNode(selectedKey, scopeNodes) : null),
    [selectedKey, scopeNodes],
  );

  const treeData = useMemo(
    () => toAntTreeData(scopeNodes, sourceRole),
    [scopeNodes, sourceRole],
  );

  // 全ノードキーを収集（常に全展開）
  const allKeys = useMemo(() => {
    const collect = (nodes: object[]): string[] =>
      nodes.flatMap((n: any) => [n.key, ...(n.children ? collect(n.children) : [])]);
    return collect(treeData);
  }, [treeData]);

  const handleOk = () => {
    if (!selectedKey || !selectedNode) return;
    onShare({
      key: selectedKey,
      label: selectedNode.label,
      prefix: selectedNode.prefix ?? '',
    });
    setSelectedKey(null);
  };

  const handleClose = () => {
    setSelectedKey(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={`共有先を選択（${termCount}件の用語）`}
      okText="共有する"
      cancelText="キャンセル"
      okButtonProps={{
        disabled: !selectedKey,
        style: selectedKey
          ? { background: '#52c41a', borderColor: '#52c41a' }
          : undefined,
      }}
      onOk={handleOk}
      onCancel={handleClose}
      width={480}
    >
      <Alert
        type="info"
        showIcon
        message={getRoleDescription(sourceRole)}
        style={{ marginBottom: 16 }}
      />

      <div
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          padding: '8px 4px',
          maxHeight: 320,
          overflowY: 'auto',
          background: '#fafafa',
        }}
      >
        <Tree
          blockNode
          treeData={treeData}
          expandedKeys={allKeys}
          selectedKeys={selectedKey ? [selectedKey] : []}
          onSelect={(keys) => {
            const key = keys[0] as string ?? null;
            setSelectedKey(key);
          }}
        />
      </div>

      {selectedNode && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f6ffed', borderRadius: 4, border: '1px solid #b7eb8f' }}>
          <Text strong>共有先：</Text>
          <Text style={{ marginLeft: 8 }}>{selectedNode.label}</Text>
          {selectedNode.prefix && (
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              （prefix: {selectedNode.prefix}）
            </Text>
          )}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          ※ 選択した共有先に用語がコピーされます。元の用語はそのまま残ります。
        </Text>
      </div>
    </Modal>
  );
};

export default ShareScopeModal;
