'use client';

import React, { useState, useMemo } from 'react';
import { Button, Input, Space, Tree } from 'antd';
import { ImportOutlined, ExportOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import UncertaintyListTable from './UncertaintyListTable';
import type { UncertaintyTemplate } from './UncertaintyListTable';
import UncertaintyDetailModal from './UncertaintyDetailModal';
import UncertaintyCreateModal from './UncertaintyCreateModal';
import UncertaintyImportModal from './UncertaintyImportModal';
import UncertaintyExportModal from './UncertaintyExportModal';
import mockData from '../../../mock/uncertainty.json';
import NamespaceMain from '../namespace/NamespaceMain';
import namespaceTreeRaw from '../../../mock/namespace/uncertainty-scope.json';

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
interface NamespaceNode {
  key: string;
  label: string;
  count: number;
  icon: string;
  children?: NamespaceNode[];
}

const toAntTree = (nodes: NamespaceNode[]): object[] =>
  nodes.map((n) => ({
    key:      n.key,
    title:    (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ flex: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {n.label}
        </span>
        {n.count > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12, flexShrink: 0 }}>{n.count}</span>
        )}
      </span>
    ),
    children: n.children ? toAntTree(n.children) : undefined,
  }));

/**
 * 不確かさ基準管理メイン画面コンポーネント
 * 左ペイン（名前空間ツリー固定）＋右ペイン（タブ：用語管理 / 不確かさ基準管理）
 */
export default function UncertaintyManagement() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'namespace' | 'criteria'>('namespace');

  // 名前空間ツリー選択（左ペイン）→ NamespaceMain に連携
  const [nsSearch,         setNsSearch]         = useState('');
  const [selectedNsKey,    setSelectedNsKey]    = useState<string | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<UncertaintyTemplate | null>(null);

  const templates = mockData as UncertaintyTemplate[];

  const handleOpenDetail = (template: UncertaintyTemplate) => {
    setSelectedTemplate(template);
    setDetailModalOpen(true);
  };

  // ──── 名前空間ツリーデータ（検索フィルタ付き）
  const treeData = useMemo(() => {
    const allNodes = namespaceTreeRaw as NamespaceNode[];
    const filterNodes = (nodes: NamespaceNode[]): NamespaceNode[] =>
      nodes
        .map((n) => ({ ...n, children: n.children ? filterNodes(n.children) : undefined }))
        .filter(
          (n) =>
            !nsSearch ||
            n.label.toLowerCase().includes(nsSearch.toLowerCase()) ||
            (n.children && n.children.length > 0),
        );
    return toAntTree(nsSearch ? filterNodes(allNodes) : allNodes);
  }, [nsSearch]);

  const TAB_LABELS: { key: 'namespace' | 'criteria'; label: string }[] = [
    { key: 'namespace', label: '用語管理' },
    { key: 'criteria',  label: '不確かさ基準管理' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── 左ペイン：名前空間ツリー（固定） ── */}
        <div style={{
          width: '22%', minWidth: 240, maxWidth: 360,
          background: '#fafafa', borderRight: '1px solid #e8e8e8',
          display: 'flex', flexDirection: 'column', padding: '12px 12px 8px', overflowY: 'auto',
        }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="名前空間を検索..."
            allowClear
            value={nsSearch}
            onChange={(e) => setNsSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <Tree
            blockNode
            defaultExpandAll
            treeData={treeData}
            style={{ background: 'transparent' }}
            onSelect={(keys) => setSelectedNsKey((keys[0] as string) ?? null)}
          />
        </div>

        {/* ── 右ペイン ── */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>

          {/* タブバー */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e8e8e8',
            background: '#fff',
            padding: '0 16px',
            flexShrink: 0,
          }}>
            {TAB_LABELS.map((tab) => (
              <div
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? '#1677ff' : '#595959',
                  borderBottom: activeTab === tab.key ? '2px solid #1677ff' : '2px solid transparent',
                  fontSize: 14,
                  userSelect: 'none',
                }}
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div style={{ flex: 1, overflow: 'hidden' }}>

            {/* 用語管理タブ：NamespaceMain（hideTree=true で左ツリー非表示、選択キーを外部連携） */}
            <div style={{ display: activeTab === 'namespace' ? 'flex' : 'none', height: '100%', overflow: 'hidden' }}>
              <NamespaceMain
                hideTree
                externalSelectedNsKey={selectedNsKey}
              />
            </div>

            {/* 不確かさ基準管理タブ：一覧のみ */}
            <div style={{ display: activeTab === 'criteria' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* ツールバー */}
              <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid #e8e8e8',
                background: '#fff',
                display: 'flex',
                justifyContent: 'flex-end',
                flexShrink: 0,
              }}>
                <Space>
                  <Button icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)}>
                    インポート
                  </Button>
                  <Button
                    icon={<ExportOutlined />}
                    disabled={selectedIds.length === 0}
                    onClick={() => setExportModalOpen(true)}
                  >
                    エクスポート
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalOpen(true)}
                  >
                    新規不確かさ基準
                  </Button>
                </Space>
              </div>
              {/* 一覧テーブル */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <UncertaintyListTable
                  templates={templates}
                  currentScopeLabel="すべて"
                  onOpenDetail={handleOpenDetail}
                  onSelectionChange={setSelectedIds}
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* モーダル群 */}
      <UncertaintyDetailModal
        open={detailModalOpen}
        template={selectedTemplate}
        onClose={() => setDetailModalOpen(false)}
      />
      <UncertaintyCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
      <UncertaintyImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      <UncertaintyExportModal
        open={exportModalOpen}
        selectedCount={selectedIds.length}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
