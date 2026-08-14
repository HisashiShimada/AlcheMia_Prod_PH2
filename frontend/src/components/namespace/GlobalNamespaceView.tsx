'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Table, message, Modal, Spin, Typography, Tooltip } from 'antd';
import { UploadOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getGlobalDeclarations,
  importGlobalDeclarations,
  exportGlobalDeclarations,
} from '@/services/namespaceApiService';
import type { GlobalNamespaceEntry, GlobalNamespaceViewProps } from '@/types/namespace';

const { Text, Title } = Typography;

/**
 * グローバル名前空間宣言一覧コンポーネント
 *
 * ファイルサーバ（system/namespaces/global-declarations.csv）に保存された
 * グローバル名前空間（prefix + URI）の一覧表示・インポート・エクスポートを提供する。
 */
const GlobalNamespaceView: React.FC<GlobalNamespaceViewProps> = ({ viewOnly = false }) => {
  const { t } = useLanguage();
  const [declarations, setDeclarations] = useState<GlobalNamespaceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── 一覧取得
  const fetchDeclarations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGlobalDeclarations();
      setDeclarations(data);
    } catch {
      message.error(t('globalNamespace.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDeclarations();
  }, [fetchDeclarations]);

  // ── インポートファイル選択後の処理
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // input をリセット（同じファイルを再選択できるよう）
    if (csvInputRef.current) csvInputRef.current.value = '';
    if (!file) return;

    Modal.confirm({
      title: t('globalNamespace.importConfirmTitle'),
      content: t('globalNamespace.importConfirmContent'),
      okText: t('globalNamespace.importConfirmOk'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        setImporting(true);
        try {
          await importGlobalDeclarations(file);
          message.success(t('globalNamespace.importSuccess'));
          await fetchDeclarations();
        } catch {
          message.error(t('globalNamespace.importError'));
        } finally {
          setImporting(false);
        }
      },
    });
  };

  // ── エクスポート
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportGlobalDeclarations();
      message.success(t('globalNamespace.exportSuccess'));
    } catch {
      message.error(t('globalNamespace.exportError'));
    } finally {
      setExporting(false);
    }
  };

  // ── テーブルカラム定義
  const columns: TableColumnsType<GlobalNamespaceEntry> = [
    {
      title: 'Prefix',
      dataIndex: 'prefix',
      key: 'prefix',
      width: 200,
      sorter: (a, b) => a.prefix.localeCompare(b.prefix),
      defaultSortOrder: 'ascend',
      render: (prefix: string) => (
        <Text code style={{ fontWeight: 600 }}>{prefix}</Text>
      ),
    },
    {
      title: 'URI',
      dataIndex: 'uri',
      key: 'uri',
      sorter: (a, b) => a.uri.localeCompare(b.uri),
      render: (uri: string) => (
        <Tooltip title={uri}>
          <Text
            copyable={{ text: uri }}
            style={{ maxWidth: 600, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {uri}
          </Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {t('globalNamespace.title')}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('globalNamespace.description')}
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDeclarations}
            loading={loading}
          >
            {t('common.reload')}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={viewOnly}
          >
            {t('globalNamespace.exportButton')}
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={importing}
            disabled={viewOnly}
            onClick={() => !viewOnly && csvInputRef.current?.click()}
          >
            {t('globalNamespace.importButton')}
          </Button>
          {/* hidden file input */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* 件数表示 */}
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('globalNamespace.count', { count: String(declarations.length) })}
        </Text>
      </div>

      {/* テーブル */}
      <Spin spinning={loading}>
        <Table<GlobalNamespaceEntry>
          dataSource={declarations}
          columns={columns}
          rowKey="prefix"
          size="small"
          pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
          locale={{ emptyText: t('globalNamespace.empty') }}
        />
      </Spin>
    </div>
  );
};

export default GlobalNamespaceView;
