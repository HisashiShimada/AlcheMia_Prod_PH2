'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Flex,
  Modal,
  Form,
  Select,
  Typography,
  Row,
  Col,
  theme,
  App,
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
import { getOrganizationId } from '@/utils/sessionStorageHelper';
import { formatDateTime } from '@/utils/dateFormatter';
import { getDepartmentConfig } from '@/types/departmentTypes';
import {
  fetchMasters,
  createMaster,
  updateMaster,
  updateMasterStatus,
  batchUpdateMasterStatus,
  uploadCsv,
  downloadCsv,
  type MasterRecord,
} from '@/services/departmentApiService';

const { Text } = Typography;

/**
 * 部署データの型定義
 */
interface DepartmentRecord {
  departmentId: string;
  displayName: string;
  updatedAt?: string;
  isActive: boolean;
}

/**
 * 部署管理画面のコンポーネント
 */
export default function DepartmentManagement() {
  const { modal, message } = App.useApp();
  const { token } = theme.useToken();

  // State管理
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null);
  const [form] = Form.useForm();

  // 設定情報を取得
  const config = getDepartmentConfig();

  // 部署一覧を取得
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await fetchMasters();
      setDepartments(data as unknown as DepartmentRecord[]);
      console.log('Loaded departments from API:', data.length, 'records');
    } catch (error) {
      console.error('Fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`部署の取得に失敗しました: ${errorMessage}`);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // 初回データ読み込み
  useEffect(() => {
    fetchDepartments();
  }, []);

  // フィルタリングされたデータ
  const filteredDepartments = useMemo(() => {
    return departments.filter(dept => {
      const searchLower = searchText.toLowerCase();
      if (!searchText.trim()) return true;

      const deptRecord = dept as DepartmentRecord;
      return (
        deptRecord.departmentId?.toLowerCase().includes(searchLower) ||
        deptRecord.displayName?.toLowerCase().includes(searchLower)
      );
    });
  }, [departments, searchText]);

  // テーブルカラム定義
  const columns: ColumnsType<DepartmentRecord> = useMemo(() => {
    return [
      {
        title: <div style={{ textAlign: 'center' }}>部署CD</div>,
        dataIndex: 'departmentId',
        key: 'departmentId',
        width: 150,
        align: 'left',
        sorter: (a, b) => {
          const aRecord = a as DepartmentRecord;
          const bRecord = b as DepartmentRecord;
          return aRecord.departmentId.localeCompare(bRecord.departmentId);
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>部署名</div>,
        dataIndex: 'displayName',
        key: 'displayName',
        width: 300,
        align: 'left',
        sorter: (a, b) => {
          const aRecord = a as DepartmentRecord;
          const bRecord = b as DepartmentRecord;
          return aRecord.displayName.localeCompare(bRecord.displayName);
        },
        render: (text: string, record: DepartmentRecord) => (
          <Text
            style={{
              fontWeight: token.fontWeightStrong,
              color: record.isActive === false ? token.colorTextDisabled : token.colorPrimary,
            }}
          >
            {text}
          </Text>
        ),
      },
      {
        title: <div style={{ textAlign: 'center' }}>更新日時</div>,
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 180,
        align: 'right',
        sorter: (a, b) => {
          const aRecord = a as DepartmentRecord;
          const bRecord = b as DepartmentRecord;
          return (aRecord.updatedAt || '').localeCompare(bRecord.updatedAt || '');
        },
        render: (text: string) => formatDateTime(text || ''),
      },
      {
        title: '',
        key: 'action',
        width: 140,
        align: 'right',
        fixed: 'right',
        render: (_, record) => (
          <Flex gap="small" justify="end">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              編集
            </Button>
            <Button
              size="small"
              onClick={() => handleToggleActive(record)}
              danger={record.isActive !== false}
              style={{ minWidth: '80px' }}
            >
              {record.isActive !== false ? '非アクティブ' : 'アクティブ'}
            </Button>
          </Flex>
        ),
      },
    ];
  }, [token]);

  // テーブルの行選択
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // 部署追加
  const handleAdd = () => {
    setEditingDepartment(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
    });
    setIsModalVisible(true);
  };

  // 部署編集
  const handleEdit = (department: DepartmentRecord) => {
    setEditingDepartment(department);
    form.setFieldsValue(department);
    setIsModalVisible(true);
  };

  // 一括アクティブ化
  const handleActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('アクティブにする部署を選択してください');
      return;
    }

    modal.confirm({
      title: '選択した部署をアクティブにしますか？',
      content: `${selectedRowKeys.length}件の部署がアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          await batchUpdateMasterStatus(selectedRowKeys.map(String), true);
          await fetchDepartments();
          setSelectedRowKeys([]);
          message.success(`${selectedRowKeys.length}件の部署をアクティブにしました`);
        } catch (error) {
          console.error('一括アクティブ化エラー:', error);
          message.error(error instanceof Error ? error.message : 'エラーが発生しました');
        }
      },
    });
  };

  // 一括非アクティブ化
  const handleDeactivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非アクティブにする部署を選択してください');
      return;
    }

    modal.confirm({
      title: '選択した部署を非アクティブにしますか？',
      content: `${selectedRowKeys.length}件の部署が非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchUpdateMasterStatus(selectedRowKeys.map(String), false);
          await fetchDepartments();
          setSelectedRowKeys([]);
          message.success(`${selectedRowKeys.length}件の部署を非アクティブにしました`);
        } catch (error) {
          console.error('エラー:', error);
          message.error(error instanceof Error ? error.message : 'エラーが発生しました');
        }
      },
    });
  };

  // 個別のアクティブ/非アクティブ切り替え
  const handleToggleActive = async (record: DepartmentRecord) => {
    const deptRecord = record as DepartmentRecord;
    const departmentName = deptRecord.displayName || 'この部署';
    const currentStatus = record.isActive !== false;
    const actionText = currentStatus ? '非アクティブ' : 'アクティブ';
    const newStatus = !currentStatus;

    modal.confirm({
      title: `${departmentName}を${actionText}にしますか？`,
      content: `この部署を${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: actionText === '非アクティブ' ? { danger: true } : undefined,
      onOk: async () => {
        try {
          await updateMasterStatus(deptRecord.departmentId, newStatus);
          await fetchDepartments();
          message.success(`${departmentName}を${actionText}にしました`);
        } catch (error) {
          console.error('エラー:', error);
          message.error(error instanceof Error ? error.message : 'エラーが発生しました');
        }
      },
    });
  };

  // リロード
  const handleReload = () => {
    fetchDepartments();
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

  // CSVファイルをAPIにアップロード
  const handleCSVUpload = async (file: File) => {
    try {
      setLoading(true);
      await uploadCsv(file);
      message.success('CSVファイルをアップロードしました');
      await fetchDepartments();
    } catch (error) {
      console.error('CSV upload error:', error);
      message.error(error instanceof Error ? error.message : 'CSVアップロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // CSVダウンロード
  const handleDownload = async () => {
    try {
      setLoading(true);
      await downloadCsv({
        search: searchText,
      });
      message.success('CSVファイルをダウンロードしました');
    } catch (error) {
      console.error('CSV download error:', error);
      message.error(error instanceof Error ? error.message : 'CSVダウンロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // モーダルOK
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingDepartment) {
        // 編集の場合
        const editingRecord = editingDepartment as DepartmentRecord;
        await updateMaster(editingRecord.departmentId, {
          departmentName: values.displayName,
          isActive: values.isActive,
        });
        await fetchDepartments();
        message.success('部署情報を更新しました');
      } else {
        // 新規追加の場合
        await createMaster({
          departmentCd: values.departmentId,
          departmentName: values.displayName,
          isActive: values.isActive !== undefined ? values.isActive : true,
        });
        await fetchDepartments();
        message.success('部署を追加しました');
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('エラー:', error);

      const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました';

      if (errorMessage.includes('既に存在しています')) {
        form.setFields([
          {
            name: 'departmentId',
            errors: [errorMessage],
          },
        ]);
        message.error(errorMessage);
        return;
      }

      message.error(errorMessage);
    }
  };

  // モーダルキャンセル
  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  return (
    <div style={{ padding: 0 }}>
      {/* 操作ボタン */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: 16,
          gap: 16,
        }}
      >
        <Flex gap="small">
          <Button icon={<UploadOutlined />} onClick={handleUpload}>
            CSV
            <br />
            アップロード
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            CSV
            <br />
            ダウンロード
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
              backgroundColor: selectedRowKeys.length > 0 ? token.colorSuccess : undefined,
              borderColor: selectedRowKeys.length > 0 ? token.colorSuccess : undefined,
              color: selectedRowKeys.length > 0 ? token.colorWhite : undefined,
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
              backgroundColor: selectedRowKeys.length > 0 ? token.colorWarning : undefined,
              borderColor: selectedRowKeys.length > 0 ? token.colorWarning : undefined,
              color: selectedRowKeys.length > 0 ? token.colorWhite : undefined,
            }}
          >
            非アクティブ
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReload}>
            リロード
          </Button>
        </Flex>
      </div>

      {/* 部署一覧セクション */}
      <div
        style={{
          padding: 0,
          backgroundColor: token.colorBgContainer,
          maxWidth: 3600,
          margin: '0 auto',
        }}
      >
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
              placeholder="部署CD、部署名で検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
        </Row>

        <Table
          loading={loading}
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredDepartments}
          rowKey="departmentId"
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `全 ${total} 件`,
          }}
          rowClassName={(record) =>
            record.isActive === false ? 'active-row' : 'inactive-row'
          }
        />
      </div>

      {/* 部署追加/編集モーダル */}
      <Modal
        title={editingDepartment ? '部署編集' : '部署追加'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="保存"
        cancelText="キャンセル"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="departmentId"
            label="部署CD"
            rules={[{ required: !editingDepartment, message: '部署CDを入力してください' }]}
          >
            <Input disabled={!!editingDepartment} placeholder="部署CDを入力してください" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="部署名"
            rules={[{ required: true, message: '部署名を入力してください' }]}
          >
            <Input placeholder="部署名を入力してください" />
          </Form.Item>

          <Form.Item name="isActive" label="状態">
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
        .ant-form-item-has-error .ant-input {
          background-color: #ffcccc !important;
        }
        .ant-form-item-has-error .ant-input:focus {
          background-color: #ffcccc !important;
        }

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