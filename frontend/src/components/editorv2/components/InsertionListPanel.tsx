'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
  Badge,
  Popconfirm,
  Alert,
  Divider,
  message,
  Segmented,
} from 'antd';
import InsertionWizardModal from './InsertionWizardModal';
import InsertionEditModal from './InsertionEditModal';
import MaimlStructureTreePanel from './MaimlStructureTreePanel';
import InsertionCompactRow from './InsertionCompactRow';
import type { ColumnsType } from 'antd/es/table';
import {
  LinkOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  FileImageOutlined,
  ReloadOutlined,
  TableOutlined,
  UnorderedListOutlined,
  ExpandAltOutlined,
  CompressOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// ----------------------------------------
// 型定義
// ----------------------------------------

type InsertionFileType = 'maiml' | 'non-maiml';
type InsertionLocation = 'document' | 'method' | 'result' | 'property' | 'content' | 'other';
type InsertionStatus = 'valid' | 'warning' | 'error';

interface InsertionItem {
  id: string;
  uri: string;
  hash: string;
  hashMethod: string;
  uuid: string | null;
  format: string;
  fileType: InsertionFileType;
  insertionLocation: InsertionLocation;
  status: InsertionStatus;
  description: string;
}

// MaimlStructureTreePanel に渡すための型（最小限）
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

interface InsertionListPanelProps {
  open: boolean;
  onClose: () => void;
  /** MaiML構造ツリーに渡すデータ */
  documentData?: DocumentData | null;
  methods?: MethodData[];
  activeMethodIndex?: number;
  onEditDocument?: () => void;
  onMethodChange?: (index: number) => void;
  onViewTemplates?: () => void;
}

// ----------------------------------------
// ヘルパー
// ----------------------------------------

const locationLabel: Record<InsertionLocation, string> = {
  document: '<document>',
  method: '<method>',
  result: '<result>',
  property: '<property>',
  content: '<content>',
  other: 'その他',
};

const locationColor: Record<InsertionLocation, string> = {
  document: 'blue',
  method: 'geekblue',
  result: 'green',
  property: 'orange',
  content: 'cyan',
  other: 'default',
};

const statusConfig: Record<InsertionStatus, { icon: React.ReactNode; label: string; color: string }> = {
  valid: {
    icon: <CheckCircleOutlined />,
    label: '正常',
    color: '#52c41a',
  },
  warning: {
    icon: <WarningOutlined />,
    label: '警告',
    color: '#faad14',
  },
  error: {
    icon: <CloseCircleOutlined />,
    label: 'エラー',
    color: '#ff4d4f',
  },
};

// ----------------------------------------
// サマリーバー
// ----------------------------------------
const VerificationSummary: React.FC<{
  insertions: InsertionItem[];
  onVerifyAll: () => void;
  isVerifying: boolean;
}> = ({ insertions, onVerifyAll, isVerifying }) => {
  const valid = insertions.filter((i) => i.status === 'valid').length;
  const warning = insertions.filter((i) => i.status === 'warning').length;
  const error = insertions.filter((i) => i.status === 'error').length;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: '#fafafa',
        borderRadius: 6,
        border: '1px solid #f0f0f0',
        marginBottom: 16,
      }}
    >
      <Space size={20}>
        <Space size={6}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <Text style={{ color: '#52c41a', fontWeight: 600 }}>{valid}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>正常</Text>
        </Space>
        <Space size={6}>
          <WarningOutlined style={{ color: '#faad14' }} />
          <Text style={{ color: '#faad14', fontWeight: 600 }}>{warning}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>警告</Text>
        </Space>
        <Space size={6}>
          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          <Text style={{ color: '#ff4d4f', fontWeight: 600 }}>{error}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>エラー</Text>
        </Space>
        <Divider type="vertical" />
        <Text type="secondary" style={{ fontSize: 12 }}>合計 {insertions.length} 件</Text>
      </Space>
      <Button
        icon={<SafetyCertificateOutlined />}
        onClick={onVerifyAll}
        loading={isVerifying}
        size="small"
      >
        整合性検証を実行
      </Button>
    </div>
  );
};

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------

/**
 * InsertionListPanel
 * Insertion一覧表示・管理モーダル
 * 要件: ED-02, ED-12, VE-01〜VE-09
 */
const InsertionListPanel: React.FC<InsertionListPanelProps> = ({
  open,
  onClose,
  documentData = null,
  methods = [],
  activeMethodIndex = 0,
  onEditDocument,
  onMethodChange,
  onViewTemplates,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [insertions, setInsertions] = useState<InsertionItem[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InsertionItem | null>(null);

  // 縮約表示 state
  const [viewMode, setViewMode] = useState<'table' | 'compact'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('insertion-view-mode') as 'table' | 'compact') ?? 'table';
    }
    return 'table';
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('insertion-view-mode', viewMode);
    }
  }, [viewMode]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => setExpandedIds(new Set(insertions.map((i) => i.id)));
  const handleCollapseAll = () => setExpandedIds(new Set());

  const onAddNew = () => setWizardOpen(true);
  const onEdit = (item: InsertionItem) => setEditTarget(item);
  const onVerifyAll = () => {
    setIsVerifying(true);
    setTimeout(() => setIsVerifying(false), 1500);
  };

  const handleDelete = (id: string) => {
    setInsertions((prev) => prev.filter((i) => i.id !== id));
    message.success('Insertionを削除しました');
  };

  const columns: ColumnsType<InsertionItem> = [
    {
      title: '状態',
      dataIndex: 'status',
      key: 'status',
      width: 72,
      align: 'center',
      filters: [
        { text: '正常', value: 'valid' },
        { text: '警告', value: 'warning' },
        { text: 'エラー', value: 'error' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: InsertionStatus) => {
        const cfg = statusConfig[status];
        return (
          <Tooltip title={cfg.label}>
            <span style={{ color: cfg.color, fontSize: 18, display: 'inline-flex', alignItems: 'center' }}>
              {cfg.icon}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '種別',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 90,
      filters: [
        { text: 'MaiML', value: 'maiml' },
        { text: '非MaiML', value: 'non-maiml' },
      ],
      onFilter: (value, record) => record.fileType === value,
      render: (fileType: InsertionFileType) =>
        fileType === 'maiml' ? (
          <Space size={4}>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>MaiML</Tag>
          </Space>
        ) : (
          <Space size={4}>
            <FileImageOutlined style={{ color: '#52c41a' }} />
            <Tag color="green" style={{ fontSize: 11, margin: 0 }}>非MaiML</Tag>
          </Space>
        ),
    },
    {
      title: 'URI',
      dataIndex: 'uri',
      key: 'uri',
      ellipsis: true,
      render: (uri: string, record) => (
        <div>
          <Tooltip title={uri}>
            <Text code style={{ fontSize: 12 }}>
              <LinkOutlined style={{ marginRight: 4 }} />
              {uri}
            </Text>
          </Tooltip>
          {record.description && (
            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
              {record.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'フォーマット',
      dataIndex: 'format',
      key: 'format',
      width: 160,
      render: (format: string) =>
        format ? (
          <Tag style={{ fontSize: 11 }}>{format}</Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
        ),
    },
    {
      title: '記述場所',
      dataIndex: 'insertionLocation',
      key: 'insertionLocation',
      width: 110,
      render: (loc: InsertionLocation) => (
        <Tag color={locationColor[loc]} style={{ fontSize: 11 }}>
          {locationLabel[loc]}
        </Tag>
      ),
    },
    {
      title: 'ハッシュ',
      dataIndex: 'hash',
      key: 'hash',
      width: 100,
      render: (hash: string, record) => (
        hash ? (
          <Tooltip title={`${record.hashMethod}: ${hash}`}>
            <Space size={4}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text type="secondary" style={{ fontSize: 11 }}>{record.hashMethod}</Text>
            </Space>
          </Tooltip>
        ) : (
          <Tooltip title="ハッシュ値が設定されていません">
            <WarningOutlined style={{ color: '#faad14' }} />
          </Tooltip>
        )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="編集">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Tooltip title="削除">
            <Popconfirm
              title="このInsertionを削除しますか？"
              description="削除後は元に戻せません。"
              onConfirm={() => handleDelete(record.id)}
              okText="削除"
              cancelText="キャンセル"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const errorCount = insertions.filter((i) => i.status === 'error').length;
  const warningCount = insertions.filter((i) => i.status === 'warning').length;

  return (
    <>
    <Modal
      title={
        <Space>
          <LinkOutlined style={{ color: '#1677ff' }} />
          <Text strong>Insertion 管理</Text>
          <Tag>{insertions.length} 件</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1200}
      styles={{ body: { padding: 0 } }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {errorCount > 0 && (
              <Text type="danger" style={{ fontSize: 12 }}>
                <CloseCircleOutlined /> {errorCount}件のエラーがあります
              </Text>
            )}
            {warningCount > 0 && (
              <Text style={{ color: '#faad14', fontSize: 12 }}>
                <WarningOutlined /> {warningCount}件の警告があります
              </Text>
            )}
          </Space>
          <Space>
            <Button onClick={onClose}>閉じる</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAddNew}
            >
              Insertion を追加
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
    >
      {/* 左右分割レイアウト */}
      <div style={{ display: 'flex', height: 520, overflow: 'hidden' }}>

        {/* 左ペイン: MaiML構造ツリー */}
        <MaimlStructureTreePanel
          open={true}
          onClose={() => {/* モーダル内では閉じない */}}
          documentData={documentData}
          methods={methods}
          activeMethodIndex={activeMethodIndex}
          onEditDocument={onEditDocument ?? (() => {})}
          onMethodChange={onMethodChange ?? (() => {})}
          onViewTemplates={onViewTemplates ?? (() => {})}
        />

        {/* 右ペイン: Insertion一覧 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 8px 16px' }}>
          {/* 整合性サマリー */}
          <VerificationSummary
            insertions={insertions}
            onVerifyAll={onVerifyAll}
            isVerifying={isVerifying}
          />

          {/* エラー・警告のアラート */}
          {errorCount > 0 && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message={`${errorCount}件のInsertionでエラーが検出されました`}
              description="URIが示すファイルが存在しないか、ハッシュ値が一致しません。内容を確認してください。"
            />
          )}
          {warningCount > 0 && !errorCount && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={`${warningCount}件のInsertionで警告があります`}
              description="ファイルが変更されている可能性があります。ハッシュ値を再計算してください。"
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={onVerifyAll}>
                  再検証
                </Button>
              }
            />
          )}

          {/* 表示切替 & 一括展開/折り畳み */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Segmented
              size="small"
              value={viewMode}
              onChange={(v) => {
                setViewMode(v as 'table' | 'compact');
                setExpandedIds(new Set());
              }}
              options={[
                {
                  label: (
                    <Space size={4}>
                      <TableOutlined />
                      テーブル
                    </Space>
                  ),
                  value: 'table',
                },
                {
                  label: (
                    <Space size={4}>
                      <UnorderedListOutlined />
                      縮約
                    </Space>
                  ),
                  value: 'compact',
                },
              ]}
            />
            {viewMode === 'compact' && insertions.length > 0 && (
              <Space size={4}>
                <Tooltip title="すべて展開">
                  <Button
                    type="text"
                    size="small"
                    icon={<ExpandAltOutlined />}
                    onClick={handleExpandAll}
                  >
                    すべて展開
                  </Button>
                </Tooltip>
                <Tooltip title="すべて折り畳む">
                  <Button
                    type="text"
                    size="small"
                    icon={<CompressOutlined />}
                    onClick={handleCollapseAll}
                  >
                    すべて折り畳む
                  </Button>
                </Tooltip>
              </Space>
            )}
          </div>

          {/* Insertion一覧 */}
          {insertions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              <LinkOutlined style={{ fontSize: 32, marginBottom: 12 }} />
              <div>Insertionがまだ登録されていません</div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ marginTop: 16 }}
                onClick={onAddNew}
              >
                最初のInsertionを追加
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            <>
              <Table<InsertionItem>
                columns={columns}
                dataSource={insertions}
                rowKey="id"
                size="small"
                pagination={insertions.length > 10 ? { pageSize: 10, size: 'small' } : false}
                rowSelection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }}
                rowClassName={(record) =>
                  record.status === 'error'
                    ? 'ant-table-row-error'
                    : record.status === 'warning'
                      ? 'ant-table-row-warning'
                      : ''
                }
                style={{
                  '--error-row-bg': '#fff2f0',
                  '--warning-row-bg': '#fffbe6',
                } as React.CSSProperties}
              />
              <style>{`
                .ant-table-row-error > td { background-color: #fff2f0 !important; }
                .ant-table-row-warning > td { background-color: #fffbe6 !important; }
              `}</style>
            </>
          ) : (
            /* 縮約表示 */
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {insertions.map((item) => (
                <InsertionCompactRow
                  key={item.id}
                  item={item}
                  isExpanded={expandedIds.has(item.id)}
                  onToggle={() => handleToggleExpand(item.id)}
                  onEdit={() => onEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                  onRevalidate={() => {
                    setIsVerifying(true);
                    setTimeout(() => setIsVerifying(false), 1200);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>

    {/* Insertion追加ウィザード */}
    <InsertionWizardModal
      open={wizardOpen}
      onClose={() => setWizardOpen(false)}
      onAdd={(item) => {
        setInsertions((prev) => [...prev, item]);
        setWizardOpen(false);
      }}
    />

    {/* Insertion編集モーダル */}
    <InsertionEditModal
      open={editTarget !== null}
      insertion={editTarget}
      onClose={() => setEditTarget(null)}
      onSave={(updated) => {
        setInsertions((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i))
        );
        setEditTarget(null);
        message.success('Insertionを更新しました');
      }}
    />
    </>
  );
};

export default InsertionListPanel;
