'use client';

import React, { useMemo } from 'react';
import {
  Tree,
  Button,
  Tag,
  Typography,
  Space,
  Tooltip,
  Badge,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  FileTextOutlined,
  ApartmentOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  EditOutlined,
  NodeIndexOutlined,
  BorderOutlined,
  RightCircleOutlined,
  BranchesOutlined,
  LeftOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// ----------------------------------------
// 型定義（PetriNetEditorInner の型に合わせる）
// ----------------------------------------

interface DocumentData {
  name?: string;
  uuid?: string;
  creator?: string;
  vendor?: string;
  owner?: string;
  date?: string;
  description?: string;
  protocolId?: string;
  methodId?: string;
  [key: string]: unknown;
}

interface MethodData {
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Array<{ id: string; type?: string; data: { nodeType: string; placeType?: string; name?: string } }>;
  edges: Array<{ id: string }>;
  viewport?: { x: number; y: number; zoom: number };
}

interface MaimlStructureTreePanelProps {
  open: boolean;
  onClose: () => void;
  documentData: DocumentData | null;
  methods: MethodData[];
  activeMethodIndex: number;
  /** documentノードクリック → DocumentEditDialog を開く */
  onEditDocument: () => void;
  /** methodノードクリック → そのMethodタブに切り替え */
  onMethodChange: (index: number) => void;
  /** テンプレートノードクリック → Template一覧ビューに切り替え */
  onViewTemplates: () => void;
}

// ----------------------------------------
// ノードラベルコンポーネント
// ----------------------------------------

const NodeLabel: React.FC<{
  icon: React.ReactNode;
  label: string;
  badge?: number;
  tag?: string;
  tagColor?: string;
  action?: { icon: React.ReactNode; tooltip: string; onClick: () => void };
  muted?: boolean;
}> = ({ icon, label, badge, tag, tagColor, action, muted }) => (
  <Space size={6} style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
    {icon}
    <Text style={{ fontSize: 13, color: muted ? '#8c8c8c' : undefined }}>{label}</Text>
    {tag && <Tag color={tagColor || 'default'} style={{ fontSize: 11, margin: 0 }}>{tag}</Tag>}
    {badge !== undefined && badge > 0 && (
      <Badge count={badge} size="small" style={{ backgroundColor: '#1677ff' }} />
    )}
    {action && (
      <Tooltip title={action.tooltip}>
        <Button
          type="text"
          size="small"
          icon={action.icon}
          style={{ padding: '0 4px', height: 20, marginLeft: 'auto' }}
          onClick={(e) => { e.stopPropagation(); action.onClick(); }}
        />
      </Tooltip>
    )}
  </Space>
);

// ----------------------------------------
// ツリーデータ構築
// ----------------------------------------

function buildTreeData(
  documentData: DocumentData | null,
  methods: MethodData[],
  activeMethodIndex: number,
  handlers: {
    onEditDocument: () => void;
    onMethodChange: (i: number) => void;
    onViewTemplates: () => void;
  }
): DataNode[] {
  // --- document ノード ---
  const docChildren: DataNode[] = [
    {
      key: 'doc-uuid',
      title: (
        <NodeLabel
          icon={<Text type="secondary" style={{ fontSize: 11 }}>#</Text>}
          label={documentData?.uuid ? `uuid: ${documentData.uuid.substring(0, 8)}...` : 'uuid: (未設定)'}
          muted
        />
      ),
      isLeaf: true,
      selectable: false,
    },
    {
      key: 'doc-creator',
      title: (
        <NodeLabel
          icon={<Text type="secondary" style={{ fontSize: 11 }}>👤</Text>}
          label={`creator: ${documentData?.creator || '(未設定)'}`}
          muted
        />
      ),
      isLeaf: true,
      selectable: false,
    },
    {
      key: 'doc-date',
      title: (
        <NodeLabel
          icon={<Text type="secondary" style={{ fontSize: 11 }}>📅</Text>}
          label={`date: ${documentData?.date || '(未設定)'}`}
          muted
        />
      ),
      isLeaf: true,
      selectable: false,
    },
  ];

  const documentNode: DataNode = {
    key: 'document',
    title: (
      <NodeLabel
        icon={<FileTextOutlined style={{ color: '#1677ff' }} />}
        label={`document: ${documentData?.name || '(未設定)'}`}
        action={{
          icon: <EditOutlined />,
          tooltip: 'Document を編集',
          onClick: handlers.onEditDocument,
        }}
      />
    ),
    children: docChildren,
  };

  // --- protocol > method[] ノード ---
  const methodNodes: DataNode[] = methods.map((method, idx) => {
    const places = method.nodes.filter(n => n.data.nodeType === 'place');
    const transitions = method.nodes.filter(n => n.data.nodeType === 'transition');
    const materialTemplates = places.filter(n => n.data.placeType === 'material');
    const conditionTemplates = places.filter(n => n.data.placeType === 'condition');
    const resultTemplates = places.filter(n => n.data.placeType === 'result');
    const isActive = idx === activeMethodIndex;

    const methodChildren: DataNode[] = [
      {
        key: `method-${idx}-pnml`,
        title: (
          <NodeLabel
            icon={<NodeIndexOutlined style={{ color: '#722ed1' }} />}
            label="pnml"
            tag={`place: ${places.length} / trans: ${transitions.length} / arc: ${method.edges.length}`}
            tagColor="purple"
          />
        ),
        isLeaf: true,
        selectable: false,
      },
      {
        key: `method-${idx}-program`,
        title: (
          <NodeLabel
            icon={<BranchesOutlined style={{ color: '#52c41a' }} />}
            label="program / instruction"
            muted
          />
        ),
        isLeaf: true,
        selectable: false,
      },
      {
        key: `method-${idx}-material`,
        title: (
          <NodeLabel
            icon={<BorderOutlined style={{ color: '#fa8c16' }} />}
            label="materialTemplate"
            badge={materialTemplates.length}
            action={materialTemplates.length > 0 ? {
              icon: <RightCircleOutlined />,
              tooltip: 'テンプレート一覧を表示',
              onClick: handlers.onViewTemplates,
            } : undefined}
          />
        ),
        isLeaf: true,
      },
      {
        key: `method-${idx}-condition`,
        title: (
          <NodeLabel
            icon={<BorderOutlined style={{ color: '#1677ff' }} />}
            label="conditionTemplate"
            badge={conditionTemplates.length}
            action={conditionTemplates.length > 0 ? {
              icon: <RightCircleOutlined />,
              tooltip: 'テンプレート一覧を表示',
              onClick: handlers.onViewTemplates,
            } : undefined}
          />
        ),
        isLeaf: true,
      },
      {
        key: `method-${idx}-result`,
        title: (
          <NodeLabel
            icon={<BorderOutlined style={{ color: '#52c41a' }} />}
            label="resultTemplate"
            badge={resultTemplates.length}
            action={resultTemplates.length > 0 ? {
              icon: <RightCircleOutlined />,
              tooltip: 'テンプレート一覧を表示',
              onClick: handlers.onViewTemplates,
            } : undefined}
          />
        ),
        isLeaf: true,
      },
    ];

    return {
      key: `method-${idx}`,
      title: (
        <NodeLabel
          icon={<ExperimentOutlined style={{ color: isActive ? '#1677ff' : '#595959' }} />}
          label={`method: ${method.methodId}`}
          tag={isActive ? 'アクティブ' : undefined}
          tagColor="blue"
          action={{
            icon: <RightCircleOutlined />,
            tooltip: 'このMethodを表示',
            onClick: () => handlers.onMethodChange(idx),
          }}
        />
      ),
      children: methodChildren,
    };
  });

  // --- protocol > data（共通テンプレート）---
  const dataNode: DataNode = {
    key: 'protocol-data',
    title: (
      <NodeLabel
        icon={<DatabaseOutlined style={{ color: '#722ed1' }} />}
        label="data（共通テンプレート）"
        action={{
          icon: <RightCircleOutlined />,
          tooltip: '共通テンプレートを表示',
          onClick: handlers.onViewTemplates,
        }}
      />
    ),
    isLeaf: true,
  };

  // --- protocol > eventLog ---
  const eventLogNode: DataNode = {
    key: 'protocol-eventlog',
    title: (
      <NodeLabel
        icon={<HistoryOutlined style={{ color: '#8c8c8c' }} />}
        label="eventLog"
        tag="読み取り専用"
        tagColor="default"
        muted
      />
    ),
    isLeaf: true,
    selectable: false,
  };

  // --- protocol ノード ---
  const protocolNode: DataNode = {
    key: 'protocol',
    title: (
      <NodeLabel
        icon={<ApartmentOutlined style={{ color: '#52c41a' }} />}
        label={`protocol: ${documentData?.protocolId || '(ID未設定)'}`}
      />
    ),
    children: [...methodNodes, dataNode, eventLogNode],
  };

  return [documentNode, protocolNode];
}

// ----------------------------------------
// メインコンポーネント（固定サイドパネル型）
// ----------------------------------------

/** パネル幅（px） */
const PANEL_WIDTH = 300;

/**
 * MaimlStructureTreePanel
 * MaiMLファイルの <document>/<protocol>/<data>/<eventLog> 階層構造を
 * エディタ左側の固定サイドパネルとしてツリー表示・操作する
 *
 * 要件: ED-01（案A: サイドパネル型）
 */
const MaimlStructureTreePanel: React.FC<MaimlStructureTreePanelProps> = ({
  open,
  onClose,
  documentData,
  methods,
  activeMethodIndex,
  onEditDocument,
  onMethodChange,
  onViewTemplates,
}) => {
  const treeData = useMemo(
    () =>
      buildTreeData(documentData, methods, activeMethodIndex, {
        onEditDocument,
        onMethodChange,
        onViewTemplates,
      }),
    [documentData, methods, activeMethodIndex, onEditDocument, onMethodChange, onViewTemplates]
  );

  // デフォルト展開キー
  const defaultExpandedKeys = useMemo(() => {
    const keys: string[] = ['document', 'protocol'];
    methods.forEach((_, idx) => keys.push(`method-${idx}`));
    return keys;
  }, [methods]);

  return (
    <div
      style={{
        width: open ? PANEL_WIDTH : 0,
        minWidth: open ? PANEL_WIDTH : 0,
        overflow: 'hidden',
        transition: 'width 200ms ease, min-width 200ms ease',
        borderRight: open ? '1px solid #f0f0f0' : 'none',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid #f0f0f0',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Space size={6}>
          <ApartmentOutlined style={{ color: '#1677ff' }} />
          <Text strong style={{ fontSize: 13 }}>MaiML 構造ツリー</Text>
        </Space>
        <Tooltip title="パネルを閉じる">
          <Button
            type="text"
            size="small"
            icon={<LeftOutlined />}
            onClick={onClose}
            style={{ padding: '0 4px' }}
          />
        </Tooltip>
      </div>

      {/* 凡例 */}
      <div
        style={{
          padding: '6px 10px',
          backgroundColor: '#fafafa',
          borderBottom: '1px solid #f0f0f0',
          fontSize: 11,
          color: '#595959',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Space wrap size={6}>
          <Space size={3}><FileTextOutlined style={{ color: '#1677ff' }} /><span>doc</span></Space>
          <Space size={3}><ApartmentOutlined style={{ color: '#52c41a' }} /><span>protocol</span></Space>
          <Space size={3}><ExperimentOutlined style={{ color: '#595959' }} /><span>method</span></Space>
          <Space size={3}><DatabaseOutlined style={{ color: '#722ed1' }} /><span>data</span></Space>
        </Space>
      </div>

      {/* ツリー本体 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 4px' }}>
        <Tree
          treeData={treeData}
          defaultExpandedKeys={defaultExpandedKeys}
          showLine={{ showLeafIcon: false }}
          blockNode
          style={{ fontSize: 13, whiteSpace: 'nowrap' }}
          onSelect={(_, info) => {
            const key = info.node.key as string;
            // method ノードクリック → Method切り替え
            const methodMatch = key.match(/^method-(\d+)$/);
            if (methodMatch) {
              onMethodChange(parseInt(methodMatch[1]));
            }
            // document ノードクリック → Document編集
            if (key === 'document') {
              onEditDocument();
            }
            // data/template ノードクリック → テンプレート一覧
            if (key === 'protocol-data' || key.endsWith('-material') || key.endsWith('-condition') || key.endsWith('-result')) {
              onViewTemplates();
            }
          }}
        />
      </div>

      {/* フッター */}
      <div
        style={{
          padding: '6px 10px',
          borderTop: '1px solid #f0f0f0',
          fontSize: 11,
          color: '#8c8c8c',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <RightCircleOutlined /> で各機能を開けます
      </div>
    </div>
  );
};

export default MaimlStructureTreePanel;
