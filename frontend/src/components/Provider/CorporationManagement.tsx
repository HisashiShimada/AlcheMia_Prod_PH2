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
  const [corporations, setCorporations] = useState<CorporationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCorporation, setEditingCorporation] = useState<CorporationData | null>(null);
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
        messageApi.error('データ形式が不正です');
        setCorporations([]);
      }
    } catch (error) {
      console.error('Corporation取得エラー:', error);
      messageApi.error('会社データの取得に失敗しました');
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
            <span>会社名</span>
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
      title: <div style={{ textAlign: 'center' }}>更新日時</div>,
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
          >
            編集
          </Button>
          <Button
            onClick={() => handleToggleActive(record)}
            danger={record.isActive}
            style={{ width: '100px' }}
          >
            {record.isActive ? '非アクティブ' : 'アクティブ'}
          </Button>
        </Space>
      ),
    },
  ];

  // 会社追加
  const handleAdd = () => {
    setEditingCorporation(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
    });
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
      messageApi.warning('アクティブにする会社を選択してください');
      return;
    }
    
    modal.confirm({
      title: '選択した会社をアクティブにしますか？',
      content: `${selectedRowKeys.length}件の会社がアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
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
          
          messageApi.success(`${selectedRowKeys.length}件の会社をアクティブにしました`);
          setSelectedRowKeys([]);
          await fetchCorporations();
        } catch (error) {
          console.error('アクティブ化エラー:', error);
          messageApi.error('アクティブ化に失敗しました');
        }
      },
    });
  };

  // 非アクティブ化（一括）
  const handleDeactivate = async () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('非アクティブにする会社を選択してください');
      return;
    }
    
    modal.confirm({
      title: '選択した会社を非アクティブにしますか？',
      content: `${selectedRowKeys.length}件の会社が非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
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
          
          messageApi.success(`${selectedRowKeys.length}件の会社を非アクティブにしました`);
          setSelectedRowKeys([]);
          await fetchCorporations();
        } catch (error) {
          console.error('非アクティブ化エラー:', error);
          messageApi.error('非アクティブ化に失敗しました');
        }
      },
    });
  };

  // アクティブ/非アクティブ切り替え（個別）
  const handleToggleActive = async (corporation: CorporationData) => {
    const actionText = corporation.isActive ? '非アクティブ' : 'アクティブ';
    const corporationName = corporation.corporationName;

    modal.confirm({
      title: `${corporationName}を${actionText}にしますか？`,
      content: `この会社を${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: corporation.isActive ? { danger: true } : undefined,
      onOk: async () => {
        try {
          const client = createApiClient();
          await client.patch(
            `/provider/corporation/${corporation.corporationId}/status`,
            { isActive: !corporation.isActive }
          );
          
          messageApi.success(`${corporationName}を${actionText}にしました`);
          await fetchCorporations();
        } catch (error) {
          console.error('ステータス変更エラー:', error);
          messageApi.error(`ステータスの変更に失敗しました`);
        }
      },
    });
  };

  // リロード
  const handleReload = async () => {
    setSearchText('');
    setSelectedRowKeys([]);
    await fetchCorporations();
    messageApi.success('データをリロードしました');
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
      
      messageApi.success('CSVファイルをダウンロードしました');
    } catch (error) {
      console.error('CSV download error:', error);
      messageApi.error('CSVダウンロードに失敗しました');
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
          const errorMessage = result.errors[0].message;
          console.error('CSV validation error:', errorMessage);
          messageApi.error(errorMessage);
          return;
        }
        
        // 成功時はログ出力のみ
        console.log(`CSV upload successful: ${result.successCount} records created`);
        messageApi.success('CSVファイルをアップロードしました');
      }
      
      await fetchCorporations();
    } catch (error) {
      // すでにErrorオブジェクトの場合はそのまま再スロー（バリデーションエラー）
      if (error instanceof Error && !('isAxiosError' in error)) {
        messageApi.error(error.message);
        return;
      }
      
      // HTTPエラーの場合
      console.error('CSV upload error:', error);
      messageApi.error('CSVアップロードに失敗しました');
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
        messageApi.success('会社情報を更新しました');
      } else {
        // 新規作成
        await client.post(
          '/provider/corporation',
          values
        );
        messageApi.success('会社を追加しました');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      await fetchCorporations();
    } catch (error: any) {
      console.error('保存エラー:', error);
      if (error.response?.data?.error) {
        messageApi.error(error.response.data.error);
      } else {
        messageApi.error('保存に失敗しました');
      }
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
          <Button icon={<UploadOutlined />} onClick={() => document.getElementById('csv-upload')?.click()}>
            CSV<br />アップロード
          </Button>
        </label>
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          CSV<br />ダウンロード
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAdd}>
          追加
        </Button>
        <Button
          onClick={handleActivate}
          disabled={selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            borderColor: selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            color: selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          アクティブ
        </Button>
        <Button
          danger
          onClick={handleDeactivate}
          disabled={selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            borderColor: selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            color: selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          非アクティブ
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReload}>
          リロード
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
              placeholder="会社名、更新日時で検索"
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
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `全 ${total} 件`,
          }}
          rowClassName={(record) => (!record.isActive ? 'inactive-row' : '')}
        />
      </div>

      <Modal
        title={editingCorporation ? '会社編集' : '会社追加'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="保存"
        cancelText="キャンセル"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="corporationName"
            label="会社名"
            rules={[{ required: true, message: '会社名を入力してください' }]}
          >
            <Input placeholder="株式会社サンプル" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="状態"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: true, label: 'アクティブ' },
                { value: false, label: '非アクティブ' },
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