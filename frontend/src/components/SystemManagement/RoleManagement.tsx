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
import { formatDateTime } from '@/utils/dateFormatter';
import { getMasterConfigById } from '@/config/masterConfig';

const { Text } = Typography;

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
 * APIレスポンスのロールデータ型定義
 */
interface RoleApiResponse {
  roleId: string;
  roleName: string;
  functionName: string;
  functionWritePermissions: string;
  isActive: boolean;
  updatedAt: string;
}

/**
 * ロール管理画面のモックコンポーネント
 */
export default function RoleManagementMock() {
  const { token } = theme.useToken();

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

  // ロールマスタをAPIから取得する関数
  const fetchRoleMasters = async () => {
    try {
      setLoading(true);
      
      // APIエンドポイント
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = `${apiUrl}/api/v1/master/role`;
      
      console.log('=== Fetching Role Masters ===');
      console.log('API URL:', apiUrl);
      console.log('Endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // X-Organization-Idヘッダーは不要（JWTから自動取得）
        },
        credentials: 'include',
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success && Array.isArray(result.data)) {
        // APIレスポンスをフロントエンド用のデータ形式に変換
        const convertedData = result.data.map((item: RoleApiResponse) => ({
          masterId: '4',
          role: item.roleId,
          roleName: item.roleName,
          functionName: item.functionName,
          functionWritePermissions: item.functionWritePermissions,
          isActive: item.isActive,
          updatedAt: item.updatedAt,
        }));
        
        setMasters(convertedData);
        setSearchText('');
        setSelectedRowKeys([]);
        console.log('Loaded from API:', convertedData.length, 'records');
      } else {
        console.error('Unexpected API response structure:', result);
        message.error('ロールマスタの取得に失敗しました（データ形式エラー）');
        setMasters([]);
      }
    } catch (error) {
      console.error('API fetch error:', error);
      message.error(`ロールマスタの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };

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
    const config = getMasterConfigById('4');
    if (!config) return undefined;
    
    // 古い構造（itemCategories）に変換して互換性を保つ
    const itemCategories: Record<string, ItemCategory | undefined> = {};
    config.fields.forEach(field => {
      itemCategories[field.dbField] = {
        headerName: field.displayName,
        searchFixed: field.searchFixed,
        isDisplay: field.isDisplay,
        addable: field.addable,
        update: field.update,
      };
    });
    
    return {
      masterId: config.masterId,
      role: '', // 旧構造との互換性のため
      relationData: '', // 旧構造との互換性のため
      displayName: config.displayName,
      itemCategories,
      isActive: true,
    };
  }, []);

  // データの読み込み
  useEffect(() => {
    if (!selectedMasterInfo) return;
    fetchRoleMasters();
  }, [selectedMasterInfo]);

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

    const dynamicColumns = Object.entries(
      selectedMasterInfo.itemCategories
    )
      .filter(([_, category]) => category && category.isDisplay)
      .map(([key, category], index) => {
        // 機能ID列はスキップ（非表示）
        if (/function.*id/i.test(key)) {
          return null;
        }
        
        // すべてのフィールドを左寄せ
        const align = 'left' as const;
        
        // 機能名は幅を広く設定
        const isFunctionName = /function.*name/i.test(key);
        const isRoleName = /role.*name/i.test(key);
        const columnWidth = isFunctionName ? 800 : (isRoleName ? 170 : 150);
        
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
            // 機能名列の場合、クリック可能にする
            if (isFunctionName) {
              const functionNames = String(text || '').split('/').map(name => name.trim()).filter(Boolean);
              
              // 書込可の機能名を取得（"/"区切り）
              const writePermissionNames = String(record.functionWritePermissions || '').split('/').map(name => name.trim()).filter(Boolean);
              
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
                    // 書込可のリストに含まれているかチェック
                    const hasWritePermission = writePermissionNames.includes(name);
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
      })
      .filter((col): col is NonNullable<typeof col> => col !== null) as ColumnsType<MasterRecord>; // nullを除外して型を保証

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
    fetchRoleMasters();
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
    
    // 現在の機能名から選択状態を復元
    const functionNames = String(record.functionName || '').split('/').map(name => name.trim()).filter(Boolean);
    
    // 書込可の機能名を取得（"/"区切り）
    const writePermissionNames = String(record.functionWritePermissions || '').split('/').map(name => name.trim()).filter(Boolean);
    
    // 選択されている機能をマップ化
    const functionsMap: Record<string, boolean> = {};
    const writePermissionsMap: Record<string, boolean> = {};
    
    availableFunctions.forEach(func => {
      const isSelected = functionNames.includes(func.name);
      functionsMap[func.id] = isSelected;
      // 書込可の状態を復元
      writePermissionsMap[func.id] = isSelected && writePermissionNames.includes(func.name);
    });
    
    setSelectedFunctions(functionsMap);
    setSelectedWritePermissions(writePermissionsMap);
    setIsFunctionModalVisible(true);
  };

  // 機能管理モーダルの保存
  const handleFunctionModalOk = () => {
    // 選択された機能の名前と書込可の状態を取得
    const selectedFunctionNames: string[] = [];
    const writePermissionNames: string[] = [];
    
    availableFunctions.forEach(func => {
      if (selectedFunctions[func.id]) {
        selectedFunctionNames.push(func.name);
        // 書込可がONの機能名を記録
        if (selectedWritePermissions[func.id]) {
          writePermissionNames.push(func.name);
        }
      }
    });
    
    // 機能名を"/"区切りで結合
    const functionName = selectedFunctionNames.join('/');
    // 書込可の機能名を"/"区切りで保存
    const functionWritePermissions = writePermissionNames.join('/');
    
    // 既存のマスタを編集している場合
    if (editingFunctionMaster && selectedMasterInfo) {
      const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
      // IDフィールドが存在する場合のみマスタデータを更新（一覧からの編集）
      if (editingFunctionMaster[idField]) {
        setMasters(masters.map(m => 
          m[idField] === editingFunctionMaster[idField] 
            ? { ...m, functionName, functionWritePermissions } 
            : m
        ));
        message.success('機能を更新しました');
      } else {
        // IDフィールドがない場合は、ロール追加モーダルからの呼び出し
        // フォームの値を更新
        form.setFieldsValue({
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
          rowKey={(record) => {
            if (!selectedMasterInfo) return String(Math.random());
            
            // IDフィールド（最初のフィールド）の値を使用
            const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
            return String(record[idField] || Math.random());
          }}
          size="small"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `全 ${total} 件`,
          }}
        />
      </div>

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
          {selectedMasterInfo && Object.entries(selectedMasterInfo.itemCategories).map(([key, category], index) => {
            if (!category || !category.isDisplay) return null;
            
            // 機能ID、機能名、書込可能機能IDを除外
            if (key === 'functionId' || key === 'functionName' || key === 'functionWritePermissions') {
              return null;
            }
            
            // ロールIDとロール名は常に編集可能
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

            return null;
          })}
          
          {/* 状態フィールドを表示 */}
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

      {/* 機能管理モーダル */}
      <Modal
        title="機能管理"
        open={isFunctionModalVisible}
        onOk={handleFunctionModalOk}
        onCancel={handleFunctionModalCancel}
        width={800}
        okText="保存"
        cancelText="キャンセル"
      >
        <div>
          {availableFunctions.map(func => {
            const indent = func.indent || 0;
            const isParent = func.isParent || false;
            const hasWritePermission = func.hasWritePermission || false;
            
            return (
              <div key={func.id} style={{ marginBottom: 8, marginLeft: indent * 20 }}>
                <Checkbox
                  checked={selectedFunctions[func.id] || false}
                  onChange={(e) => {
                    setSelectedFunctions({
                      ...selectedFunctions,
                      [func.id]: e.target.checked,
                    });
                    // チェックが外れた場合、書込可もOFFにする
                    if (!e.target.checked) {
                      setSelectedWritePermissions({
                        ...selectedWritePermissions,
                        [func.id]: false,
                      });
                    }
                  }}
                  disabled={isParent}
                >
                  <Text strong={isParent}>{func.name}</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {func.description}
                  </Text>
                </Checkbox>
                
                {hasWritePermission && !isParent && (
                  <Checkbox
                    checked={selectedWritePermissions[func.id] || false}
                    onChange={(e) => {
                      setSelectedWritePermissions({
                        ...selectedWritePermissions,
                        [func.id]: e.target.checked,
                      });
                      // 書込可がONになった場合、機能も自動的にONにする
                      if (e.target.checked && !selectedFunctions[func.id]) {
                        setSelectedFunctions({
                          ...selectedFunctions,
                          [func.id]: true,
                        });
                      }
                    }}
                    disabled={!selectedFunctions[func.id]}
                    style={{ marginLeft: 16 }}
                  >
                    書込可
                  </Checkbox>
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

