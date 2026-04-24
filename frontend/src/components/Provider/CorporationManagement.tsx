'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Select,
  Typography,
  Row,
  Col,
  Badge,
  App,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { createApiClient } from '@/utils/authUtils';
import { formatDateTime } from '@/utils/dateFormatter';
import { getMenuPermission } from '@/utils/menuPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage } from '@/utils/errorUtils';

const { Text } = Typography;

/**
 * 会社データの型定義（DB連携版）
 */
interface CorporationData {
  corporationId: string; // UUID
  corporationName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 会社管理画面コンポーネント（DB連携版）
 */
export default function CorporationManagement() {
  const { modal, message: messageApi } = App.useApp();
  const { t } = useLanguage();

  // 権限制御: provider メニュー（機能CD: 010000）の permission が 0 の場合は読取専用
  const isReadOnly = getMenuPermission('provider') === 0;

  const [corporations, setCorporations] = useState<CorporationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCorporation, setEditingCorporation] = useState<CorporationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [form] = Form.useForm();

  // 初回データ取得
  useEffect(() => {
    fetchCorporations();
  }, []);

  // 会社データ取得
  const fetchCorporations = async () => {
    setLoading(true);
    try {
      const client = createApiClient();
      const response = await client.get('/provider/corporation');
      console.log('Corporation API Response:', response.data);
      
      // 統一APIレスポンス形式 { success, data, meta } に対応
      if (response.data.success && Array.isArray(response.data.data)) {
        setCorporations(response.data.data);
      } else {
        console.error('Unexpected response format:', response.data);
        messageApi.error(t('corporationManagement.messages.invalidDataFormat'));
        setCorporations([]);
      }
    } catch (error) {
      console.error('Corporation取得エラー:', error);
      messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.fetchError')));
      setCorporations([]); // エラー時は空配列を設定
    } finally {
      setLoading(false);
    }
  };

  // フィルタリングされた会社
  const filteredCorporations = useMemo(() => {
    return corporations.filter(corporation => {
      // テキスト検索フィルター
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || (
        corporation.corporationName.toLowerCase().includes(searchLower) ||
        formatDateTime(corporation.updatedAt).toLowerCase().includes(searchLower)
      );

      return matchesSearch;
    });
  }, [corporations, searchText]);

  // フィルタ変化時に1ページ目にリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  // アクティブな会社数をカウント
  const activeCorporationCount = useMemo(() => {
    return filteredCorporations.filter(corp => corp.isActive).length;
  }, [filteredCorporations]);

  // テーブルの行選択
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // テーブルカラム定義
  const columns: ColumnsType<CorporationData> = [
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <Space size="middle" align="center">
            <span>{t('corporationManagement.columns.corporationName')}</span>
            <Badge
              count={activeCorporationCount}
              style={{
                backgroundColor: '#4169E1',
                fontSize: 14,
                height: 24,
                minWidth: 40,
                lineHeight: '24px',
                borderRadius: 12,
              }}
            />
          </Space>
        </div>
      ),
      dataIndex: 'corporationName',
      key: 'corporationName',
      width: 300,
      sorter: (a, b) => a.corporationName.localeCompare(b.corporationName),
      render: (text: string) => (
        <Text style={{ fontWeight: 500, color: '#0093CF' }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('corporationManagement.columns.updatedAt')}</div>,
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      align: 'right',
      sorter: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '',
      key: 'action',
      width: 200,
      align: 'right',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={isReadOnly}
          >
            {t('corporationManagement.buttons.edit')}
          </Button>
          <Button
            onClick={() => handleToggleActive(record)}
            danger={record.isActive}
            style={{ width: '100px' }}
            disabled={isReadOnly}
          >
            {record.isActive ? t('corporationManagement.status.inactive') : t('corporationManagement.status.active')}
          </Button>
        </Space>
      ),
    },
  ];

  // 会社追加
  const handleAdd = () => {
    setEditingCorporation(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 会社編集
  const handleEdit = (corporation: CorporationData) => {
    setEditingCorporation(corporation);
    form.setFieldsValue(corporation);
    setIsModalVisible(true);
  };

  // アクティブ化（一括）
  const handleActivate = async () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning(t('corporationManagement.messages.activateSelectRequired'));
      return;
    }
    
    modal.confirm({
      title: t('corporationManagement.messages.activateConfirmTitle'),
      content: t('corporationManagement.messages.activateConfirmContent').replace('{count}', String(selectedRowKeys.length)),
      okText: t('corporationManagement.status.active'),
      cancelText: t('corporationManagement.buttons.cancel'),
      onOk: async () => {
        try {
          const client = createApiClient();
          // 選択された各会社を順次アクティブ化
          for (const key of selectedRowKeys) {
            await client.patch(
              `/provider/corporation/${key}/status`,
              { isActive: true }
            );
          }
          
          messageApi.success(t('corporationManagement.messages.activateSuccess').replace('{count}', String(selectedRowKeys.length)));
          setSelectedRowKeys([]);
          // ローカルステートを直接更新（再フェッチによる表示順変更を防ぐ）
          const now = new Date().toISOString();
          setCorporations(prev =>
            prev.map(corp =>
              selectedRowKeys.includes(corp.corporationId)
                ? { ...corp, isActive: true, updatedAt: now }
                : corp
            )
          );
        } catch (error) {
          console.error('アクティブ化エラー:', error);
          messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.activateError')));
        }
      },
    });
  };

  // 非アクティブ化（一括）
  const handleDeactivate = async () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning(t('corporationManagement.messages.deactivateSelectRequired'));
      return;
    }
    
    modal.confirm({
      title: t('corporationManagement.messages.deactivateConfirmTitle'),
      content: t('corporationManagement.messages.deactivateConfirmContent').replace('{count}', String(selectedRowKeys.length)),
      okText: t('corporationManagement.status.inactive'),
      cancelText: t('corporationManagement.buttons.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const client = createApiClient();
          // 選択された各会社を順次非アクティブ化
          for (const key of selectedRowKeys) {
            await client.patch(
              `/provider/corporation/${key}/status`,
              { isActive: false }
            );
          }
          
          messageApi.success(t('corporationManagement.messages.deactivateSuccess').replace('{count}', String(selectedRowKeys.length)));
          setSelectedRowKeys([]);
          // ローカルステートを直接更新（再フェッチによる表示順変更を防ぐ）
          const now = new Date().toISOString();
          setCorporations(prev =>
            prev.map(corp =>
              selectedRowKeys.includes(corp.corporationId)
                ? { ...corp, isActive: false, updatedAt: now }
                : corp
            )
          );
        } catch (error) {
          console.error('非アクティブ化エラー:', error);
          messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.deactivateError')));
        }
      },
    });
  };

  // アクティブ/非アクティブ切り替え（個別）
  const handleToggleActive = async (corporation: CorporationData) => {
    const actionText = corporation.isActive ? t('corporationManagement.status.inactive') : t('corporationManagement.status.active');
    const corporationName = corporation.corporationName;

    modal.confirm({
      title: t('corporationManagement.messages.toggleConfirmTitle').replace('{name}', corporationName).replace('{action}', actionText),
      content: t('corporationManagement.messages.toggleConfirmContent').replace('{action}', actionText),
      okText: actionText,
      cancelText: t('corporationManagement.buttons.cancel'),
      okButtonProps: corporation.isActive ? { danger: true } : undefined,
      onOk: async () => {
        try {
          const client = createApiClient();
          await client.patch(
            `/provider/corporation/${corporation.corporationId}/status`,
            { isActive: !corporation.isActive }
          );
          
          messageApi.success(t('corporationManagement.messages.toggleSuccess').replace('{name}', corporationName).replace('{action}', actionText));
          // ローカルステートを直接更新（再フェッチによる表示順変更を防ぐ）
          setCorporations(prev =>
            prev.map(corp =>
              corp.corporationId === corporation.corporationId
                ? { ...corp, isActive: !corp.isActive, updatedAt: new Date().toISOString() }
                : corp
            )
          );
        } catch (error) {
          console.error('ステータス変更エラー:', error);
          messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.toggleError')));
        }
      },
    });
  };

  // リロード
  const handleReload = async () => {
    setSearchText('');
    setSelectedRowKeys([]);
    await fetchCorporations();
    messageApi.success(t('corporationManagement.messages.reloadSuccess'));
  };

  // CSVダウンロード
  const handleDownload = async () => {
    try {
      setLoading(true);
      const client = createApiClient();
      
      // クエリパラメータを構築
      const params: Record<string, string> = {};
      if (searchText.trim()) {
        params.search = searchText.trim();
      }
      
      const response = await client.get('/provider/corporation/download-csv', {
        params,
        responseType: 'blob',
      });
      
      // レスポンスをBlobとして取得
      const blob = new Blob([response.data], { type: 'text/csv' });
      
      // Content-Dispositionヘッダーからファイル名を取得
      const contentDisposition = 
        response.headers['content-disposition'] || 
        response.headers['Content-Disposition'];
      
      let filename = 'corporations.csv'; // デフォルト値
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      } else {
        // Content-Dispositionヘッダーがない場合は、フロントエンド側でタイムスタンプを生成
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:]/g, '')
          .replace('T', '')
          .slice(0, 14);
        filename = `corporations_${timestamp}.csv`;
      }
      
      // ダウンロードリンクを作成
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      messageApi.success(t('corporationManagement.messages.csvDownloadSuccess'));
    } catch (error) {
      console.error('CSV download error:', error);
      messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.csvDownloadError')));
    } finally {
      setLoading(false);
    }
  };

  // CSVアップロード
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    handleCSVUpload(file);
    
    // input要素をリセット（同じファイルを再度選択できるように）
    event.target.value = '';
  };

  // CSVファイルをAPIにアップロード
  const handleCSVUpload = async (file: File) => {
    try {
      setLoading(true);
      const client = createApiClient();
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await client.post('/provider/corporation/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // バリデーションエラーのチェック（HTTPステータス200でもエラーの場合がある）
      if (response.data.success && response.data.data) {
        const result = response.data.data;
        
        if (result.failureCount > 0 && result.errors.length > 0) {
          // エラーがある場合はメッセージを表示
          console.error('CSV validation error:', result.errors[0].message);
          messageApi.error(t('corporationManagement.messages.csvUploadError'));
          return;
        }
        
        // 成功時はログ出力のみ
        console.log(`CSV upload successful: ${result.successCount} records created`);
        messageApi.success(t('corporationManagement.messages.csvUploadSuccess'));
      }
      
      await fetchCorporations();
    } catch (error) {
      // すでにErrorオブジェクトの場合はそのまま再スロー（バリデーションエラー）
      if (error instanceof Error && !('isAxiosError' in error)) {
        messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.csvUploadError')));
        return;
      }
      
      // HTTPエラーの場合
      console.error('CSV upload error:', error);
      messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.csvUploadError')));
    } finally {
      setLoading(false);
    }
  };

  // モーダルOK
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const client = createApiClient();
      
      if (editingCorporation) {
        // 更新
        await client.put(
          `/provider/corporation/${editingCorporation.corporationId}`,
          values
        );
        messageApi.success(t('corporationManagement.messages.saveSuccess'));
      } else {
        // 新規作成
        await client.post(
          '/provider/corporation',
          values
        );
        messageApi.success(t('corporationManagement.messages.addSuccess'));
      }
      
      setIsModalVisible(false);
      form.resetFields();
      await fetchCorporations();
    } catch (error) {
      // form.validateFields() によるバリデーションエラーはフォームに表示済みのため何もしない
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('保存エラー:', error);
      messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.saveError')));
    }
  };

  // モーダルキャンセル
  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  return (
    <div style={{ padding: '0 15px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: 16,
        gap: 8,
      }}>
        <label htmlFor="csv-upload">
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <Button
            icon={<UploadOutlined />}
            onClick={() => document.getElementById('csv-upload')?.click()}
            disabled={isReadOnly}
          >
            {t('corporationManagement.buttons.csvUpload')}
          </Button>
        </label>
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          {t('corporationManagement.buttons.csvDownload')}
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={isReadOnly}>
          {t('corporationManagement.buttons.add')}
        </Button>
        <Button
          onClick={handleActivate}
          disabled={isReadOnly || selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            borderColor: !isReadOnly && selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            color: !isReadOnly && selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          {t('corporationManagement.buttons.activate')}
        </Button>
        <Button
          danger
          onClick={handleDeactivate}
          disabled={isReadOnly || selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            borderColor: !isReadOnly && selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            color: !isReadOnly && selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          {t('corporationManagement.buttons.deactivate')}
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReload}>
          {t('corporationManagement.buttons.reload')}
        </Button>
      </div>

      <div
        style={{
          padding: 0,
          backgroundColor: '#fff',
          maxWidth: 3600,
          margin: '0 auto',
        }}
      >
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
              placeholder={t('corporationManagement.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
        </Row>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredCorporations}
          rowKey="corporationId"
          size="small"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
<<<<<<< Updated upstream
<<<<<<< Updated upstream
            pageSizeOptions: ['20', '50', '100'],
          showTotal: (total) => t('corporationManagement.pagination.showTotal').replace('{total}', String(total)),
=======
=======
>>>>>>> Stashed changes
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => t('corporationManagement.pagination.showTotal').replace('{total}', String(total)),
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
            onShowSizeChange: (_, newSize) => { setPageSize(newSize); setCurrentPage(1); },
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
          }}
          rowClassName={(record) => (!record.isActive ? 'inactive-row' : '')}
        />
      </div>

      <Modal
        title={editingCorporation ? t('corporationManagement.modal.editTitle') : t('corporationManagement.modal.addTitle')}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={t('corporationManagement.buttons.save')}
        cancelText={t('corporationManagement.buttons.cancel')}
      >
        <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
          <Form.Item
            name="corporationName"
            label={t('corporationManagement.form.corporationName')}
            rules={[
              { required: true, message: t('corporationManagement.form.corporationNameRequired') },
              { max: 50, message: t('corporationManagement.form.corporationNameMaxLength') },
            ]}
          >
            <Input placeholder={t('corporationManagement.form.corporationNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="isActive"
            label={t('corporationManagement.form.status')}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: true, label: t('corporationManagement.status.active') },
                { value: false, label: t('corporationManagement.status.inactive') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style jsx global>{`
        .inactive-row td {
          background-color: #d3d3d3 !important;
        }
        .inactive-row:hover td {
          background-color: #c0c0c0 !important;
        }
      `}</style>
    </div>
  );
}