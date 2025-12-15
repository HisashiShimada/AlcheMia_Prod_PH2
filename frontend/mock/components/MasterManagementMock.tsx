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
  Badge,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
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
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>('');
  const [form] = Form.useForm();

  // マスタ種別の選択肢
  const masterTypes = [
    { value: 'instrument', label: 'インストルメント' },
    { value: 'vendor', label: 'ベンダー' },
    { value: 'type', label: 'タイプ' },
    { value: 'attribute', label: '属性' },
  ];

  // 実験装置IDの選択肢を動的に取得
  const instrumentIds = useMemo(() => {
    const uniqueIds = Array.from(new Set(masters.map(m => m.instrumentId).filter(id => id)));
    return uniqueIds.sort();
  }, [masters]);

  // ベンダーIDの選択肢を動的に取得
  const vendorIds = useMemo(() => {
    const uniqueIds = Array.from(new Set(masters.map(m => m.vendorId).filter(id => id)));
    return uniqueIds.sort();
  }, [masters]);

  // タイプIDの選択肢を動的に取得
  const typeIds = useMemo(() => {
    const uniqueIds = Array.from(new Set(masters.map(m => m.typeId).filter(id => id)));
    return uniqueIds.sort();
  }, [masters]);

  // 属性IDの選択肢を動的に取得
  const attributeIds = useMemo(() => {
    const uniqueIds = Array.from(new Set(masters.map(m => m.attributeId).filter(id => id)));
    return uniqueIds.sort();
  }, [masters]);

  // フィルタリングされたデータ
  const filteredMasters = useMemo(() => {
    return masters.filter(master => {
      // テキスト検索フィルター
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || (
        master.instrumentId.toLowerCase().includes(searchLower) ||
        master.instrumentName.toLowerCase().includes(searchLower) ||
        master.vendorId.toLowerCase().includes(searchLower) ||
        master.typeId.toLowerCase().includes(searchLower) ||
        master.attributeId.toLowerCase().includes(searchLower)
      );

      // 実験装置IDフィルター
      const matchesInstrumentId = !selectedInstrumentId || master.instrumentId === selectedInstrumentId;

      // ベンダーIDフィルター
      const matchesVendorId = !selectedVendorId || master.vendorId === selectedVendorId;

      // タイプIDフィルター
      const matchesTypeId = !selectedTypeId || master.typeId === selectedTypeId;

      // 属性IDフィルター
      const matchesAttributeId = !selectedAttributeId || master.attributeId === selectedAttributeId;

      return matchesSearch && matchesInstrumentId && matchesVendorId && matchesTypeId && matchesAttributeId;
    });
  }, [masters, searchText, selectedInstrumentId, selectedVendorId, selectedTypeId, selectedAttributeId]);

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
      title: (
        <Space size="middle" align="center">
          <span>ID</span>
          <Badge
            count={filteredMasters.filter(master => !master.isActive).length}
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
      ),
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center',
      sorter: (a, b) => parseInt(a.id) - parseInt(b.id),
    },
    {
      title: '実験装置ID',
      dataIndex: 'instrumentId',
      key: 'instrumentId',
      width: 140,
      align: 'center',
      sorter: (a, b) => a.instrumentId.localeCompare(b.instrumentId),
    },
    {
      title: '実験装置名',
      dataIndex: 'instrumentName',
      key: 'instrumentName',
      width: 180,
      align: 'center',
      sorter: (a, b) => a.instrumentName.localeCompare(b.instrumentName),
      render: (text: string, record) => (
        <Text style={{ 
          fontWeight: 500, 
          color: record.isActive ? 'rgba(0, 0, 0, 0.45)' : '#0093CF'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: '実験装置ベンダーID',
      dataIndex: 'vendorId',
      key: 'vendorId',
      width: 180,
      align: 'center',
      sorter: (a, b) => a.vendorId.localeCompare(b.vendorId),
    },
    {
      title: '実験装置タイプID',
      dataIndex: 'typeId',
      key: 'typeId',
      width: 170,
      align: 'center',
      sorter: (a, b) => a.typeId.localeCompare(b.typeId),
    },
    {
      title: '属性ID',
      dataIndex: 'attributeId',
      key: 'attributeId',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.attributeId.localeCompare(b.attributeId),
    },
    {
      title: '更新日時',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      sorter: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    },
    {
      title: '',
      key: 'action',
      width: 150,
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
            onClick={() => handleToggleActive(record.id)}
            danger={!record.isActive}
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
      isActive: true,
    });
    setIsModalVisible(true);
  };

  // マスタ編集
  const handleEdit = (master: MasterData) => {
    setEditingMaster(master);
    form.setFieldsValue(master);
    setIsModalVisible(true);
  };

  // 一括活性化
  const handleActivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('活性にするマスタを選択してください');
      return;
    }
    Modal.confirm({
      title: '選択したマスタを活性にしますか？',
      content: `${selectedRowKeys.length}件のマスタが活性になります。`,
      okText: '活性',
      cancelText: 'キャンセル',
      onOk: () => {
        setMasters(masters.map(m => 
          selectedRowKeys.includes(m.id) ? { ...m, isActive: false } : m
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件のマスタを活性にしました`);
      },
    });
  };

  // 一括非活性化
  const handleDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非活性にするマスタを選択してください');
      return;
    }
    Modal.confirm({
      title: '選択したマスタを非活性にしますか？',
      content: `${selectedRowKeys.length}件のマスタが非活性になります。`,
      okText: '非活性',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        setMasters(masters.map(m => 
          selectedRowKeys.includes(m.id) ? { ...m, isActive: true } : m
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件のマスタを非活性にしました`);
      },
    });
  };

  // 個別の活性/非活性切り替え
  const handleToggleActive = (id: string) => {
    const master = masters.find(m => m.id === id);
    if (!master) return;

    const actionText = master.isActive ? '活性' : '非活性';
    const masterName = master.instrumentName;

    Modal.confirm({
      title: `${masterName}を${actionText}にしますか？`,
      content: `このマスタを${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: master.isActive ? undefined : { danger: true },
      onOk: () => {
        setMasters(masters.map(m => 
          m.id === id ? { ...m, isActive: !m.isActive } : m
        ));
        message.success(`${masterName}を${actionText}にしました`);
      },
    });
  };

  // リロード
  const handleReload = () => {
    setMasters(masterData as MasterData[]);
    setSearchText('');
    setSelectedRowKeys([]);
    setSelectedInstrumentId('');
    setSelectedVendorId('');
    setSelectedTypeId('');
    setSelectedAttributeId('');
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

            const isActiveValue = row['状態'] || '活性';
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
            icon={<DeleteOutlined />}
            onClick={handleActivate}
            disabled={selectedRowKeys.length === 0}
            style={{
              minWidth: 85,
              backgroundColor: selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
              borderColor: selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
              color: selectedRowKeys.length > 0 ? '#fff' : undefined,
            }}
          >
            活性
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeactivate}
            disabled={selectedRowKeys.length === 0}
            style={{
              minWidth: 85,
              backgroundColor: selectedRowKeys.length > 0 ? '#FFA500' : undefined,
              borderColor: selectedRowKeys.length > 0 ? '#FFA500' : undefined,
              color: selectedRowKeys.length > 0 ? '#fff' : undefined,
            }}
          >
            非活性
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
          padding: 0,
          backgroundColor: '#fff',
          maxWidth: 3600,
          margin: '0 auto',
        }}
      >
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
              placeholder="実験装置ID、実験装置名、ベンダーID、タイプID、属性IDで検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="実験装置ID"
              value={selectedInstrumentId || undefined}
              onChange={(value) => setSelectedInstrumentId(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={instrumentIds.map(id => ({ label: id, value: id }))}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="ベンダーID"
              value={selectedVendorId || undefined}
              onChange={(value) => setSelectedVendorId(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={vendorIds.map(id => ({ label: id, value: id }))}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="タイプID"
              value={selectedTypeId || undefined}
              onChange={(value) => setSelectedTypeId(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={typeIds.map(id => ({ label: id, value: id }))}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="属性ID"
              value={selectedAttributeId || undefined}
              onChange={(value) => setSelectedAttributeId(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={attributeIds.map(id => ({ label: id, value: id }))}
            />
          </Col>
        </Row>

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
                { value: false, label: '活性' },
                { value: true, label: '非活性' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style jsx global>{`
        .active-row td {
          background-color: #d3d3d3 !important;
        }
        .active-row:hover td {
          background-color: #c0c0c0 !important;
        }
        .inactive-row td {
          background-color: #fff !important;
        }
        .inactive-row:hover td {
          background-color: #f5f5f5 !important;
        }
      `}</style>
    </div>
  );
}
