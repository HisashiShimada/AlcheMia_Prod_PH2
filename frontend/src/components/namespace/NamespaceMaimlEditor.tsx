'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Modal, Input, List, Tree, Button, Tooltip, Typography, message,
} from 'antd';
import {
  SearchOutlined, ArrowRightOutlined, CloseOutlined,
} from '@ant-design/icons';
import scopeRaw    from '../../../mock/namespace/uncertainty-scope.json';
import declaredRaw from '../../../mock/namespace/declaredNamespaces.json';
import termsRaw    from '../../../mock/namespace/terms.json';

const { Title, Text } = Typography;

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
interface ScopeNode {
  key: string;
  label: string;
  count: number;
  icon: string;
  prefix?: string;
  uri?: string;
  description?: string;
  children?: ScopeNode[];
}

interface NsItem {
  key: string;
  prefix: string;
  uri: string;
}

export interface NamespaceMaimlEditorProps {
  open: boolean;
  onClose: () => void;
}

// ──────────────────────────────────────────────
// ツリーを再帰的にフラット化
// ──────────────────────────────────────────────
const flattenNodes = (nodes: ScopeNode[]): ScopeNode[] =>
  nodes.flatMap((n) => [n, ...(n.children ? flattenNodes(n.children) : [])]);

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const NamespaceMaimlEditor: React.FC<NamespaceMaimlEditorProps> = ({ open, onClose }) => {
  const [declared,    setDeclared]    = useState<NsItem[]>(declaredRaw as NsItem[]);
  const [regSearch,   setRegSearch]   = useState('');
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [dropOver,    setDropOver]    = useState(false);

  const dragKeyRef = useRef<string | null>(null);

  // ──── 全ノードキー一覧
  const allKeys = useMemo(() => {
    return flattenNodes(scopeRaw as ScopeNode[]).map((n) => n.key);
  }, []);

  // ──── チェック操作：親をチェックすると子も全選択
  const handleCheck = (keys: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
    const checkedArr = (Array.isArray(keys) ? keys : keys.checked) as string[];
    const prevHadAll = checkedKeys.includes('all');
    const nowHasAll  = checkedArr.includes('all');

    if (!prevHadAll && nowHasAll) {
      setCheckedKeys(allKeys);
    } else if (prevHadAll && !nowHasAll) {
      setCheckedKeys([]);
    } else {
      setCheckedKeys(checkedArr);
    }
  };

  // ──── ツリーノードのドラッグ開始（葉ノードのみ）
  const handleDragStart = (e: React.DragEvent<HTMLSpanElement>, nodeKey: string) => {
    dragKeyRef.current = nodeKey;
    e.dataTransfer.setData('text/plain', nodeKey);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // ──── ドラッグ中のノードを宣言済みに追加
  const addNodeByKey = (key: string) => {
    const allFlat = flattenNodes(scopeRaw as ScopeNode[]);
    const node = allFlat.find((n) => n.key === key);
    if (!node) return;
    if (declared.some((d) => d.key === key)) {
      message.warning(`「${node.prefix ?? node.label}」は既に追加済みです`);
      return;
    }
    setDeclared((prev) => [...prev, { key: node.key, prefix: node.prefix ?? node.label, uri: node.uri ?? '' }]);
    message.success(`「${node.prefix ?? node.label}」を追加しました`);
  };

  // ──── ツリーノードタイトルレンダラー
  const renderScopeTitle = (node: ScopeNode) => {
    const isLeaf = !node.children;
    return (
      <span
        draggable={isLeaf}
        onDragStart={isLeaf ? (e) => handleDragStart(e, node.key) : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0, cursor: isLeaf ? 'grab' : 'default' }}
      >
        {isLeaf ? (
          <>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{node.prefix}</span>
            <span style={{ flex: 1, color: '#8c8c8c', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.description ?? node.uri}
            </span>
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.label}
            </span>
            {node.count > 0 && (
              <span style={{ color: '#8c8c8c', fontSize: 12, flexShrink: 0 }}>{node.count}</span>
            )}
          </>
        )}
      </span>
    );
  };

  const toAntTree = (nodes: ScopeNode[]): object[] =>
    nodes.map((n) => ({
      key:      n.key,
      title:    renderScopeTitle(n),
      children: n.children ? toAntTree(n.children) : undefined,
    }));

  // ──── ツリーデータ（検索フィルタ）
  const treeData = useMemo(() => {
    const allNodes = scopeRaw as ScopeNode[];
    if (!regSearch) return toAntTree(allNodes);
    const filter = (nodes: ScopeNode[]): ScopeNode[] =>
      nodes
        .map((n) => ({ ...n, children: n.children ? filter(n.children) : undefined }))
        .filter(
          (n) =>
            n.label.toLowerCase().includes(regSearch.toLowerCase()) ||
            (n.prefix ?? '').toLowerCase().includes(regSearch.toLowerCase()) ||
            (n.children && n.children.length > 0),
        );
    return toAntTree(filter(allNodes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regSearch, declared]);

  // ──── 追加ボタン：チェックされたノードを宣言済みに追加
  const handleBulkAdd = () => {
    const allFlat = flattenNodes(scopeRaw as ScopeNode[]);
    const toAdd: NsItem[] = checkedKeys
      .map((k) => allFlat.find((n) => n.key === k))
      .filter((n): n is ScopeNode => !!n && !declared.some((d) => d.key === n.key))
      .map((n) => ({ key: n.key, prefix: n.prefix ?? n.label, uri: n.uri ?? '' }));

    if (toAdd.length === 0) {
      message.warning('追加できる名前空間がありません（未選択または既に追加済み）');
      return;
    }
    setDeclared((prev) => [...prev, ...toAdd]);
    setCheckedKeys([]);
    message.success(`${toAdd.length}件の名前空間を追加しました`);
  };

  // ──── 除去（×）: 宣言済みリストから削除
  const handleRemove = (key: string) => {
    const item = declared.find((d) => d.key === key);
    if (!item) return;
    const usedCount = (termsRaw as { prefix: string }[]).filter((t) => t.prefix === item.prefix).length;
    const doRemove = () => {
      setDeclared((prev) => prev.filter((d) => d.key !== key));
      message.success(`「${item.prefix}」を宣言済みから除去しました`);
    };
    if (usedCount > 0) {
      Modal.confirm({
        title:     '使用中の名前空間',
        content:   `「${item.prefix}」は ${usedCount} 件の用語で使用中です。本当に削除しますか？`,
        okText:    '削除する',
        okType:    'danger',
        cancelText:'キャンセル',
        onOk:      doRemove,
      });
    } else {
      doRemove();
    }
  };

  // ──── 右パネルのドロップゾーンハンドラ
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropOver(true);
  };
  const handleDragLeave = () => setDropOver(false);
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropOver(false);
    const key = e.dataTransfer.getData('text/plain') || dragKeyRef.current;
    if (key) addNodeByKey(key);
    dragKeyRef.current = null;
  };

  // ──── 閉じる時に状態リセット
  const handleClose = () => {
    setRegSearch('');
    setCheckedKeys([]);
    onClose();
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
          MaiMLファイル 名前空間エディター
        </span>
      }
      width="90vw"
      style={{ top: 20 }}
      styles={{ body: { padding: '12px 16px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } }}
      footer={null}
      maskClosable={false}
    >
      {/* ── 名前空間選択エリア（2ペイン） ── */}
      <div style={{ display: 'flex', gap: 0, minHeight: 500, border: '1px solid #f0f0f0', borderRadius: 4, overflow: 'hidden' }}>

        {/* 左パネル：全体登録済み名前空間 */}
        <div style={{ width: '40%', borderRight: '1px solid #f0f0f0', background: '#fafafa', padding: '8px 12px', overflowY: 'auto' }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 10 }}>
            全体で登録されている名前空間
          </Title>
          <Input
            prefix={<SearchOutlined />}
            placeholder="名前空間を検索..."
            allowClear
            value={regSearch}
            onChange={(e) => setRegSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <Tree
            checkable
            blockNode
            defaultExpandAll
            treeData={treeData}
            checkedKeys={checkedKeys}
            onCheck={handleCheck}
            style={{ background: 'transparent' }}
          />
        </div>

        {/* 中央：追加ボタン */}
        <div style={{ width: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Tooltip title="追加 →">
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={handleBulkAdd}
              disabled={checkedKeys.length === 0}
            />
          </Tooltip>
        </div>

        {/* 右パネル：宣言済み名前空間（ドロップゾーン） */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: dropOver ? '#e6f4ff' : '#fafafa',
            border: dropOver ? '2px dashed #1677ff' : '2px solid transparent',
            borderRadius: '0 4px 4px 0',
            overflowY: 'auto',
            transition: 'background 0.15s, border 0.15s',
          }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            現在のMaiMLファイルに宣言されている名前空間
          </Title>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
            追加ボタン（→）またはドラッグ＆ドロップで名前空間を追加
          </Text>
          <List<NsItem>
            size="small"
            dataSource={declared}
            renderItem={(item) => (
              <List.Item style={{ padding: '5px 8px', marginBottom: 2, background: '#fff', borderRadius: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
                  <Text strong style={{ whiteSpace: 'nowrap' }}>{item.prefix}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {item.uri.length > 40 ? item.uri.slice(0, 40) + '...' : item.uri}
                  </Text>
                  <Tooltip title="削除">
                    <Button
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleRemove(item.key)}
                      style={{ marginLeft: 'auto', flexShrink: 0 }}
                    />
                  </Tooltip>
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>
    </Modal>
  );
};

export default NamespaceMaimlEditor;
