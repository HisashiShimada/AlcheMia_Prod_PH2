'use client';

import React, { useState, useMemo } from 'react';
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
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Papa from 'papaparse';
import masterData from '../data/master-management.json';

const { Text } = Typography;

/**
 * マスタデータの型定義
 */
interface MasterData {
  id: string;
  instrumentId: string;
  instrumentName: string;
  vendorId: string;
  typeId: string;
  attributeId: string;
  updatedAt: string;
  isActive: boolean;
}

/**
 * マスタ管理画面（モック）
 */
export default function MasterManagementMock() {
  const [masters, setMasters] = useState<MasterData[]>(masterData as MasterData[]);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterData | null>(null);
  const [selectedMasterType, setSelectedMasterType] = useState<string>('instrument');
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>('id');
  const [form] = Form.useForm();

  // マスタ種別の選択肢
  const masterTypes = [
    { value: 'instrument', label: 'インストルメント' },
    { value: 'vendor', label: 'ベンダー' },
    { value: 'type', label: 'タイプ' },
    { value: 'attribute', label: '属性' },
  ];

  // フィルター項目の選択肢
  const filterOptions = [
    { value: 'id', label: 'ID' },
    { value: 'instrumentId', label: '実験装置ID' },
    { value: 'instrumentName', label: '実験装置名' },
    { value: 'vendorId', label: '実験装置ベンダーID' },
    { value: 'typeId', label: '実験装置タイプID' },
    { value: 'attributeId', label: '属性ID' },
    { value: 'updatedAt', label: '更新日時' },
  ];

  // フィルタリングされたデータ
  const filteredMasters = useMemo(() => {
    return masters.filter(master => {
      const searchLower = searchText.toLowerCase();
      
      switch (selectedFilterKey) {
        case 'id':
          return master.id.toLowerCase().includes(searchLower);
        case 'instrumentId':
          return master.instrumentId.toLowerCase().includes(searchLower);
        case 'instrumentName':
          return master.instrumentName.toLowerCase().includes(searchLower);
        case 'vendorId':
          return master.vendorId.toLowerCase().includes(searchLower);
        case 'typeId':
          return master.typeId.toLowerCase().includes(searchLower);
        case 'attributeId':
          return master.attributeId.toLowerCase().includes(searchLower);
        case 'updatedAt':
          return master.updatedAt.toLowerCase().includes(searchLower);
        default:
          return (
            master.id.toLowerCase().includes(searchLower) ||
            master.instrumentId.toLowerCase().includes(searchLower) ||
            master.instrumentName.toLowerCase().includes(searchLower) ||
            master.vendorId.toLowerCase().includes(searchLower) ||
            master.typeId.toLowerCase().includes(searchLower) ||
            master.attributeId.toLowerCase().includes(searchLower) ||
            master.updatedAt.toLowerCase().includes(searchLower)
          );
      }
    });
  }, [masters, searchText, selectedFilterKey]);

  // テーブルの行選択
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // テーブルカラム定義
  const columns: ColumnsType<MasterData> = [
    {
      title: () => (
        <Space>
          <span>ID</span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      ),
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center',
      sorter: (a, b) => parseInt(a.id) - parseInt(b.id),
    },
    {
      title: () => (
        <Space>
          <span>実験装置ID</span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      ),
      dataIndex: 'instrumentId',
      key: 'instrumentId',
      width: 140,
      align: 'center',
      sorter: (a, b) => a.instrumentId.localeCompare(b.instrumentId),
    },
    {
      title: () => (
        <Space>
          <span>実験装置名</span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      ),
      dataIndex: 'instrumentName',
      key: 'instrumentName',
      width: 180,
      align: 'center',
      sorter: (a, b) => a.instrumentName.localeCompare(b.instrumentName),
    },
    {
      title: () => (
        <Space>
          <span>実験装置ベンダーID</span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      ),
      dataIndex: 'vendorId',
      key: 'vendorId',
      width: 180,
      align: 'center',
      sorter: (a, b) => a.vendorId.localeCompare(b.vendorId),
    },
    {
      title: () => (
        <Space>
          <span>実験装置タイプID</span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      ),
      dataIndex: 'typeId',
      key: 'typeId',
      width: 170,
      align: 'center',
      sorter: (a, b) => a.typeId.localeCompare(b.typeId),
    },
    {
      title: () => (
        <Space>
          <span>属性ID</span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      ),
      dataIndex: 'attributeId',
      key: 'attributeId',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.attributeId.localeCompare(b.attributeId),
    },
    {
      title: () => (
        <Space>
          <span>更新日時</span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      ),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      align: 'center',
      sorter: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    },
    {
      title: '',
      key: 'action',
      width: 200,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{
              borderColor: '#000',
              color: '#000',
            }}
          >
            編集
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleActive(record.id)}
            style={{
              backgroundColor: record.isActive ? '#fff' : '#CF0027',
              borderColor: record.isActive ? '#000' : '#CF0027',
              color: record.isActive ? '#000' : '#fff',
            }}
          >
            {record.isActive ? '活性' : '非活性'}
          </Button>
        </Space>
      ),
    },
  ];

  // マスタ追加
  const handleAdd = () => {
    setEditingMaster(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: false,
    });
    setIsModalVisible(true);
  };

  // マスタ編集
  const handleEdit = (master: MasterData) => {
    setEditingMaster(master);
    form.setFieldsValue(master);
    setIsModalVisible(true);
  };

  // マスタ削除
  const handleDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('削除するマスタを選択してください');
      return;
    }
    Modal.confirm({
      title: '選択したマスタを削除しますか？',
      content: `${selectedRowKeys.length}件のマスタが削除されます。この操作は取り消せません。`,
      okText: '削除',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        setMasters(masters.filter(m => !selectedRowKeys.includes(m.id)));
        setSelectedRowKeys([]);
        message.success('マスタを削除しました');
      },
    });
  };

  // 活性/非活性切り替え
  const handleToggleActive = (id: string) => {
    setMasters(masters.map(m => 
      m.id === id ? { ...m, isActive: !m.isActive } : m
    ));
    const master = masters.find(m => m.id === id);
    message.success(`${master?.instrumentName}を${master?.isActive ? '非活性' : '活性'}にしました`);
  };

  // リロード
  const handleReload = () => {
    setMasters(masterData as MasterData[]);
    setSearchText('');
    setSelectedRowKeys([]);
    message.success('データをリロードしました');
  };

  // CSVアップロード
  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        handleCSVUpload(file);
      }
    };
    input.click();
  };

  // CSVファイルをパースして一覧に反映
  const handleCSVUpload = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        try {
          const newMasters: MasterData[] = [];
          const errors: string[] = [];
          const existingIds = new Set(masters.map(m => m.instrumentId.toLowerCase()));

          results.data.forEach((row: Record<string, string>, index: number) => {
            const rowNumber = index + 2;

            // 必須フィールドのチェック
            if (!row['実験装置ID'] || !row['実験装置名']) {
              errors.push(`${rowNumber}行目: 実験装置ID、実験装置名は必須です`);
              return;
            }

            // IDの重複チェック
            const instrumentId = row['実験装置ID'].trim().toLowerCase();
            if (existingIds.has(instrumentId)) {
              errors.push(`${rowNumber}行目: 実験装置ID「${row['実験装置ID']}」は既に登録されています`);
              return;
            }

            const isActiveValue = row['状態'] || '非活性';
            const isActive = isActiveValue === '活性' || isActiveValue === 'true' || isActiveValue === '1';

            const newMaster: MasterData = {
              id: String(masters.length + newMasters.length + 1),
              instrumentId: row['実験装置ID'].trim(),
              instrumentName: row['実験装置名'].trim(),
              vendorId: row['実験装置ベンダーID']?.trim() || '',
              typeId: row['実験装置タイプID']?.trim() || '',
              attributeId: row['属性ID']?.trim() || '',
              updatedAt: row['更新日時'] || new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12) + '00',
              isActive: isActive,
            };

            newMasters.push(newMaster);
            existingIds.add(instrumentId);
          });

          if (errors.length > 0) {
            Modal.error({
              title: 'CSVファイルにエラーがあります',
              content: (
                <div>
                  <p>以下のエラーを修正してください：</p>
                  <ul style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {errors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length > 10 && <li>...他 {errors.length - 10} 件のエラー</li>}
                  </ul>
                </div>
              ),
              width: 600,
            });

            if (newMasters.length > 0) {
              Modal.confirm({
                title: '一部のデータを追加しますか？',
                content: `${newMasters.length}件の有効なマスタデータが見つかりました。これらを追加しますか？`,
                okText: '追加',
                cancelText: 'キャンセル',
                onOk: () => {
                  setMasters([...masters, ...newMasters]);
                  message.success(`${newMasters.length}件のマスタを追加しました`);
                },
              });
            }
            return;
          }

          if (newMasters.length > 0) {
            setMasters([...masters, ...newMasters]);
            message.success(`${newMasters.length}件のマスタを追加しました`);
          } else {
            message.warning('追加するマスタデータがありませんでした');
          }
        } catch (error) {
          console.error('CSV処理エラー:', error);
          message.error('CSVファイルの処理中にエラーが発生しました');
        }
      },
      error: (error: Error) => {
        console.error('CSVパースエラー:', error);
        message.error('CSVファイルの読み込みに失敗しました');
      },
    });
  };

  // CSVダウンロード
  const handleDownload = () => {
    const headers = [
      '実験装置ID',
      '実験装置名',
      '実験装置ベンダーID',
      '実験装置タイプID',
      '属性ID',
      '更新日時',
      '状態',
    ];

    const rows = filteredMasters.map((master) => [
      master.instrumentId,
      master.instrumentName,
      master.vendorId,
      master.typeId,
      master.attributeId,
      master.updatedAt,
      master.isActive ? '活性' : '非活性',
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
    link.download = `instrument_master_${timestamp}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('CSVファイルをダウンロードしました');
  };

  // モーダルOK
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingMaster) {
        setMasters(masters.map(m => 
          m.id === editingMaster.id 
            ? { 
                ...m, 
                ...values,
                updatedAt: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12) + '00',
              } 
            : m
        ));
        message.success('マスタ情報を更新しました');
      } else {
        const newMaster: MasterData = {
          ...values,
          id: String(masters.length + 1),
          updatedAt: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12) + '00',
        };
        setMasters([...masters, newMaster]);
        message.success('マスタを追加しました');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('バリデーションエラー:', error);
    }
  };

  // モーダルキャンセル
  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 検索実行
  const handleSearch = () => {
    // 検索は filteredMasters で自動的に実行されるため、
    // ここでは特に処理不要（ユーザーフィードバックのみ）
    message.info(`${filteredMasters.length}件のマスタが見つかりました`);
  };

  return (
    <div style={{ padding: 0 }}>
      {/* マスタ選択と操作ボタン */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 16,
      }}>
        {/* 左側：マスタ選択 */}
        <Space size="middle" align="center">
          <Text strong style={{ fontSize: 16 }}>マスタ選択：</Text>
          <Select
            style={{ width: 300 }}
            value={selectedMasterType}
            onChange={setSelectedMasterType}
            options={masterTypes}
            suffixIcon={<DownOutlined style={{ color: '#0093CF', fontSize: 20 }} />}
          />
        </Space>

        {/* 右側：操作ボタン */}
        <Space size="small">
          <Button
            icon={<UploadOutlined />}
            onClick={handleUpload}
          >
            CSV
            <br />
            アップロード
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownload}
          >
            CSV
            <br />
            ダウンロード
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            追加
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            disabled={selectedRowKeys.length === 0}
            style={{
              backgroundColor: selectedRowKeys.length > 0 ? '#FFA500' : undefined,
              borderColor: selectedRowKeys.length > 0 ? '#FFA500' : undefined,
              color: selectedRowKeys.length > 0 ? '#fff' : undefined,
            }}
          >
            削除
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReload}
          >
            リロード
          </Button>
        </Space>
      </div>

      {/* マスタ一覧セクション */}
      <div
        style={{
          border: '2px solid #000',
          borderRadius: 8,
          padding: 24,
          backgroundColor: '#fff',
        }}
      >
        {/* ヘッダー行 */}
        <Row gutter={16} align="middle" style={{ marginBottom: 24 }}>
          <Col flex="none">
            <Text strong style={{ fontSize: 18 }}>インストルメントマスタ一覧</Text>
          </Col>
          <Col flex="auto">
            <Row gutter={16} justify="end">
              <Col flex="none" style={{ width: 150 }}>
                <Select
                  style={{ width: '100%' }}
                  value={selectedFilterKey}
                  onChange={setSelectedFilterKey}
                  options={filterOptions}
                  suffixIcon={<DownOutlined style={{ color: '#0093CF' }} />}
                />
              </Col>
              <Col flex="auto" style={{ maxWidth: 400 }}>
                <Input
                  placeholder="曖昧検索可"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onPressEnter={handleSearch}
                  allowClear
                />
              </Col>
              <Col flex="none" style={{ width: 100 }}>
                <Button
                  icon={<SearchOutlined />}
                  style={{ width: '100%' }}
                  onClick={handleSearch}
                >
                  検索
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* マスタテーブル */}
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredMasters}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件`,
          }}
          rowClassName={(record) => (record.isActive ? 'active-row' : 'inactive-row')}
        />
      </div>

      {/* マスタ追加/編集モーダル */}
      <Modal
        title={editingMaster ? 'マスタ編集' : 'マスタ追加'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="保存"
        cancelText="キャンセル"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="instrumentId"
            label="実験装置ID"
            rules={[{ required: true, message: '実験装置IDを入力してください' }]}
          >
            <Input placeholder="AAA112" />
          </Form.Item>

          <Form.Item
            name="instrumentName"
            label="実験装置名"
            rules={[{ required: true, message: '実験装置名を入力してください' }]}
          >
            <Input placeholder="Aタ光管" />
          </Form.Item>

          <Form.Item
            name="vendorId"
            label="実験装置ベンダーID"
          >
            <Input placeholder="COS12345" />
          </Form.Item>

          <Form.Item
            name="typeId"
            label="実験装置タイプID"
          >
            <Input placeholder="K001" />
          </Form.Item>

          <Form.Item
            name="attributeId"
            label="属性ID"
          >
            <Input placeholder="A01" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="状態"
          >
            <Select
              options={[
                { value: false, label: '非活性' },
                { value: true, label: '活性' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style jsx global>{`
        .active-row {
          background-color: #d3d3d3 !important;
        }
        .active-row:hover td {
          background-color: #c0c0c0 !important;
        }
        .inactive-row {
          background-color: #fff !important;
        }
        .inactive-row:hover td {
          background-color: #f5f5f5 !important;
        }
      `}</style>
    </div>
  );
}
