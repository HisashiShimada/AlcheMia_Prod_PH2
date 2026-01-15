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
  Checkbox,
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
import rawMasterTypesData from '../data/master-management-master.json';
import rawRoleData from '../data/master-management-role.json';

const { Text } = Typography;

// JSONデータを型付きで取得
const masterTypesData = rawMasterTypesData as MasterTypeData[];
const roleData = rawRoleData as MasterRecord[];

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
 * ロール管理画面のモックコンポーネント
 */
export default function RoleManagementMock() {
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
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(''); // ロールフィルター
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterRecord | null>(null);
  const [form] = Form.useForm();
  
  // 機能管理モーダル用のステート（一覧から開く用）
  const [isFunctionModalVisible, setIsFunctionModalVisible] = useState(false);
  const [editingFunctionMaster, setEditingFunctionMaster] = useState<MasterRecord | null>(null);
  const [selectedFunctions, setSelectedFunctions] = useState<Record<string, boolean>>({});
  const [selectedWritePermissions, setSelectedWritePermissions] = useState<Record<string, boolean>>({});
  
  // ロール追加専用の機能管理モーダル用のステート
  const [isAddFunctionModalVisible, setIsAddFunctionModalVisible] = useState(false);
  const [addSelectedFunctions, setAddSelectedFunctions] = useState<Record<string, boolean>>({});
  const [addSelectedWritePermissions, setAddSelectedWritePermissions] = useState<Record<string, boolean>>({});

  // 利用可能な機能一覧（マスタデータ）
  const availableFunctions = useMemo(() => [
    { id: 'FUNC001', name: 'システム管理', description: '全システム管理権限', hasWritePermission: true },
    { id: 'FUNC002', name: 'ユーザー管理', description: 'ユーザーの作成・編集・削除', hasWritePermission: true },
    { id: 'FUNC003', name: 'データ管理', description: 'データマスタの管理', hasWritePermission: false, isParent: true },
    { id: 'FUNC003-1', name: '実験装置管理', description: '実験装置の登録・編集・削除', hasWritePermission: true, parentId: 'FUNC003', indent: 1 },
    { id: 'FUNC003-2', name: '実験装置ベンダー管理', description: '実験装置ベンダーの登録・編集・削除', hasWritePermission: true, parentId: 'FUNC003', indent: 1 },
    { id: 'FUNC003-3', name: '実験装置タイプ管理', description: '実験装置タイプの登録・編集・削除', hasWritePermission: true, parentId: 'FUNC003', indent: 1 },
    { id: 'FUNC004', name: '実験管理', description: '実験の管理・制御', hasWritePermission: true },
    { id: 'FUNC005', name: '作業者管理', description: '作業者の監査・指導', hasWritePermission: true },
    { id: 'FUNC006', name: '実験作業', description: '実験作業の実行', hasWritePermission: true },
    { id: 'FUNC007', name: '進捗報告', description: '作業進捗の報告', hasWritePermission: true },
    { id: 'FUNC008', name: 'データアクセス', description: '実験データのアクセス', hasWritePermission: true },
    { id: 'FUNC009', name: 'システム監視', description: 'システム状態の監視', hasWritePermission: true },
  ], []);

  // 選択されたマスタ種別の情報を取得（ロール管理固定: masterId="4"）
  const selectedMasterInfo = useMemo(() => {
    return masterTypesData.find(m => m.masterId === '4');
  }, []);

  // データの読み込み
  useEffect(() => {
    if (!selectedMasterInfo) return;

    // ローディング開始 - 一覧をクリア
    setLoading(true);
    setMasters([]);
    setSearchText('');
    setSelectedRowKeys([]);

    // localStorageからデータを読み込む
    const storageKey = `master_4`;
    const storedData = localStorage.getItem(storageKey);
    
    if (storedData) {
      // localStorageにデータがある場合は、それを使用
      try {
        const parsedData = JSON.parse(storedData);
        console.log('Loading from localStorage: ロール管理');
        setMasters(parsedData);
        setLoading(false);
        return;
      } catch (error) {
        console.error('localStorage parse error:', error);
        // エラーの場合は通常の読み込みを続行
      }
    }

    // 静的にインポートしたデータから取得
    const data = roleData;
    
    console.log('Loading master: ロール管理');
    console.log('Loaded data:', data);
    console.log('Data length:', data?.length);
    
    if (data && Array.isArray(data)) {
      // 空のオブジェクトや無効なデータをフィルタリング
      const validData = data.filter(record => {
        // recordが存在しない、またはオブジェクトでない場合は除外
        if (!record || typeof record !== 'object') {
          return false;
        }
        
        // masterIdが一致しないレコードは除外（文字列で比較）
        if (String(record.masterId) !== '4') {
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
      console.error('データが見つからないか配列ではありません');
      message.error(`マスタデータが見つかりません: ロール管理`);
      setMasters([]);
    }
    
    setLoading(false);
  }, [selectedMasterInfo]);

  // mastersが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (!selectedMasterInfo || masters.length === 0) return;
    
    const storageKey = `master_4`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(masters));
      console.log('Saved to localStorage: ロール管理', masters.length, 'records');
    } catch (error) {
      console.error('localStorage save error:', error);
    }
  }, [masters, selectedMasterInfo]);

  // searchFixedがfalseの項目を取得（曖昧検索対象）
  const fuzzySearchFields = useMemo(() => {
    // ロール管理画面の場合、機能名のみを曖昧検索対象にする
    return ['functionName'];
  }, []);

  // ロールフィルター用の選択肢を動的に生成
  const getRoleOptions = useMemo(() => {
    const uniqueRoles = Array.from(
      new Set(
        masters
          .map(m => m.role)
          .filter(v => v !== null && v !== undefined && v !== '')
      )
    );
    return uniqueRoles.sort().map(v => ({ label: String(v), value: String(v) }));
  }, [masters]);

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
      
      // テキスト検索フィルター（機能名のみ）
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || fuzzySearchFields.some(fieldKey => {
        const value = master[fieldKey];
        return value && String(value).toLowerCase().includes(searchLower);
      });

      // ロールフィルター
      const matchesRoleFilter = !selectedRoleFilter || String(master.role) === selectedRoleFilter;

      return matchesSearch && matchesRoleFilter;
    });
  }, [masters, searchText, selectedRoleFilter, fuzzySearchFields, selectedMasterInfo]);

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
        
        // 機能ID、機能名は幅を広く設定
        const isFunctionId = /function.*id/i.test(key);
        const isFunctionName = /function.*name/i.test(key);
        const isRoleName = /role.*name/i.test(key);
        const columnWidth = isFunctionId ? 460 : (isFunctionName ? 500 : (isRoleName ? 170 : 150));
        
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
            // 機能ID列の場合、色分けして表示
            if (isFunctionId) {
              // 機能IDを"/"で分割
              const functionIds = String(text || '').split('/').map(id => id.trim()).filter(Boolean);
              
              // 書込可の機能IDを取得（カンマ区切り）
              const writePermissionIds = String(record.functionWritePermissions || '').split(',').map(id => id.trim()).filter(Boolean);
              
              // 各機能IDに色を付けてレンダリング
              return (
                <span>
                  {functionIds.map((funcId, idx) => {
                    // 書込可のリストに含まれているかチェック
                    const hasWritePermission = writePermissionIds.includes(funcId);
                    // 色：書込可は緑色、読み取り専用は青色
                    const textColor = hasWritePermission ? '#52c41a' : '#1890ff';
                    
                    return (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span style={{ color: token.colorText }}> / </span>}
                        <span style={{ color: textColor, fontWeight: token.fontWeightStrong }}>{funcId}</span>
                      </React.Fragment>
                    );
                  })}
                </span>
              );
            }
            // 機能名列の場合、クリック可能にする
            if (isFunctionName) {
              // 機能IDと機能名を"/"で分割
              const functionIds = String(record.functionId || '').split('/').map(id => id.trim()).filter(Boolean);
              const functionNames = String(text || '').split('/').map(name => name.trim()).filter(Boolean);
              
              // 書込可の機能IDを取得（カンマ区切り）
              const writePermissionIds = String(record.functionWritePermissions || '').split(',').map(id => id.trim()).filter(Boolean);
              
              // 各機能にアイコンと色を付けてレンダリング
              return (
                <span
                  style={{ 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  onClick={() => handleOpenFunctionModal(record)}
                >
                  {functionNames.map((name, idx) => {
                    const funcId = functionIds[idx];
                    // 書込可のリストに含まれているかチェック
                    const hasWritePermission = funcId && writePermissionIds.includes(funcId);
                    const icon = hasWritePermission ? 'Ⓦ' : 'Ⓡ';
                    // アイコンの色：Ⓡは青色、Ⓦは緑色
                    const iconColor = hasWritePermission ? '#52c41a' : '#1890ff';
                    
                    return (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span style={{ color: token.colorText }}> / </span>}
                        <span style={{ color: iconColor, fontWeight: token.fontWeightStrong }}>{icon}</span>
                        <span style={{ color: token.colorText, fontWeight: token.fontWeightStrong }}> {name}</span>
                      </React.Fragment>
                    );
                  })}
                </span>
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
      width: 140,
      align: 'right',
      fixed: 'right',
      render: (_, record) => (
        <Flex gap="small" justify="end">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleActive(record)}
            danger={record.isActive === false}
            style={{ minWidth: '80px' }}
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

  // ロール追加
  const handleAdd = () => {
    setEditingMaster(null);
    form.resetFields();
    
    // デフォルトの機能選択なし
    setSelectedFunctions({});
    setSelectedWritePermissions({});
    
    form.setFieldsValue({
      isActive: true,
      functionId: '',
      functionName: '',
      functionWritePermissions: '',
    });
    
    setIsModalVisible(true);
  };

  // ロール編集
  const handleEdit = (master: MasterRecord) => {
    setEditingMaster(master);
    form.setFieldsValue(master);
    setIsModalVisible(true);
  };

  // 一括アクティブ化
  const handleActivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('アクティブにするロールを選択してください');
      return;
    }
    Modal.confirm({
      title: '選択したロールをアクティブにしますか？',
      content: `${selectedRowKeys.length}件のロールがアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: () => {
        setMasters(masters.map(m => {
          const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
          return selectedRowKeys.includes(String(m[idField])) ? { ...m, isActive: true } : m;
        }));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件のロールをアクティブにしました`);
      },
    });
  };

  // 一括非アクティブ化
  const handleDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非アクティブにするロールを選択してください');
      return;
    }
    Modal.confirm({
      title: '選択したロールを非アクティブにしますか？',
      content: `${selectedRowKeys.length}件のロールが非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        setMasters(masters.map(m => {
          const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
          return selectedRowKeys.includes(String(m[idField])) ? { ...m, isActive: false } : m;
        }));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件のロールを非アクティブにしました`);
      },
    });
  };

  // 個別のアクティブ/非アクティブ切り替え
  const handleToggleActive = (record: MasterRecord) => {
    const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
    const nameField = Object.keys(selectedMasterInfo?.itemCategories || {})[1];
    const masterName = record[nameField] || 'このロール';

    const actionText = record.isActive === false ? 'アクティブ' : '非アクティブ';

    Modal.confirm({
      title: `${masterName}を${actionText}にしますか？`,
      content: `このロールを${record.isActive === false ? 'アクティブ' : '非アクティブ'}状態に変更します。`,
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
    const storageKey = `master_4`;
    localStorage.removeItem(storageKey);
    console.log('Cleared localStorage:', storageKey);
    
    // 静的にインポートしたデータから取得
    const data = roleData;
    
    if (data && Array.isArray(data)) {
      // 空のオブジェクトや無効なデータをフィルタリング（useEffectと同じロジック）
      const validData = data.filter(record => {
        // recordが存在しない、またはオブジェクトでない場合は除外
        if (!record || typeof record !== 'object') {
          return false;
        }
        
        // masterIdが一致しないレコードは除外（文字列で比較）
        if (String(record.masterId) !== '4') {
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
      message.success('データをリロードしました');
    } else {
      message.error(`マスタデータが見つかりません: ロール管理`);
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
            message.success(`${newMasters.length}件のロールを追加しました`);
          } else {
            message.warning('追加するロールデータがありませんでした');
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
    link.download = `ロール管理_${timestamp}.csv`;

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
        // 編集の場合
        const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
        setMasters(masters.map(m => 
          m[idField] === editingMaster[idField] ? { ...m, ...values } : m
        ));
        message.success('ロール情報を更新しました');
      } else {
        // 新規追加の場合
        const newRecord: MasterRecord = { ...values };
        
        // ロール管理画面の場合
        newRecord.masterId = '4';
        newRecord.isActive = true;
        
        // 機能ID、機能名、書込可能機能IDを必ず含める
        newRecord.functionId = values.functionId || '';
        newRecord.functionName = values.functionName || '';
        newRecord.functionWritePermissions = values.functionWritePermissions || '';
        
        setMasters([...masters, newRecord]);
        message.success('ロールを追加しました');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setSelectedFunctions({});
      setSelectedWritePermissions({});
    } catch (error) {
      console.error('バリデーションエラー:', error);
    }
  };

  // モーダルキャンセル
  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 機能管理モーダルを開く
  const handleOpenFunctionModal = (record: MasterRecord) => {
    setEditingFunctionMaster(record);
    
    // 現在の機能IDと機能名から選択状態を復元
    const functionIds = String(record.functionId || '').split('/').map(id => id.trim()).filter(Boolean);
    const functionNames = String(record.functionName || '').split('/').map(name => name.trim()).filter(Boolean);
    
    // 書込可の機能IDを取得
    const writePermissionIds = String(record.functionWritePermissions || '').split(',').map(id => id.trim()).filter(Boolean);
    
    // 選択されている機能をマップ化
    const functionsMap: Record<string, boolean> = {};
    const writePermissionsMap: Record<string, boolean> = {};
    
    availableFunctions.forEach(func => {
      const isSelected = functionIds.includes(func.id) || functionNames.includes(func.name);
      functionsMap[func.id] = isSelected;
      // 書込可の状態を復元（保存されていない場合はデフォルトでON）
      writePermissionsMap[func.id] = isSelected && (writePermissionIds.length === 0 || writePermissionIds.includes(func.id));
    });
    
    setSelectedFunctions(functionsMap);
    setSelectedWritePermissions(writePermissionsMap);
    setIsFunctionModalVisible(true);
  };

  // 機能管理モーダルの保存
  const handleFunctionModalOk = () => {
    // 選択された機能のIDと名前、書込可の状態を取得
    const selectedFunctionIds: string[] = [];
    const selectedFunctionNames: string[] = [];
    const writePermissionIds: string[] = [];
    
    availableFunctions.forEach(func => {
      if (selectedFunctions[func.id]) {
        selectedFunctionIds.push(func.id);
        selectedFunctionNames.push(func.name);
        // 書込可がONの機能IDを記録
        if (selectedWritePermissions[func.id]) {
          writePermissionIds.push(func.id);
        }
      }
    });
    
    // 機能IDと機能名を"/"区切りで結合
    const functionId = selectedFunctionIds.join('/');
    const functionName = selectedFunctionNames.join('/');
    // 書込可の機能IDをカンマ区切りで保存
    const functionWritePermissions = writePermissionIds.join(',');
    
    // 既存のマスタを編集している場合
    if (editingFunctionMaster && selectedMasterInfo) {
      const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
      // IDフィールドが存在する場合のみマスタデータを更新（一覧からの編集）
      if (editingFunctionMaster[idField]) {
        setMasters(masters.map(m => 
          m[idField] === editingFunctionMaster[idField] 
            ? { ...m, functionId, functionName, functionWritePermissions } 
            : m
        ));
        message.success('機能を更新しました');
      } else {
        // IDフィールドがない場合は、ロール追加モーダルからの呼び出し
        // フォームの値を更新
        form.setFieldsValue({
          functionId,
          functionName,
          functionWritePermissions,
        });
      }
    }
    
    setIsFunctionModalVisible(false);
    setEditingFunctionMaster(null);
  };

  // 機能管理モーダルのキャンセル
  const handleFunctionModalCancel = () => {
    setIsFunctionModalVisible(false);
    setEditingFunctionMaster(null);
    setSelectedFunctions({});
    setSelectedWritePermissions({});
  };

  // 曖昧検索のプレースホルダーを生成
  const fuzzySearchPlaceholder = '機能名で検索';

  return (
    <div style={{ padding: 0 }}>
      {/* 操作ボタン */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 16,
        gap: 16,
      }}>
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

      {/* ロール一覧セクション */}
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
          
          {/* ロールフィルター */}
          <Col style={{ width: 150 }}>
            <Select
              placeholder="ロール"
              value={selectedRoleFilter || undefined}
              onChange={(value) => setSelectedRoleFilter(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={getRoleOptions}
            />
          </Col>
        </Row>

        <Table
          loading={loading}
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredMasters}
          rowKey={(record, index) => {
            if (!selectedMasterInfo) return `row_${index}`;
            
            const displayFields = Object.keys(selectedMasterInfo.itemCategories)
              .filter(key => selectedMasterInfo.itemCategories[key]?.isDisplay);
            
            const keyParts = displayFields
              .map(field => String(record[field] || ''))
              .filter(Boolean)
              .join('_');
            
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

      {/* 機能管理モーダル */}
      <Modal
        title={<div style={{ textAlign: 'center' }}>機能管理</div>}
        open={isFunctionModalVisible}
        onCancel={handleFunctionModalCancel}
        width={500}
        styles={{
          body: { padding: '16px 0' }
        }}
        footer={
          <Flex gap="middle" justify="center" style={{ width: '100%' }}>
            <Button 
              style={{ width: '160px' }}
              onClick={handleFunctionModalCancel}
            >
              キャンセル
            </Button>
            <Button 
              type="primary"
              style={{ width: '160px' }}
              onClick={handleFunctionModalOk}
            >
              機能を更新
            </Button>
          </Flex>
        }
      >
        <div>
          <Row gutter={[16, 16]}>
            {availableFunctions.map((func, index) => {
              const indentStyle = func.indent ? { marginLeft: func.indent * 24 } : {};
              const showWritePermission = func.hasWritePermission !== false;
              
              const parentId = func.parentId;
              const isParentChecked = parentId ? selectedFunctions[parentId] || false : true;
              const isDisabled = !isParentChecked;
              
              const isLast = index === availableFunctions.length - 1;
              
              return (
                <Col 
                  span={24} 
                  key={func.id}
                  style={{ 
                    borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
                    paddingBottom: isLast ? 0 : 8
                  }}
                >
                  <Row gutter={8} justify="center" style={{ marginLeft: -40 }}>
                    <Col span={12}>
                      <div style={indentStyle}>
                        <Checkbox
                          checked={selectedFunctions[func.id] || false}
                          disabled={isDisabled}
                          onChange={(e) => {
                            const newSelectedFunctions = {
                              ...selectedFunctions,
                              [func.id]: e.target.checked,
                            };
                            
                            if (!e.target.checked) {
                              setSelectedWritePermissions(prev => ({
                                ...prev,
                                [func.id]: false,
                              }));
                              
                              if (func.isParent) {
                                availableFunctions.forEach(childFunc => {
                                  if (childFunc.parentId === func.id) {
                                    newSelectedFunctions[childFunc.id] = false;
                                    setSelectedWritePermissions(prev => ({
                                      ...prev,
                                      [childFunc.id]: false,
                                    }));
                                  }
                                });
                              }
                            }
                            
                            setSelectedFunctions(newSelectedFunctions);
                            
                            if (e.target.checked && showWritePermission) {
                              setSelectedWritePermissions({
                                ...selectedWritePermissions,
                                [func.id]: true,
                              });
                            }
                          }}
                          style={{ 
                            fontSize: token.fontSize,
                            fontWeight: token.fontWeightStrong,
                          }}
                        >
                          {func.name}
                        </Checkbox>
                        <div style={{ 
                          marginLeft: 24,
                          color: token.colorTextSecondary,
                          fontSize: token.fontSizeSM,
                          whiteSpace: 'nowrap',
                        }}>
                          {func.description}
                        </div>
                      </div>
                    </Col>
                    <Col span={4} style={{ marginLeft: 50 }}>
                      {showWritePermission && (
                        <Checkbox
                          checked={selectedWritePermissions[func.id] || false}
                          disabled={!selectedFunctions[func.id]}
                          onChange={(e) => {
                            setSelectedWritePermissions({
                              ...selectedWritePermissions,
                              [func.id]: e.target.checked,
                            });
                          }}
                          style={{ 
                            whiteSpace: 'nowrap',
                            color: selectedWritePermissions[func.id] ? '#52c41a' : '#1890ff',
                          }}
                          className={selectedWritePermissions[func.id] ? 'write-permission-checked' : 'write-permission-unchecked'}
                        >
                          書込可
                        </Checkbox>
                      )}
                    </Col>
                  </Row>
                </Col>
              );
            })}
          </Row>
        </div>
      </Modal>

      {/* ロール追加専用の機能管理モーダル */}
      <Modal
        title={<div style={{ textAlign: 'center' }}>機能管理</div>}
        open={isAddFunctionModalVisible}
        onCancel={() => {
          setIsAddFunctionModalVisible(false);
          setAddSelectedFunctions({});
          setAddSelectedWritePermissions({});
        }}
        width={500}
        styles={{
          body: { padding: '16px 0' }
        }}
        footer={
          <Flex gap="middle" justify="center" style={{ width: '100%' }}>
            <Button 
              style={{ width: '160px' }}
              onClick={() => {
                setIsAddFunctionModalVisible(false);
                setAddSelectedFunctions({});
                setAddSelectedWritePermissions({});
              }}
            >
              キャンセル
            </Button>
            <Button 
              type="primary"
              style={{ width: '160px' }}
              onClick={() => {
                const selectedFunctionIds: string[] = [];
                const selectedFunctionNames: string[] = [];
                const writePermissionIds: string[] = [];
                
                availableFunctions.forEach(func => {
                  if (addSelectedFunctions[func.id]) {
                    selectedFunctionIds.push(func.id);
                    selectedFunctionNames.push(func.name);
                    if (addSelectedWritePermissions[func.id]) {
                      writePermissionIds.push(func.id);
                    }
                  }
                });
                
                const functionId = selectedFunctionIds.join('/');
                const functionName = selectedFunctionNames.join('/');
                const functionWritePermissions = writePermissionIds.join(',');
                
                form.setFieldsValue({
                  functionId,
                  functionName,
                  functionWritePermissions,
                });
                
                setIsAddFunctionModalVisible(false);
              }}
            >
              機能を更新
            </Button>
          </Flex>
        }
      >
        <div>
          <Row gutter={[16, 16]}>
            {availableFunctions.map((func, index) => {
              const indentStyle = func.indent ? { marginLeft: func.indent * 24 } : {};
              const showWritePermission = func.hasWritePermission !== false;
              
              const parentId = func.parentId;
              const isParentChecked = parentId ? addSelectedFunctions[parentId] || false : true;
              const isDisabled = !isParentChecked;
              
              const isLast = index === availableFunctions.length - 1;
              
              return (
                <Col 
                  span={24} 
                  key={func.id}
                  style={{ 
                    borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
                    paddingBottom: isLast ? 0 : 8
                  }}
                >
                  <Row gutter={8} justify="center" style={{ marginLeft: -40 }}>
                    <Col span={12}>
                      <div style={indentStyle}>
                        <Checkbox
                          checked={addSelectedFunctions[func.id] || false}
                          disabled={isDisabled}
                          onChange={(e) => {
                            const newSelectedFunctions = {
                              ...addSelectedFunctions,
                              [func.id]: e.target.checked,
                            };
                            
                            if (!e.target.checked) {
                              setAddSelectedWritePermissions(prev => ({
                                ...prev,
                                [func.id]: false,
                              }));
                              
                              if (func.isParent) {
                                availableFunctions.forEach(childFunc => {
                                  if (childFunc.parentId === func.id) {
                                    newSelectedFunctions[childFunc.id] = false;
                                    setAddSelectedWritePermissions(prev => ({
                                      ...prev,
                                      [childFunc.id]: false,
                                    }));
                                  }
                                });
                              }
                            }
                            
                            setAddSelectedFunctions(newSelectedFunctions);
                            
                            if (e.target.checked && showWritePermission) {
                              setAddSelectedWritePermissions({
                                ...addSelectedWritePermissions,
                                [func.id]: true,
                              });
                            }
                          }}
                          style={{ 
                            fontSize: token.fontSize,
                            fontWeight: token.fontWeightStrong,
                          }}
                        >
                          {func.name}
                        </Checkbox>
                        <div style={{ 
                          marginLeft: 24,
                          color: token.colorTextSecondary,
                          fontSize: token.fontSizeSM,
                          whiteSpace: 'nowrap',
                        }}>
                          {func.description}
                        </div>
                      </div>
                    </Col>
                    <Col span={4} style={{ marginLeft: 50 }}>
                      {showWritePermission && (
                        <Checkbox
                          checked={addSelectedWritePermissions[func.id] || false}
                          disabled={!addSelectedFunctions[func.id]}
                          onChange={(e) => {
                            setAddSelectedWritePermissions({
                              ...addSelectedWritePermissions,
                              [func.id]: e.target.checked,
                            });
                          }}
                          style={{ 
                            whiteSpace: 'nowrap',
                            color: addSelectedWritePermissions[func.id] ? '#52c41a' : '#1890ff',
                          }}
                          className={addSelectedWritePermissions[func.id] ? 'write-permission-checked' : 'write-permission-unchecked'}
                        >
                          書込可
                        </Checkbox>
                      )}
                    </Col>
                  </Row>
                </Col>
              );
            })}
          </Row>
        </div>
      </Modal>

      {/* ロール追加/編集モーダル */}
      <Modal
        title={editingMaster ? 'ロール編集' : 'ロール追加'}
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
            
            if (key === 'functionId' || key === 'functionName' || key === 'functionWritePermissions') {
              return null;
            }
            
            if (key === 'role' || key === 'roleName') {
              return (
                <Form.Item
                  key={key}
                  name={key}
                  label={category.headerName}
                  rules={[{ required: true, message: `${category.headerName}を入力してください` }]}
                >
                  <Input placeholder={`${category.headerName}を入力してください`} />
                </Form.Item>
              );
            }
            
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
          
          {/* ロール追加時のみ機能名フィールドを表示 */}
          {!editingMaster && (
            <Form.Item 
              name="functionName" 
              label="機能名"
              rules={[{ required: true, message: '機能名を選択してください' }]}
            >
              <div
                style={{ 
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  padding: '4px 11px',
                  minHeight: '32px',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={() => {
                  const functionIds = String(form.getFieldValue('functionId') || '').split('/').map(id => id.trim()).filter(Boolean);
                  const writePermissionIds = String(form.getFieldValue('functionWritePermissions') || '').split(',').map(id => id.trim()).filter(Boolean);
                  
                  const functionsMap: Record<string, boolean> = {};
                  const writePermissionsMap: Record<string, boolean> = {};
                  
                  availableFunctions.forEach(func => {
                    const isSelected = functionIds.includes(func.id);
                    functionsMap[func.id] = isSelected;
                    writePermissionsMap[func.id] = isSelected && writePermissionIds.includes(func.id);
                  });
                  
                  setAddSelectedFunctions(functionsMap);
                  setAddSelectedWritePermissions(writePermissionsMap);
                  setIsAddFunctionModalVisible(true);
                }}
              >
                {(() => {
                  const functionIds = String(form.getFieldValue('functionId') || '').split('/').map(id => id.trim()).filter(Boolean);
                  const functionNames = String(form.getFieldValue('functionName') || '').split('/').map(name => name.trim()).filter(Boolean);
                  const writePermissionIds = String(form.getFieldValue('functionWritePermissions') || '').split(',').map(id => id.trim()).filter(Boolean);
                  
                  if (functionNames.length === 0) {
                    return <span style={{ color: '#bfbfbf' }}>機能を選択してください</span>;
                  }
                  
                  return (
                    <span>
                      {functionNames.map((name, idx) => {
                        const funcId = functionIds[idx];
                        const hasWritePermission = funcId && writePermissionIds.includes(funcId);
                        const icon = hasWritePermission ? 'Ⓦ' : 'Ⓡ';
                        const iconColor = hasWritePermission ? '#52c41a' : '#1890ff';
                        
                        return (
                          <React.Fragment key={idx}>
                            {idx > 0 && <span style={{ color: token.colorText }}> / </span>}
                            <span style={{ color: iconColor, fontWeight: token.fontWeightStrong }}>{icon}</span>
                            <span style={{ color: token.colorText, fontWeight: token.fontWeightStrong }}> {name}</span>
                          </React.Fragment>
                        );
                      })}
                    </span>
                  );
                })()}
              </div>
            </Form.Item>
          )}
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
        
        .write-permission-checked .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #52c41a !important;
          border-color: #52c41a !important;
        }
        .write-permission-checked .ant-checkbox-checked:hover .ant-checkbox-inner {
          background-color: #73d13d !important;
          border-color: #73d13d !important;
        }
        
        .write-permission-unchecked .ant-checkbox-inner {
          border-color: #1890ff !important;
        }
        .write-permission-unchecked .ant-checkbox:hover .ant-checkbox-inner {
          border-color: #40a9ff !important;
        }
        
        .write-permission-checked .ant-checkbox-disabled .ant-checkbox-inner,
        .write-permission-unchecked .ant-checkbox-disabled .ant-checkbox-inner {
          background-color: #f5f5f5 !important;
          border-color: #d9d9d9 !important;
        }
        .write-permission-checked.ant-checkbox-wrapper-disabled,
        .write-permission-unchecked.ant-checkbox-wrapper-disabled {
          color: rgba(0, 0, 0, 0.25) !important;
        }
      `}</style>
    </div>
  );
}
