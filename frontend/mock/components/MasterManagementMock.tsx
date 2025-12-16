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
  message,
  Typography,
  Row,
  Col,
  theme,
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
import masterTypesData from '../data/master-management-master.json';
import organizationData from '../data/master-management-organization.json';
import departmentData from '../data/master-management-department.json';
import usersData from '../data/master-management-users.json';
import roleData from '../data/master-management-role.json';
import laboratoryEquipmentData from '../data/master-management-laboratory-equipment.json';
import laboratoryEquipmentTypeData from '../data/master-management-laboratory-equipment-type.json';
import laboratoryEquipmentVendorData from '../data/master-management-laboratory-equipment-vendor.json';

const { Text } = Typography;

// JSONデータのマッピング
const masterDataMap: Record<string, MasterRecord[]> = {
  'master-management-organization.json': organizationData,
  'master-management-department.json': departmentData,
  'master-management-users.json': usersData,
  'master-management-role.json': roleData,
  'master-management-laboratory-equipment.json': laboratoryEquipmentData,
  'master-management-laboratory-equipment-type.json': laboratoryEquipmentTypeData,
  'master-management-laboratory-equipment-vendor.json': laboratoryEquipmentVendorData,
};

/**
 * 項目カテゴリの型定義
 */
interface ItemCategory {
  headerName: string;
  searchFixed: boolean;
  isDisplay: boolean;
  addable: boolean;
  update: boolean;
}

/**
 * マスタ種別の型定義
 */
interface MasterTypeData {
  masterId: string;
  role: string;
  relationData: string;
  displayName: string;
  itemCategories: Record<string, ItemCategory | undefined>;
  isActive: boolean;
}

/**
 * 汎用マスタデータの型定義
 */
type MasterRecord = Record<string, unknown>;

/**
 * マスタ管理画面のProps
 */
interface MasterManagementMockProps {
  initialMasterId?: string;
}

/**
 * マスタ管理画面のモックコンポーネント
 */
export default function MasterManagementMock({ initialMasterId }: MasterManagementMockProps = {}) {
  const { token } = theme.useToken();
  
  // 日時フォーマット関数
  const formatDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr || dateTimeStr === '-') return '-';
    // YYYYMMDDhhmmss 形式を yyyy/MM/dd hh:mm に変換
    if (dateTimeStr.length >= 12) {
      const year = dateTimeStr.substring(0, 4);
      const month = dateTimeStr.substring(4, 6);
      const day = dateTimeStr.substring(6, 8);
      const hour = dateTimeStr.substring(8, 10);
      const minute = dateTimeStr.substring(10, 12);
      return `${year}/${month}/${day} ${hour}:${minute}`;
    }
    return dateTimeStr;
  };

  // State管理
  const [masters, setMasters] = useState<MasterRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterRecord | null>(null);
  const [selectedMasterType, setSelectedMasterType] = useState<string>(() => {
    // initialMasterIdが指定されている場合はそれを使用（部署="2"、ロール="4"）
    if (initialMasterId) {
      return initialMasterId;
    }
    // 指定がない場合は最初のアクティブなマスタを選択
    const firstMaster = (masterTypesData as MasterTypeData[]).find(m => m.isActive);
    return firstMaster?.masterId || '1';
  });
  const [fixedFilters, setFixedFilters] = useState<Record<string, string>>({});
  const [form] = Form.useForm();

  // 選択されたマスタ種別の情報を取得
  const selectedMasterInfo = useMemo(() => {
    return (masterTypesData as MasterTypeData[]).find(
      m => m.masterId === selectedMasterType
    );
  }, [selectedMasterType]);

  // マスタ種別の選択肢をJSONファイルから生成
  const masterTypes = useMemo(() => {
    return (masterTypesData as MasterTypeData[])
      .filter((master) => master.isActive)
      .map((master) => ({
        value: master.masterId,
        label: `${master.displayName}（${master.role}）`,
      }));
  }, []);

  // データの読み込み
  useEffect(() => {
    if (!selectedMasterInfo) return;

    // ローディング開始 - 一覧をクリア
    setLoading(true);
    setMasters([]);
    setFixedFilters({});
    setSearchText('');
    setSelectedRowKeys([]);

    // localStorageからデータを読み込む
    const storageKey = `master_${selectedMasterInfo.masterId}`;
    const storedData = localStorage.getItem(storageKey);
    
    if (storedData) {
      // localStorageにデータがある場合は、それを使用
      try {
        const parsedData = JSON.parse(storedData);
        console.log('Loading from localStorage:', selectedMasterInfo.displayName);
        setMasters(parsedData);
        setLoading(false);
        return;
      } catch (error) {
        console.error('localStorage parse error:', error);
        // エラーの場合は通常の読み込みを続行
      }
    }

    // 静的にインポートしたデータから取得
    const data = masterDataMap[selectedMasterInfo.relationData];
    
    console.log('Loading master:', selectedMasterInfo.displayName);
    console.log('Relation data:', selectedMasterInfo.relationData);
    console.log('Loaded data:', data);
    console.log('Is array:', Array.isArray(data));
    console.log('Data length:', data?.length);
    
    if (data && Array.isArray(data)) {
      // 空のオブジェクトや無効なデータをフィルタリング
      const validData = data.filter(record => {
        // recordが存在しない、またはオブジェクトでない場合は除外
        if (!record || typeof record !== 'object') {
          return false;
        }
        
        // masterIdが一致しないレコードは除外（文字列で比較）
        if (String(record.masterId) !== String(selectedMasterInfo.masterId)) {
          return false;
        }
        
        // すべてのプロパティが空の場合は除外
        const hasValidValue = Object.values(record).some(value => {
          return value !== null && value !== undefined && value !== '';
        });
        
        if (!hasValidValue) {
          return false;
        }
        
        // IDフィールドが空でないことを確認
        const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
        return record[idField] !== null && record[idField] !== undefined && record[idField] !== '';
      });
      
      console.log('Original data length:', data.length);
      console.log('Matched masterId:', validData.length);
      console.log('Filtered out:', data.length - validData.length);
      
      setMasters(validData);
      console.log('Masters set successfully');
    } else {
      console.error('データが見つからないか配列ではありません:', selectedMasterInfo.relationData);
      message.error(`マスタデータが見つかりません: ${selectedMasterInfo.displayName}`);
      setMasters([]);
    }
    
    setLoading(false);
  }, [selectedMasterInfo]);

  // mastersが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (!selectedMasterInfo || masters.length === 0) return;
    
    const storageKey = `master_${selectedMasterInfo.masterId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(masters));
      console.log('Saved to localStorage:', selectedMasterInfo.displayName, masters.length, 'records');
    } catch (error) {
      console.error('localStorage save error:', error);
    }
  }, [masters, selectedMasterInfo]);

  // searchFixedがtrueの項目を取得
  const fixedFilterFields = useMemo(() => {
    if (!selectedMasterInfo) return [];
    return Object.entries(selectedMasterInfo.itemCategories)
      .filter(([_, category]) => category && category.searchFixed && category.isDisplay)
      .map(([key, category]) => ({ key, ...category! }));
  }, [selectedMasterInfo]);

  // searchFixedがfalseの項目を取得（曖昧検索対象）
  const fuzzySearchFields = useMemo(() => {
    if (!selectedMasterInfo) return [];
    return Object.entries(selectedMasterInfo.itemCategories)
      .filter(([_, category]) => category && !category.searchFixed && category.isDisplay)
      .map(([key]) => key);
  }, [selectedMasterInfo]);

  // 固定フィルター用の選択肢を動的に生成
  const getFilterOptions = (fieldKey: string) => {
    const uniqueValues = Array.from(
      new Set(
        masters
          .map(m => m[fieldKey])
          .filter(v => v !== null && v !== undefined && v !== '')
      )
    );
    return uniqueValues.sort().map(v => ({ label: String(v), value: String(v) }));
  };

  // フィルタリングされたデータ
  const filteredMasters = useMemo(() => {
    if (!selectedMasterInfo) return [];
    
    const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
    
    return masters.filter(master => {
      // IDフィールドがundefined、null、空文字の場合は除外
      const idValue = master[idField];
      if (idValue === undefined || idValue === null || idValue === '') {
        return false;
      }
      
      // テキスト検索フィルター（searchFixed=falseの項目）
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || fuzzySearchFields.some(fieldKey => {
        const value = master[fieldKey];
        return value && String(value).toLowerCase().includes(searchLower);
      });

      // 固定フィルター（searchFixed=trueの項目）
      const matchesFixedFilters = Object.entries(fixedFilters).every(([key, value]) => {
        if (!value) return true;
        return String(master[key]) === String(value);
      });

      return matchesSearch && matchesFixedFilters;
    });
  }, [masters, searchText, fixedFilters, fuzzySearchFields, selectedMasterInfo]);

  // テーブルカラムを動的に生成
  const columns: ColumnsType<MasterRecord> = useMemo(() => {
    if (!selectedMasterInfo) return [];

    const dynamicColumns: ColumnsType<MasterRecord> = Object.entries(
      selectedMasterInfo.itemCategories
    )
      .filter(([_, category]) => category && category.isDisplay)
      .map(([key, category], index) => {
        // すべてのフィールドを左寄せ
        const align = 'left' as const;
        
        // 説明系のフィールド、機能名、ロール名、実験装置名は幅を広く設定
        const isExplanation = /explan|explanation|description|desc|comment/i.test(key);
        const isFunctionName = /function.*name/i.test(key);
        const isRoleName = /role.*name/i.test(key);
        const isLabEquipmentName = /laborator.*equipment.*(name|display)/i.test(key);
        const columnWidth = isExplanation ? 420 : (isFunctionName ? 190 : (isRoleName ? 170 : (isLabEquipmentName ? 180 : 150)));
        
        return {
          title: <div style={{ textAlign: 'center' }}>{category!.headerName}</div>,
          dataIndex: key,
          key: key,
          width: columnWidth,
          align: align,
          sorter: (a: MasterRecord, b: MasterRecord) => {
            const aVal = String(a[key] || '');
            const bVal = String(b[key] || '');
            return aVal.localeCompare(bVal);
          },
          render: (text: unknown, record: MasterRecord) => {
            // 日時フィールドの判定（updatedAtなど）
            if (key.includes('updated') || key.includes('Updated')) {
              return formatDateTime(String(text || ''));
            }
            // 最初の表示項目を強調表示
            if (index === 1) {
              return (
                <Text style={{ 
                  fontWeight: token.fontWeightStrong, 
                  color: record.isActive === false ? token.colorTextDisabled : token.colorPrimary
                }}>
                  {String(text || '')}
                </Text>
              );
            }
            return String(text || '');
          },
        };
      });

    // アクションカラムを追加
    dynamicColumns.push({
      title: '',
      key: 'action',
      width: 250,
      align: 'right',
      fixed: 'right',
      render: (_, record) => (
        <Flex gap="small" justify="end">
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Button
            onClick={() => handleToggleActive(record)}
            danger={record.isActive === false}
            style={{ width: '100px' }}
          >
            {record.isActive !== false ? 'アクティブ' : '非アクティブ'}
          </Button>
        </Flex>
      ),
    });

    return dynamicColumns;
  }, [selectedMasterInfo, token, formatDateTime]);

  // テーブルの行選択
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

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
  const handleEdit = (master: MasterRecord) => {
    setEditingMaster(master);
    form.setFieldsValue(master);
    setIsModalVisible(true);
  };

  // 一括アクティブ化
  const handleActivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('アクティブにするマスタを選択してください');
      return;
    }
    Modal.confirm({
      title: '選択したマスタをアクティブにしますか？',
      content: `${selectedRowKeys.length}件のマスタがアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: () => {
        setMasters(masters.map(m => {
          const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
          return selectedRowKeys.includes(String(m[idField])) ? { ...m, isActive: true } : m;
        }));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件のマスタをアクティブにしました`);
      },
    });
  };

  // 一括非アクティブ化
  const handleDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非アクティブにするマスタを選択してください');
      return;
    }
    Modal.confirm({
      title: '選択したマスタを非アクティブにしますか？',
      content: `${selectedRowKeys.length}件のマスタが非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        setMasters(masters.map(m => {
          const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
          return selectedRowKeys.includes(String(m[idField])) ? { ...m, isActive: false } : m;
        }));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件のマスタを非アクティブにしました`);
      },
    });
  };

  // 個別のアクティブ/非アクティブ切り替え
  const handleToggleActive = (record: MasterRecord) => {
    const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
    const nameField = Object.keys(selectedMasterInfo?.itemCategories || {})[1];
    const masterName = record[nameField] || 'このマスタ';

    const actionText = record.isActive === false ? 'アクティブ' : '非アクティブ';

    Modal.confirm({
      title: `${masterName}を${actionText}にしますか？`,
      content: `このマスタを${record.isActive === false ? 'アクティブ' : '非アクティブ'}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: record.isActive === false ? undefined : { danger: true },
      onOk: () => {
        setMasters(masters.map(m => 
          m[idField] === record[idField] ? { ...m, isActive: !record.isActive } : m
        ));
        message.success(`${masterName}を${record.isActive === false ? 'アクティブ' : '非アクティブ'}にしました`);
      },
    });
  };

  // リロード
  const handleReload = () => {
    if (!selectedMasterInfo) return;
    
    setLoading(true);
    
    // localStorageをクリア
    const storageKey = `master_${selectedMasterInfo.masterId}`;
    localStorage.removeItem(storageKey);
    console.log('Cleared localStorage:', storageKey);
    
    // 静的にインポートしたデータから取得
    const data = masterDataMap[selectedMasterInfo.relationData];
    
    if (data && Array.isArray(data)) {
      // 空のオブジェクトや無効なデータをフィルタリング（useEffectと同じロジック）
      const validData = data.filter(record => {
        // recordが存在しない、またはオブジェクトでない場合は除外
        if (!record || typeof record !== 'object') {
          return false;
        }
        
        // masterIdが一致しないレコードは除外（文字列で比較）
        if (String(record.masterId) !== String(selectedMasterInfo.masterId)) {
          return false;
        }
        
        // すべてのプロパティが空の場合は除外
        const hasValidValue = Object.values(record).some(value => {
          return value !== null && value !== undefined && value !== '';
        });
        
        if (!hasValidValue) {
          return false;
        }
        
        // IDフィールドが空でないことを確認
        const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
        return record[idField] !== null && record[idField] !== undefined && record[idField] !== '';
      });
      
      setMasters(validData);
      setSearchText('');
      setSelectedRowKeys([]);
      setFixedFilters({});
      message.success('データをリロードしました');
    } else {
      message.error(`マスタデータが見つかりません: ${selectedMasterInfo.displayName}`);
      setMasters([]);
    }
    
    setLoading(false);
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
    if (!selectedMasterInfo) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        try {
          const newMasters: MasterRecord[] = [];

          results.data.forEach((row: Record<string, string>) => {
            const newRecord: MasterRecord = {};

            // itemCategoriesに基づいてデータを構築
            Object.entries(selectedMasterInfo.itemCategories).forEach(([key, category]) => {
              if (category && row[category.headerName] !== undefined) {
                newRecord[key] = row[category.headerName].trim();
              }
            });

            // isActiveの処理
            if (row['状態']) {
              const statusValue = row['状態'];
              newRecord.isActive = statusValue === 'アクティブ' || statusValue === 'true' || statusValue === '1';
            } else {
              newRecord.isActive = true;
            }

            newMasters.push(newRecord);
          });

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
    if (!selectedMasterInfo) return;

    const headers = Object.values(selectedMasterInfo.itemCategories)
      .filter(c => c && c.isDisplay)
      .map(c => c!.headerName)
      .concat(['状態']);

    const rows = filteredMasters.map((master) => {
      const row = Object.entries(selectedMasterInfo.itemCategories)
        .filter(([_, c]) => c && c.isDisplay)
        .map(([key, _]) => master[key] || '');
      row.push(master.isActive === false ? '非アクティブ' : 'アクティブ');
      return row;
    });

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
    link.download = `${selectedMasterInfo.displayName}_${timestamp}.csv`;

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
        const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
        setMasters(masters.map(m => 
          m[idField] === editingMaster[idField] ? { ...m, ...values } : m
        ));
        message.success('マスタ情報を更新しました');
      } else {
        setMasters([...masters, values]);
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

  // 曖昧検索のプレースホルダーを生成
  const fuzzySearchPlaceholder = useMemo(() => {
    if (!selectedMasterInfo) return '検索';
    const fieldNames = fuzzySearchFields
      .map(key => selectedMasterInfo.itemCategories[key]?.headerName)
      .filter(Boolean)
      .join('、');
    return fieldNames ? `${fieldNames}で検索` : '検索';
  }, [selectedMasterInfo, fuzzySearchFields]);

  return (
    <div style={{ padding: 0 }}>
      {/* マスタ選択と操作ボタン */}
      <div style={{ 
        display: 'flex', 
        justifyContent: initialMasterId ? 'flex-end' : 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 16,
      }}>
        {/* 左側：マスタ選択（initialMasterIdが指定されていない場合のみ表示） */}
        {!initialMasterId && (
          <Flex gap="middle" align="center">
            <Text strong style={{ fontSize: token.fontSizeLG }}>マスタ選択：</Text>
            <Select
              style={{ width: 300 }}
              value={selectedMasterType}
              onChange={setSelectedMasterType}
              options={masterTypes}
            />
          </Flex>
        )}

        {/* 右側：操作ボタン */}
        <Flex gap="small">
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

      {/* マスタ一覧セクション */}
      <div
        style={{
          padding: 0,
          backgroundColor: token.colorBgContainer,
          maxWidth: 3600,
          margin: '0 auto',
        }}
      >
        <Row gutter={16} style={{ marginBottom: 8 }}>
          {/* 曖昧検索 */}
          <Col style={{ width: 400 }}>
            <Input
              placeholder={fuzzySearchPlaceholder}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          
          {/* 固定フィルター（searchFixed=trueの項目） */}
          {fixedFilterFields.map(field => (
            <Col key={field.key} style={{ width: 150 }}>
              <Select
                placeholder={field.headerName}
                value={fixedFilters[field.key] || undefined}
                onChange={(value) => setFixedFilters({ ...fixedFilters, [field.key]: value || '' })}
                allowClear
                style={{ width: '100%' }}
                options={getFilterOptions(field.key)}
              />
            </Col>
          ))}
        </Row>

        <Table
          key={selectedMasterType}
          loading={loading}
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredMasters}
          rowKey={(record, index) => {
            if (!selectedMasterInfo) return `row_${index}`;
            
            // 確実にユニークなキーを生成するため、インデックスを常に含める
            const displayFields = Object.keys(selectedMasterInfo.itemCategories)
              .filter(key => selectedMasterInfo.itemCategories[key]?.isDisplay);
            
            // すべての表示フィールドの値を結合
            const keyParts = displayFields
              .map(field => String(record[field] || ''))
              .filter(Boolean)
              .join('_');
            
            // インデックスを必ず含めることで確実にユニークにする
            return `${keyParts}_${index}`;
          }}
          size="small"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `全 ${total} 件`,
          }}
          rowClassName={(record) => (record.isActive === false ? 'active-row' : 'inactive-row')}
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
        <Form form={form} layout="vertical">
          {selectedMasterInfo && Object.entries(selectedMasterInfo.itemCategories).map(([key, category]) => {
            if (!category || !category.isDisplay) return null;
            
            const isRequired = category.addable && !editingMaster;
            const isDisabled = editingMaster ? !category.update : !category.addable;

            return (
              <Form.Item
                key={key}
                name={key}
                label={category.headerName}
                rules={isRequired ? [{ required: true, message: `${category.headerName}を入力してください` }] : []}
              >
                <Input disabled={isDisabled} />
              </Form.Item>
            );
          })}
          
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
