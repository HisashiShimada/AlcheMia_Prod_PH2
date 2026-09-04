
'use client';

import React, { useState, useMemo } from 'react';
import { Modal, Tree, Typography } from 'antd';
import type { ShareScopeModalProps, ShareTarget, ScopeNode } from '@/types/namespace';
import { useLanguage } from '@/contexts/LanguageContext';

// re-export（既存の import 側を壊さないため）
export type { ShareTarget, ScopeNode } from '@/types/namespace';

const { Text } = Typography;

// ──────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────
const ShareScopeModal: React.FC<ShareScopeModalProps> = ({
  open,
  scopeNodes,
  onClose,
  onShare,
}) => {
  const { t } = useLanguage();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // ──────────────────────────────────────────────
  // ScopeNode → Ant Design Tree データに変換
  // ──────────────────────────────────────────────
  const toAntTreeData = (nodes: ScopeNode[]): object[] =>
    nodes.map((n) => ({
      key: n.key,
      title: (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 6,
          // selectable=false のノードはグレー表示・カーソル変更
          color: n.selectable === false ? '#bfbfbf' : undefined,
          cursor: n.selectable === false ? 'not-allowed' : undefined,
        }}>
          <span>{n.label}</span>
          {n.prefix && (
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
              {n.prefix}
            </Text>
          )}
        </span>
      ),
      selectable: n.selectable ?? true,
      children: n.children ? toAntTreeData(n.children) : undefined,
    }));

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
    () => toAntTreeData(scopeNodes),
    [scopeNodes, t],
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
      title={t('shareScopeModal.title')}
      okText={t('shareScopeModal.okText')}
      cancelText={t('common.cancel')}
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
          <Text strong>{t('shareScopeModal.selectedLabel')}</Text>
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
          {t('shareScopeModal.shareNote')}
        </Text>
      </div>
    </Modal>
  );
};

export default ShareScopeModal;
