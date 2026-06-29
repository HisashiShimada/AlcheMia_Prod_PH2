'use client';

import React, { useState } from 'react';
import {
  Modal, List, Switch, Tooltip, Typography, message,
} from 'antd';
import scopeTreeRaw from '../../../mock/namespace/uncertainty-scope.json';
import termsRaw    from '../../../mock/namespace/terms.json';

const { Text } = Typography;

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
interface NsItem {
  key: string;
  prefix: string;
  uri: string;
  order: number;
  auto: boolean;
  category: 'global' | 'organization' | 'personal';
  deleted?: boolean;
}

interface ScopeNode {
  key: string;
  label: string;
  count: number;
  icon?: string;
  prefix?: string;
  uri?: string;
  description?: string;
  children?: ScopeNode[];
}

export interface NamespaceMaimlEditorProps {
  open: boolean;
  onClose: () => void;
}

// ──────────────────────────────────────────────
// モック: ログイン中ユーザーの所属ノードキー
// 本番実装では認証APIから取得する
// ──────────────────────────────────────────────
const CURRENT_USER_NS_KEY    = 'rd-materials';
const CURRENT_USER_PERSONAL_KEY = 'user-me';

// ──────────────────────────────────────────────
// ツリーから指定キーへの祖先キー一覧を返す
// ──────────────────────────────────────────────
const getAncestorKeys = (
  targetKey: string,
  nodes: ScopeNode[],
  ancestors: string[] = [],
): string[] | null => {
  for (const node of nodes) {
    if (node.key === targetKey) return ancestors;
    if (node.children) {
      const found = getAncestorKeys(targetKey, node.children, [...ancestors, node.key]);
      if (found) return found;
    }
  }
  return null;
};

// ──────────────────────────────────────────────
// ツリーから指定キーのノードを検索
// ──────────────────────────────────────────────
const findNode = (key: string, nodes: ScopeNode[]): ScopeNode | null => {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNode(key, node.children);
      if (found) return found;
    }
  }
  return null;
};

// ──────────────────────────────────────────────
// ノードの直下 children の prefix/uri を収集（孫以下は含めない）
// ──────────────────────────────────────────────
const collectDirectChildren = (node: ScopeNode): { key: string; prefix: string; uri: string }[] =>
  (node.children ?? [])
    .filter((c) => c.prefix && c.uri)
    .map((c) => ({ key: c.key, prefix: c.prefix!, uri: c.uri! }));

// ──────────────────────────────────────────────
// uncertainty-scope.json から自動設定する名前空間を収集する
//
// 収集対象:
//   1. Global 直下の全ノード（prefix + uri を持つもの）
//   2. 自分の所属ノード（CURRENT_USER_NS_KEY）+ その祖先ノード（company は除外）
//   3. Personal > user-me 直下の全ノード
// ──────────────────────────────────────────────
const buildAutoNamespaces = (): NsItem[] => {
  const tree = scopeTreeRaw as ScopeNode[];
  const result: { key: string; prefix: string; uri: string; category: NsItem['category'] }[] = [];
  const seen = new Set<string>();

  const add = (key: string, prefix: string, uri: string, category: NsItem['category']) => {
    if (!seen.has(prefix)) {
      seen.add(prefix);
      result.push({ key, prefix, uri, category });
    }
  };

  // 1. Global 直下
  const globalNode = tree.find((n) => n.key === 'global');
  if (globalNode) {
    for (const child of collectDirectChildren(globalNode)) {
      add(child.key, child.prefix, child.uri, 'global');
    }
  }

  // 2. 自分の所属ノード + 祖先（company 除外）
  const ancestorKeys = getAncestorKeys(CURRENT_USER_NS_KEY, tree) ?? [];
  // 祖先（上から順に。ただし company / personal などルートは prefix を持たないので自然にスキップ）
  for (const ak of ancestorKeys) {
    const node = findNode(ak, tree);
    if (node?.prefix && node?.uri) {
      add(node.key, node.prefix, node.uri, 'organization');
    }
  }
  // 自分自身
  const selfNode = findNode(CURRENT_USER_NS_KEY, tree);
  if (selfNode?.prefix && selfNode?.uri) {
    add(selfNode.key, selfNode.prefix, selfNode.uri, 'organization');
  }

  // 3. Personal > user-me 直下
  const personalNode  = tree.find((n) => n.key === 'personal');
  const userMeNode    = personalNode ? findNode(CURRENT_USER_PERSONAL_KEY, [personalNode]) : null;
  if (userMeNode) {
    for (const child of collectDirectChildren(userMeNode)) {
      add(child.key, child.prefix, child.uri, 'personal');
    }
  }

  return result.map((r, i) => ({ ...r, order: i + 1, auto: true, deleted: false }));
};

// ──────────────────────────────────────────────
// カテゴリラベル
// ──────────────────────────────────────────────
const categoryLabel: Record<NsItem['category'], string> = {
  global:       'グローバル',
  organization: '組織',
  personal:     '個人',
};

const categoryColor: Record<NsItem['category'], string> = {
  global:       '#1677ff',
  organization: '#52c41a',
  personal:     '#fa8c16',
};

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const NamespaceMaimlEditor: React.FC<NamespaceMaimlEditorProps> = ({ open, onClose }) => {
  const [declared, setDeclared] = useState<NsItem[]>(() =>
    buildAutoNamespaces(),
  );

  // ──── 削除（ソフトデリート）: global / personal のみ可能
  const handleRemove = (key: string) => {
    const item = declared.find((d) => d.key === key);
    if (!item) return;
    const usedCount = (termsRaw as { prefix: string }[]).filter(
      (t) => t.prefix === item.prefix,
    ).length;

    const doRemove = () => {
      setDeclared((prev) => prev.map((d) => d.key === key ? { ...d, deleted: true } : d));
      message.success(`「${item.prefix}」をOFFにしました`);
    };

    if (usedCount > 0) {
      Modal.confirm({
        title:     '名前空間をOFFにしますか？',
        content:   `「${item.prefix}」は ${usedCount} 件の用語で使用中です。OFFにしてよいですか？`,
        okText:    'OFFにする',
        okType:    'danger',
        cancelText:'キャンセル',
        onOk:      doRemove,
      });
    } else {
      Modal.confirm({
        title:     '名前空間をOFFにしますか？',
        content:   `「${item.prefix}」をOFFにしてよいですか？`,
        okText:    'OFFにする',
        cancelText:'キャンセル',
        onOk:      doRemove,
      });
    }
  };

  // ──── 復元
  const handleRestore = (key: string) => {
    const item = declared.find((d) => d.key === key);
    if (!item) return;
    setDeclared((prev) => prev.map((d) => d.key === key ? { ...d, deleted: false } : d));
    message.success(`「${item.prefix}」を復元しました`);
  };

  // ──── 閉じる
  const handleClose = () => {
    onClose();
  };

  // ON件数 / OFF件数
  const onCount  = declared.filter((d) => !d.deleted).length;
  const offCount = declared.filter((d) => d.deleted).length;

  // ──────────────────────────────────────────
  // 共通リストアイテムレンダラー
  // ──────────────────────────────────────────
  const renderItem = (item: NsItem) => {
    const canToggle = item.category === 'global' || item.category === 'personal';
    const isOff     = item.deleted === true;

    return (
      <List.Item
        style={{
          padding: '8px 12px',
          background: isOff ? '#f5f5f5' : '#fafafa',
          borderBottom: '1px solid #f0f0f0',
          opacity: isOff ? 0.6 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
          {/* カテゴリバッジ */}
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 10,
              background: categoryColor[item.category] + '1a',
              color: categoryColor[item.category],
              border: `1px solid ${categoryColor[item.category]}40`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {categoryLabel[item.category]}
          </span>

          {/* prefix */}
          <Text
            strong
            style={{
              whiteSpace: 'nowrap',
              minWidth: 80,
              textDecoration: isOff ? 'line-through' : 'none',
              color: isOff ? '#aaa' : undefined,
            }}
          >
            {item.prefix}
          </Text>

          {/* URI */}
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: isOff ? 'line-through' : 'none',
              color: isOff ? '#bbb' : undefined,
            }}
            title={item.uri}
          >
            {item.uri}
          </Text>

          {/* ON/OFF トグルスイッチ（組織カテゴリは非表示） */}
          {canToggle ? (
            <Tooltip title={isOff ? 'OFFです。クリックでONに戻す' : 'ONです。クリックでOFFにする'}>
              <Switch
                checked={!isOff}
                checkedChildren="ON"
                unCheckedChildren="OFF"
                onChange={(checked) => {
                  if (checked) {
                    handleRestore(item.key);
                  } else {
                    handleRemove(item.key);
                  }
                }}
                style={{ flexShrink: 0 }}
              />
            </Tooltip>
          ) : (
            <span style={{ width: 52, flexShrink: 0 }} />
          )}
        </div>
      </List.Item>
    );
  };

  // ──────────────────────────────────────────
  // レンダリング
  // ──────────────────────────────────────────
  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          このMaiMLファイルに設定されている名前空間
        </span>
      }
      width={660}
      style={{ top: 40 }}
      styles={{ body: { padding: '12px 16px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' } }}
      footer={null}
      maskClosable={false}
    >
      {/* 説明テキスト */}
      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
        スイッチをON/OFFで名前空間の適用状態を切り替えられます。組織カテゴリは変更できません。
      </Text>

      {/* 全名前空間リスト（ON/OFF混在） */}
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
        <List<NsItem>
          size="small"
          dataSource={declared}
          locale={{ emptyText: '設定されている名前空間がありません' }}
          renderItem={renderItem}
        />
      </div>

      {/* 件数表示 */}
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12, textAlign: 'right' }}>
        ON: {onCount} 件 / OFF: {offCount} 件
      </Text>
    </Modal>
  );
};

export default NamespaceMaimlEditor;
