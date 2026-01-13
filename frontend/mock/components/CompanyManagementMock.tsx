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
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Papa from 'papaparse';
import companiesData from '../data/companies-management.json';

const { Text } = Typography;

/**
 * 会社データの型定義
 */
interface CompanyData {
  id: string;
  company_code: string;
  company_name: string;
  shareable_across_organizations: boolean;
  updated_at: string;
  status: 'active' | 'inactive';
}

/**
 * 会社管理画面のモックコンポーネント
 */
export default function CompanyManagementMock() {
  const [companies, setCompanies] = useState<CompanyData[]>(
    companiesData as CompanyData[]
  );
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  const [selectedShareable, setSelectedShareable] = useState<string>('');
  const [form] = Form.useForm();

  // 日時フォーマット関数
  const formatDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr || dateTimeStr === '-') return '-';
    // YYYYMMDDhhmmss 形式を yyyy/MM/dd hh:mm に変換
    const year = dateTimeStr.substring(0, 4);
    const month = dateTimeStr.substring(4, 6);
    const day = dateTimeStr.substring(6, 8);
    const hour = dateTimeStr.substring(8, 10);
    const minute = dateTimeStr.substring(10, 12);
    return `${year}/${month}/${day} ${hour}:${minute}`;
  };

  // 会社CDの選択肢を動的に取得
  const companyCodes = useMemo(() => {
    const uniqueCodes = Array.from(new Set(companies.map(c => c.company_code).filter(code => code)));
    return uniqueCodes.sort();
  }, [companies]);

  // フィルタリングされた会社
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      // テキスト検索フィルター
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || (
        company.company_code.toLowerCase().includes(searchLower) ||
        company.company_name.toLowerCase().includes(searchLower) ||
        formatDateTime(company.updated_at).toLowerCase().includes(searchLower)
      );

      // 共有可否フィルター
      const matchesShareable = !selectedShareable || 
        (selectedShareable === 'true' ? company.shareable_across_organizations : !company.shareable_across_organizations);

      return matchesSearch && matchesShareable;
    });
  }, [companies, searchText, selectedShareable]);

  // テーブルの行選択
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // テーブルカラム定義
  const columns: ColumnsType<CompanyData> = [
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <Space size="middle" align="center">
            <span>会社CD</span>
            <Badge
              count={filteredCompanies.length}
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
      dataIndex: 'company_code',
      key: 'company_code',
      width: 120,
      align: 'left',
      sorter: (a, b) => a.company_code.localeCompare(b.company_code),
      render: (text: string) => (
        <Text style={{ fontSize: 13 }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>会社名</div>,
      dataIndex: 'company_name',
      key: 'company_name',
      width: 300,
      sorter: (a, b) => a.company_name.localeCompare(b.company_name),
      render: (text: string) => (
        <Text style={{ fontWeight: 500, color: '#0093CF' }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>組織間での共有可否</div>,
      dataIndex: 'shareable_across_organizations',
      key: 'shareable_across_organizations',
      width: 180,
      align: 'center',
      sorter: (a, b) => (a.shareable_across_organizations === b.shareable_across_organizations ? 0 : a.shareable_across_organizations ? -1 : 1),
      render: (shareable: boolean) => (
        <Badge 
          status={shareable ? 'success' : 'default'} 
          text={shareable ? '可' : '不可'} 
        />
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>更新日時</div>,
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      align: 'right',
      sorter: (a, b) => a.updated_at.localeCompare(b.updated_at),
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
            onClick={() => handleToggleActive(record.id)}
            danger={record.status === 'active'}
            style={{ width: '100px' }}
          >
            {record.status === 'inactive' ? 'アクティブ' : '非アクティブ'}
          </Button>
        </Space>
      ),
    },
  ];

  // 会社追加
  const handleAdd = () => {
    setEditingCompany(null);
    form.resetFields();
    form.setFieldsValue({
      shareable_across_organizations: true,
      status: 'active',
    });
    setIsModalVisible(true);
  };

  // 会社編集
  const handleEdit = (company: CompanyData) => {
    setEditingCompany(company);
    form.setFieldsValue(company);
    setIsModalVisible(true);
  };

  // アクティブ化
  const handleActivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('アクティブにする会社を選択してください');
      return;
    }
    Modal.confirm({
      title: '選択した会社をアクティブにしますか？',
      content: `${selectedRowKeys.length}件の会社がアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: () => {
        setCompanies(companies.map(c => 
          selectedRowKeys.includes(c.id) ? { ...c, status: 'active' } : c
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件の会社をアクティブにしました`);
      },
    });
  };

  // 非アクティブ化
  const handleDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非アクティブにする会社を選択してください');
      return;
    }
    Modal.confirm({
      title: '選択した会社を非アクティブにしますか？',
      content: `${selectedRowKeys.length}件の会社が非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        setCompanies(companies.map(c => 
          selectedRowKeys.includes(c.id) ? { ...c, status: 'inactive' } : c
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件の会社を非アクティブにしました`);
      },
    });
  };

  // アクティブ/非アクティブ切り替え
  const handleToggleActive = (id: string) => {
    const company = companies.find(c => c.id === id);
    if (!company) return;

    const actionText = company.status === 'inactive' ? 'アクティブ' : '非アクティブ';
    const companyName = company.company_name;

    Modal.confirm({
      title: `${companyName}を${actionText}にしますか？`,
      content: `この会社を${company.status === 'inactive' ? 'アクティブ' : '非アクティブ'}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: company.status === 'inactive' ? undefined : { danger: true },
      onOk: () => {
        setCompanies(companies.map(c => 
          c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c
        ));
        message.success(`${companyName}を${company.status === 'inactive' ? 'アクティブ' : '非アクティブ'}にしました`);
      },
    });
  };

  // リロード
  const handleReload = () => {
    setCompanies(companiesData as CompanyData[]);
    setSearchText('');
    setSelectedRowKeys([]);
    setSelectedShareable('');
    message.success('データをリロードしました');
  };

  // CSVアップロード処理
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
          const newCompanies: CompanyData[] = [];
          const errors: string[] = [];
          const existingCodes = new Set(companies.map(c => c.company_code.toLowerCase()));

          results.data.forEach((row: Record<string, string>, index: number) => {
            const rowNumber = index + 2;

            if (!row['会社CD'] || !row['会社名']) {
              errors.push(`${rowNumber}行目: 会社CD、会社名は必須です`);
              return;
            }

            const companyCode = row['会社CD'].trim().toLowerCase();
            if (existingCodes.has(companyCode)) {
              errors.push(`${rowNumber}行目: 会社CD「${row['会社CD']}」は既に登録されています`);
              return;
            }

            const shareableValue = row['組織間での共有可否'] || '可';
            const shareable = shareableValue === '可' || shareableValue === 'true';

            const statusValue = row['状態'] || 'アクティブ';
            const status: 'active' | 'inactive' = 
              (statusValue === 'アクティブ' || statusValue === 'active') ? 'active' : 'inactive';

            const newCompany: CompanyData = {
              id: row['会社CD'].trim(),
              company_code: row['会社CD'].trim(),
              company_name: row['会社名'].trim(),
              shareable_across_organizations: shareable,
              updated_at: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
              status: status,
            };

            newCompanies.push(newCompany);
            existingCodes.add(companyCode);
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

            if (newCompanies.length > 0) {
              Modal.confirm({
                title: '一部のデータを追加しますか？',
                content: `${newCompanies.length}件の有効な会社データが見つかりました。これらを追加しますか？`,
                okText: '追加',
                cancelText: 'キャンセル',
                onOk: () => {
                  setCompanies([...companies, ...newCompanies]);
                  message.success(`${newCompanies.length}件の会社を追加しました`);
                },
              });
            }
            return;
          }

          if (newCompanies.length > 0) {
            setCompanies([...companies, ...newCompanies]);
            message.success(`${newCompanies.length}件の会社を追加しました`);
          } else {
            message.warning('追加する会社データがありませんでした');
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
      '会社CD',
      '会社名',
      '組織間での共有可否',
      '更新日時',
      '状態',
    ];

    const rows = filteredCompanies.map((company) => [
      company.company_code,
      company.company_name,
      company.shareable_across_organizations ? '可' : '不可',
      formatDateTime(company.updated_at),
      company.status === 'active' ? 'アクティブ' : '非アクティブ',
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
    link.download = `companies_${timestamp}.csv`;

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
      
      if (editingCompany) {
        setCompanies(companies.map(c => 
          c.id === editingCompany.id 
            ? { 
                ...c, 
                ...values,
                updated_at: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
              } 
            : c
        ));
        message.success('会社情報を更新しました');
      } else {
        const newCompany: CompanyData = {
          ...values,
          id: values.company_code,
          updated_at: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
        };
        setCompanies([...companies, newCompany]);
        message.success('会社を追加しました');
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
    <div style={{ padding: '0 15px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: 16,
        gap: 8,
      }}>
        <Button icon={<UploadOutlined />} onClick={handleUpload}>
          CSV<br />アップロード
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          CSV<br />ダウンロード
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAdd}>
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
          アクティブ
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
              placeholder="会社CD、会社名、更新日時で検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="共有可否"
              value={selectedShareable || undefined}
              onChange={(value) => setSelectedShareable(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: '可', value: 'true' },
                { label: '不可', value: 'false' },
              ]}
            />
          </Col>
        </Row>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredCompanies}
          rowKey="id"
          size="small"
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `全 ${total} 件`,
          }}
          rowClassName={(record) => (record.status === 'inactive' ? 'active-row' : 'inactive-row')}
        />
      </div>

      <Modal
        title={editingCompany ? '会社編集' : '会社追加'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="保存"
        cancelText="キャンセル"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="company_code"
            label="会社CD"
            rules={[{ required: true, message: '会社CDを入力してください' }]}
          >
            <Input placeholder="K001" disabled={!!editingCompany} />
          </Form.Item>

          <Form.Item
            name="company_name"
            label="会社名"
            rules={[{ required: true, message: '会社名を入力してください' }]}
          >
            <Input placeholder="アルファテクノロジーズ株式会社" />
          </Form.Item>

          <Form.Item
            name="shareable_across_organizations"
            label="組織間での共有可否"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: true, label: '可' },
                { value: false, label: '不可' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状態"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'active', label: 'アクティブ' },
                { value: 'inactive', label: '非アクティブ' },
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
