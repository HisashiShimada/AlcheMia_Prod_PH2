'use client';

import React, { useState } from 'react';
import { Input, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import scopeData from '../../../mock/uncertainty-scope.json';

const { Search } = Input;
const { Text } = Typography;

/**
 * スコープノードの型定義
 */
export interface ScopeNode {
  key: string;
  label: string;
  count: number;
  icon: string;
  children?: ScopeNode[];
}

/**
 * UncertaintyScopeTreeのProps型定義
 */
interface UncertaintyScopeTreeProps {
  /** 選択中のスコープキー */
  selectedScope: string;
  /** スコープ選択時のコールバック */
  onScopeSelect: (scopeKey: string, label: string) => void;
}

/**
 * スコープツリーデータ（モックデータから読み込み）
 */
const SCOPE_TREE: ScopeNode[] = scopeData as ScopeNode[];

/**
 * ScopeNodeをAnt Design TreeのDataNodeに変換
 */
function toDataNode(node: ScopeNode): DataNode {
  return {
    key: node.key,
    title: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ flex: 1 }}>{node.label}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: '#e6f0ff',
            color: '#1677ff',
            padding: '1px 6px',
            borderRadius: 10,
            minWidth: 20,
            textAlign: 'center',
          }}
        >
          {node.count}
        </span>
      </span>
    ),
    children: node.children ? node.children.map(toDataNode) : undefined,
  };
}

/**
 * すべてのキーを収集（展開用）
 */
function collectAllKeys(nodes: ScopeNode[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    keys.push(node.key);
    if (node.children) {
      keys.push(...collectAllKeys(node.children));
    }
  }
  return keys;
}

/**
 * キーからラベルを検索
 */
function findLabel(nodes: ScopeNode[], key: string): string {
  for (const node of nodes) {
    if (node.key === key) return node.label;
    if (node.children) {
      const found = findLabel(node.children, key);
      if (found) return found;
    }
  }
  return key;
}

/**
 * スコープツリーコンポーネント
 * テンプレート管理画面の左ペインに表示するスコープ選択ツリー
 */
export default function UncertaintyScopeTree({
  selectedScope,
  onScopeSelect,
}: UncertaintyScopeTreeProps) {
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys] = useState<string[]>(collectAllKeys(SCOPE_TREE));

  const treeData = SCOPE_TREE.map(toDataNode);

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) return;
    const key = selectedKeys[0] as string;
    const label = findLabel(SCOPE_TREE, key);
    onScopeSelect(key, label);
  };

  return (
    <div
      style={{
        width: 260,
        minWidth: 220,
        maxWidth: 320,
        background: '#fff',
        borderRight: '1px solid #e8e8e8',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        height: '100%',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
          flexShrink: 0,
        }}
      >
        <Text strong style={{ fontSize: 12, color: '#555', letterSpacing: 0.3 }}>
          スコープ選択
        </Text>
      </div>

      {/* 検索 */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <Search
          placeholder="スコープを検索…"
          size="small"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          allowClear
        />
      </div>

      {/* ツリー */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        <Tree
          treeData={treeData}
          selectedKeys={[selectedScope]}
          expandedKeys={expandedKeys}
          defaultExpandAll
          blockNode
          onSelect={handleSelect}
          style={{ fontSize: 13 }}
          filterTreeNode={
            searchValue
              ? (node) =>
                  typeof node.title === 'object'
                    ? false
                    : String(node.title).toLowerCase().includes(searchValue.toLowerCase())
              : undefined
          }
        />
      </div>
    </div>
  );
}
