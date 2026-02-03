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
  message,
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
  const { modal } = App.useApp();
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
        message.error('データ形式が不正です');
        setCorporations([]);
      }
    } catch (error) {
      console.error('Corporation取得エラー:', error);
      message.error('会社データの取得に失敗しました');
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
      message.warning('アクティブにする会社を選択してください');
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
          
          message.success(`${selectedRowKeys.length}件の会社をアクティブにしました`);
          setSelectedRowKeys([]);
          await fetchCorporations();
        } catch (error) {
          console.error('アクティブ化エラー:', error);
          message.error('アクティブ化に失敗しました');
        }
      },
    });
  };

  // 非アクティブ化（一括）
  const handleDeactivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非アクティブにする会社を選択してください');
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
          
          message.success(`${selectedRowKeys.length}件の会社を非アクティブにしました`);
          setSelectedRowKeys([]);
          await fetchCorporations();
        } catch (error) {
          console.error('非アクティブ化エラー:', error);
          message.error('非アクティブ化に失敗しました');
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
          
          message.success(`${corporationName}を${actionText}にしました`);
          await fetchCorporations();
        } catch (error) {
          console.error('ステータス変更エラー:', error);
          message.error(`ステータスの変更に失敗しました`);
        }
      },
    });
  };

  // リロード
  const handleReload = async () => {
    setSearchText('');
    setSelectedRowKeys([]);
    await fetchCorporations();
    message.success('データをリロードしました');
  };

  // CSVダウンロード
  const handleDownload = () => {
    const headers = [
      '会社名',
      '更新日時',
      '状態',
    ];

    const rows = filteredCorporations.map((corporation) => [
      corporation.corporationName,
      formatDateTime(corporation.updatedAt),
      corporation.isActive ? 'アクティブ' : '非アクティブ',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);
    link.href = url;
    link.download = `corporations_${timestamp}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('CSVファイルをダウンロードしました');
  };

  // CSVアップロード
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);

    const client = createApiClient();
    client
      .post('/provider/corporation/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response: any) => {
        const result = response.data.data;
        message.success(
          `CSVアップロードが完了しました。成功: ${result.successCount}件, 失敗: ${result.failureCount}件`
        );

        if (result.errors && result.errors.length > 0) {
          console.error('CSV Upload Errors:', result.errors);
          Modal.warning({
            title: 'アップロードエラー',
            content: (
              <div>
                <p>以下の行でエラーが発生しました:</p>
                <ul>
                  {result.errors.slice(0, 5).map((err: any, idx: number) => (
                    <li key={idx}>
                      行{err.row}: {err.message}
                    </li>
                  ))}
                </ul>
                {result.errors.length > 5 && <p>...他 {result.errors.length - 5} 件</p>}
              </div>
            ),
          });
        }

        fetchCorporations();
      })
      .catch((error) => {
        console.error('CSVアップロードエラー:', error);
        message.error('CSVアップロードに失敗しました');
      })
      .finally(() => {
        setLoading(false);
        // input要素をリセット（同じファイルを再度選択できるように）
        event.target.value = '';
      });
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
        message.success('会社情報を更新しました');
      } else {
        // 新規作成
        await client.post(
          '/provider/corporation',
          values
        );
        message.success('会社を追加しました');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      await fetchCorporations();
    } catch (error: any) {
      console.error('保存エラー:', error);
      if (error.response?.data?.error) {
        message.error(error.response.data.error);
      } else {
        message.error('保存に失敗しました');
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