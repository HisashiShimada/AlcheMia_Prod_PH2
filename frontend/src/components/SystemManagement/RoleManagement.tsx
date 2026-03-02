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
  App,
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
import { getRoleConfig } from '@/types/roleTypes';
import { getMenuPermission } from '@/utils/menuPermissions';
import type { RoleConfig, FieldConfig } from '@/types/roleTypes';
import {
  fetchMasters,
  createMaster,
  updateMaster,
  updateMasterStatus,
  batchUpdateMasterStatus,
  uploadCsv,
  downloadCsv,
  createRole,
  updateRole,
  updateRolePermissions,
  type MasterRecord as ApiMasterRecord,
} from '@/services/roleApiService';
import FunctionPermissionDialog from './FunctionPermissionDialog';

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
 * ロール管理画面のコンポーネント
 */
export default function RoleManagementMock() {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();

  // 権限制御: system_admin メニュー（機能CD: 020000）の permission が 0 の場合は読取専用
  const isReadOnly = getMenuPermission('system_admin') === 0;

  // State管理
  const [masters, setMasters] = useState<MasterRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRoleNameFilter, setSelectedRoleNameFilter] = useState<string>(''); // ロール名フィルター
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterRecord | null>(null);
  const [form] = Form.useForm();
  
  // 機能管理ダイアログ用のステート
  const [isFunctionModalVisible, setIsFunctionModalVisible] = useState(false);
  const [editingFunctionMaster, setEditingFunctionMaster] = useState<MasterRecord | null>(null);
  const [functionDialogMode, setFunctionDialogMode] = useState<'direct' | 'temporary'>('temporary');
  
  // 機能名と権限を一時保持するステート（保存ボタン押下までメモリに保持）
  const [tempFunctionData, setTempFunctionData] = useState<{
    functionName: string;              // 表示用（権限アイコン付き）
    apiFunctionNames: string;          // API用（権限アイコンなし）
    functionWritePermissions: string;
  } | null>(null);

  // ロールマスタをAPIから取得する関数
  const fetchRoleMasters = async () => {
    try {
      setLoading(true);
      
      const data = await fetchMasters();
      
      // APIレスポンスをフロントエンド用のデータ形式に変換
      const convertedData = data.map((item: ApiMasterRecord) => ({
        masterId: '4',
        role: item.roleId || item.role,
        roleName: item.roleName,
        functionName: item.functionName,
        initialScreenFunctionName: item.initialScreenFunctionName || null,  // 初期画面機能名
        functionWritePermissions: item.functionWritePermissions,
        functions: item.functions || [],  // バックエンドから受け取った機能情報配列
        functionIds: item.functionIds || [],  // 機能IDリスト（role_permissionテーブルから取得）
        writableFunctionIds: item.writableFunctionIds || [],  // 書込可能な機能IDリスト
        isActive: item.isActive,
        updatedAt: item.updatedAt,
      }));
      
      setMasters(convertedData);
      setSearchText('');
      setSelectedRowKeys([]);
      console.log('Loaded from API:', convertedData.length, 'records');
    } catch (error) {
      console.error('API fetch error:', error);
      message.error(`ロールマスタの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };


  // 選択されたマスタ種別の情報を取得（ロール管理固定: masterId="4"）
  const selectedMasterInfo = useMemo(() => {
    const config = getRoleConfig();
    
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

  // ロール名フィルター用の選択肢を動的に生成
  const getRoleNameOptions = useMemo(() => {
    // ロール名の表示順序を定義
    const roleOrder = [
      'プロバイダー',
      'システム管理者',
      'データ管理者',
      '実験管理者',
      '実験作業者',
      'MI技術者',
    ];

    const uniqueRoleNames = Array.from(
      new Set(
        masters
          .map(m => m.roleName)
          .filter(v => v !== null && v !== undefined && v !== '')
      )
    );

    // カスタム順序でソート
    return uniqueRoleNames
      .sort((a, b) => {
        const indexA = roleOrder.indexOf(String(a));
        const indexB = roleOrder.indexOf(String(b));
        
        // 両方が定義済みの場合は順序配列に従う
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        // 一方だけが定義済みの場合は定義済みを優先
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        // 両方とも定義外の場合は五十音順
        return String(a).localeCompare(String(b), 'ja');
      })
      .map(v => ({ label: String(v), value: String(v) }));
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

      // ロール名フィルター
      const matchesRoleNameFilter = !selectedRoleNameFilter || String(master.roleName) === selectedRoleNameFilter;

      return matchesSearch && matchesRoleNameFilter;
    });
  }, [masters, searchText, selectedRoleNameFilter, fuzzySearchFields, selectedMasterInfo]);

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
        
        // カラム幅の設定
        const isFunctionName = key === 'functionName';
        const isInitialScreenFunctionName = key === 'initialScreenFunctionName';
        const isRoleName = /role.*name/i.test(key);
        
        // 初期画面機能名: 225px (150 * 1.5)、機能名: 600px、ロール名: 170px、その他: 150px
        const columnWidth = isFunctionName ? 600 : 
                           isInitialScreenFunctionName ? 225 : 
                           (isRoleName ? 170 : 150);
        
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
              // バックエンドから受け取ったfunctions配列を使用
              const functions = (record.functions as Array<{ name: string; icon: string; color: string }>) || [];
              const isActive = record.isActive !== false;  // アクティブかどうか判定
              
              return (
                <span
                  style={{ 
                    cursor: (isActive && !isReadOnly) ? 'pointer' : 'not-allowed',
                    // 機能が設定されていて、かつアクティブかつ書込可の場合のみ下線を表示
                    textDecoration: (functions.length > 0 && isActive && !isReadOnly) ? 'underline' : 'none',
                    color: isActive ? undefined : token.colorTextDisabled,
                  }}
                  onClick={(isActive && !isReadOnly) ? () => handleOpenFunctionModalDirect(record) : undefined}
                >
                  {functions.length === 0 ? (
                    // 機能が設定されていない場合は「－」を表示（下線なし）
                    <span style={{ color: isActive ? token.colorTextSecondary : token.colorTextDisabled }}>－</span>
                  ) : (
                    // 機能が設定されている場合は従来通り表示（下線あり）
                    functions.map((func, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span style={{ color: isActive ? token.colorText : token.colorTextDisabled }}> / </span>}
                        <span style={{ 
                          color: isActive ? func.color : token.colorTextDisabled, 
                          fontWeight: token.fontWeightStrong 
                        }}>{func.icon}</span>
                        <span style={{ 
                          color: isActive ? token.colorText : token.colorTextDisabled, 
                          fontWeight: token.fontWeightStrong 
                        }}> {func.name}</span>
                      </React.Fragment>
                    ))
                  )}
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
      onCell: (record) => ({
        style: {
          backgroundColor: record.isActive === false ? '#D3D3D3' : undefined,
        },
      }),
      render: (_, record) => {
        const isActive = record.isActive !== false;
        return (
          <Flex gap="small" justify="end">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={isReadOnly}
            >
              編集
            </Button>
            <Button
              size="small"
              onClick={() => handleToggleActive(record)}
              danger={!isReadOnly && isActive}
              style={{ 
                minWidth: '80px',
                color: (!isReadOnly && isActive) ? token.colorError : token.colorText
              }}
              disabled={isReadOnly}
            >
              {isActive ? '非アクティブ' : 'アクティブ'}
            </Button>
          </Flex>
        );
      },
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
    setTempFunctionData(null); // メモリをクリア
    
    form.setFieldsValue({
      isActive: true,
      functionId: '',
      functionName: '－',
      functionWritePermissions: '',
    });
    
    setIsModalVisible(true);
  };

  // ロール編集
  const handleEdit = (master: MasterRecord) => {
    setEditingMaster(master);
    form.setFieldsValue(master);
    setTempFunctionData(null); // メモリをクリア
    setIsModalVisible(true);
  };

  // 機能名の選択肢を生成（コンポーネントのトップレベルで定義）
  const functionOptions = useMemo(() => {
    // 機能管理ダイアログで選択した機能がメモリにある場合、それを使用
    if (tempFunctionData && tempFunctionData.apiFunctionNames && tempFunctionData.apiFunctionNames !== '－') {
      // apiFunctionNames（権限アイコンなし）を使用
      const functionNames = tempFunctionData.apiFunctionNames
        .split('/')
        .map(name => name.trim())
        .filter(name => name !== '');
      
      return functionNames.map(name => ({ 
        label: name, 
        value: name 
      }));
    }
    
    // メモリにない場合は、editingMaster.functionsを使用（従来の処理）
    if (!editingMaster || !editingMaster.functions) return [];
    const functions = editingMaster.functions as Array<{ name: string }>;
    return functions.map(func => ({ 
      label: func.name, 
      value: func.name 
    }));
  }, [editingMaster, tempFunctionData]);

  // 一括アクティブ化
  const handleActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('アクティブにするロールを選択してください');
      return;
    }
    modal.confirm({
      title: '選択したロールをアクティブにしますか？',
      content: `${selectedRowKeys.length}件のロールがアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          await batchUpdateMasterStatus(selectedRowKeys.map(String), true);
          await fetchRoleMasters();
          setSelectedRowKeys([]);
          message.success(`${selectedRowKeys.length}件のロールをアクティブにしました`);
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
      message.warning('非アクティブにするロールを選択してください');
      return;
    }
    modal.confirm({
      title: '選択したロールを非アクティブにしますか？',
      content: `${selectedRowKeys.length}件のロールが非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchUpdateMasterStatus(selectedRowKeys.map(String), false);
          await fetchRoleMasters();
          setSelectedRowKeys([]);
          message.success(`${selectedRowKeys.length}件のロールを非アクティブにしました`);
        } catch (error) {
          console.error('エラー:', error);
          message.error(error instanceof Error ? error.message : 'エラーが発生しました');
        }
      },
    });
  };

  // 個別のアクティブ/非アクティブ切り替え
  const handleToggleActive = async (record: MasterRecord) => {
    const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
    const nameField = Object.keys(selectedMasterInfo?.itemCategories || {})[1];
    const masterName = record[nameField] || 'このロール';
    const currentStatus = record.isActive !== false;
    const actionText = currentStatus ? '非アクティブ' : 'アクティブ';
    const newStatus = !currentStatus;

    modal.confirm({
      title: `${masterName}を${actionText}にしますか？`,
      content: `このロールを${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: actionText === '非アクティブ' ? { danger: true } : undefined,
      onOk: async () => {
        try {
          await updateMasterStatus(String(record[idField]), newStatus);
          await fetchRoleMasters();
          message.success(`${masterName}を${actionText}にしました`);
        } catch (error) {
          console.error('エラー:', error);
          message.error(error instanceof Error ? error.message : 'エラーが発生しました');
        }
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

  // CSVファイルをAPIにアップロード
  const handleCSVUpload = async (file: File) => {
    if (!selectedMasterInfo) return;

    try {
      setLoading(true);
      
      // APIを呼び出してCSVをアップロード
      await uploadCsv(file);
      
      // アップロード成功後、データを再取得
      await fetchRoleMasters();
      
      message.success('CSVをアップロードしました');
    } catch (error) {
      console.error('CSVアップロードエラー:', error);
      message.error(error instanceof Error ? error.message : 'CSVアップロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // CSVダウンロード
  const handleDownload = async () => {
    if (!selectedMasterInfo) return;

    try {
      // APIを通じてCSVダウンロード（バックエンドのファイル名を使用）
      await downloadCsv({
        searchText,
        roleNameFilter: selectedRoleNameFilter,
      });
      message.success('CSVファイルをダウンロードしました');
    } catch (error) {
      console.error('CSVダウンロードエラー:', error);
      message.error(error instanceof Error ? error.message : 'CSVダウンロードに失敗しました');
    }
  };

  // モーダルOK
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingMaster) {
        // === 編集の場合 ===
        const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
        const roleId = String(editingMaster[idField]);
        
        // === ケース1・ケース2のチェック（「保存」ボタン用） ===
        let finalInitialScreenFunctionName = values.initialScreenFunctionName || null;
        
        // メモリに機能情報がある場合、チェックを実行
        if (tempFunctionData) {
          console.log('=== handleModalOk: Initial Screen Check (Edit Mode) ===');
          console.log('tempFunctionData:', tempFunctionData);
          console.log('Current initialScreenFunctionName from form:', values.initialScreenFunctionName);
          
          let shouldClearInitialScreen = false;
          
          // ケース1: 機能が1つも選択されていない
          if (!tempFunctionData.apiFunctionNames || 
              tempFunctionData.apiFunctionNames === '－' ||
              tempFunctionData.apiFunctionNames.trim() === '') {
            shouldClearInitialScreen = true;
            console.log('Case 1: No functions selected');
          }
          
          // ケース2: 初期画面機能名が選択された機能リストに含まれていない
          if (!shouldClearInitialScreen && values.initialScreenFunctionName) {
            const selectedFunctionList = tempFunctionData.apiFunctionNames
              .split('/')
              .map(name => name.trim())
              .filter(name => name !== '' && name !== '－');
            
            console.log('Selected function list:', selectedFunctionList);
            console.log('Initial screen function name:', values.initialScreenFunctionName);
            console.log('Is included:', selectedFunctionList.includes(values.initialScreenFunctionName));
            
            if (!selectedFunctionList.includes(values.initialScreenFunctionName)) {
              shouldClearInitialScreen = true;
              console.log('Case 2: Initial screen function not in selected list');
            }
          }
          
          // 初期画面機能名をnullに設定
          if (shouldClearInitialScreen) {
            finalInitialScreenFunctionName = null;
            console.log('Clearing initial screen function name');
          }
        }
        
        // 1. ロールテーブルを更新
        await updateRole(roleId, {
          roleName: values.roleName,
          initialScreenFunctionName: finalInitialScreenFunctionName,
          isActive: values.isActive,
        });
        
        // 2. メモリに保存された機能情報があれば権限も更新
        if (tempFunctionData && tempFunctionData.apiFunctionNames !== '－') {
          await updateRolePermissions(
            roleId,
            tempFunctionData.apiFunctionNames,
            tempFunctionData.functionWritePermissions
          );
        }
        
        await fetchRoleMasters();
        message.success('ロール情報を更新しました');
      } else {
        // === 新規追加の場合 ===
        
        // === ケース1・ケース2のチェック（「保存」ボタン用） ===
        let finalInitialScreenFunctionName = values.initialScreenFunctionName || null;
        
        // メモリに機能情報がある場合、チェックを実行
        if (tempFunctionData) {
          console.log('=== handleModalOk: Initial Screen Check (Create Mode) ===');
          console.log('tempFunctionData:', tempFunctionData);
          console.log('Current initialScreenFunctionName from form:', values.initialScreenFunctionName);
          
          let shouldClearInitialScreen = false;
          
          // ケース1: 機能が1つも選択されていない
          if (!tempFunctionData.apiFunctionNames || 
              tempFunctionData.apiFunctionNames === '－' ||
              tempFunctionData.apiFunctionNames.trim() === '') {
            shouldClearInitialScreen = true;
            console.log('Case 1: No functions selected');
          }
          
          // ケース2: 初期画面機能名が選択された機能リストに含まれていない
          if (!shouldClearInitialScreen && values.initialScreenFunctionName) {
            const selectedFunctionList = tempFunctionData.apiFunctionNames
              .split('/')
              .map(name => name.trim())
              .filter(name => name !== '' && name !== '－');
            
            console.log('Selected function list:', selectedFunctionList);
            console.log('Initial screen function name:', values.initialScreenFunctionName);
            console.log('Is included:', selectedFunctionList.includes(values.initialScreenFunctionName));
            
            if (!selectedFunctionList.includes(values.initialScreenFunctionName)) {
              shouldClearInitialScreen = true;
              console.log('Case 2: Initial screen function not in selected list');
            }
          }
          
          // 初期画面機能名をnullに設定
          if (shouldClearInitialScreen) {
            finalInitialScreenFunctionName = null;
            console.log('Clearing initial screen function name');
          }
        }
        
        // 1. ロールテーブルに追加
        await createRole({
          role: values.role,
          roleName: values.roleName,
          initialScreenFunctionName: finalInitialScreenFunctionName,
          isActive: values.isActive !== undefined ? values.isActive : true,
        });
        
        // 2. メモリに保存された機能情報があれば権限も登録
        if (tempFunctionData && tempFunctionData.apiFunctionNames !== '－') {
          await updateRolePermissions(
            values.role,
            tempFunctionData.apiFunctionNames,
            tempFunctionData.functionWritePermissions
          );
        }
        
        await fetchRoleMasters();
        message.success('ロールを追加しました');
      }
      
      // メモリをクリア
      setTempFunctionData(null);
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('エラー:', error);

      const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました';

      if (errorMessage.includes('既に存在しています')) {
        form.setFields([
          {
            name: 'role',
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
    setTempFunctionData(null); // メモリをクリア
  };

  // 機能管理モーダルを開く（一覧から直接開く場合）
  const handleOpenFunctionModalDirect = async (record: MasterRecord) => {
    try {
      const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
      const roleId = String(record[idField] || '');

      // ロールCDが空の場合
      if (!roleId) {
        console.log('=== Opening Function Modal (Direct - No Role ID) ===');
        console.log('Temp Master:', record);
        setFunctionDialogMode('temporary');
        setEditingFunctionMaster(record);
        setIsFunctionModalVisible(true);
        return;
      }

      // ロールCDがある場合、DBから取得を試みる
      try {
        const { fetchMasterById } = await import('@/services/roleApiService');
        const latestRoleData = await fetchMasterById(roleId);

        // 取得成功：DBの最新データを使用（direct モード）
        const convertedData = {
          masterId: '4',
          role: latestRoleData.roleId || latestRoleData.role,
          roleName: latestRoleData.roleName,
          functionName: latestRoleData.functionName,
          initialScreenFunctionName: latestRoleData.initialScreenFunctionName || null,  // 初期画面機能名
          functionWritePermissions: latestRoleData.functionWritePermissions,
          functionIds: latestRoleData.functionIds || [],
          writableFunctionIds: latestRoleData.writableFunctionIds || [],
          isActive: latestRoleData.isActive,
          updatedAt: latestRoleData.updatedAt,
        };

        console.log('=== Opening Function Modal (Direct - DB Data) ===');
        console.log('Role ID:', roleId);
        console.log('Mode: direct');
        console.log('Latest Role Data:', latestRoleData);

        setFunctionDialogMode('direct');
        setEditingFunctionMaster(convertedData);
        setIsFunctionModalVisible(true);
      } catch (fetchError) {
        // DBに存在しない場合：メモリ保存モード
        console.log('=== Role not found in DB, using temporary mode ===');
        console.log('Role ID:', roleId);
        console.log('Temp Master:', record);
        setFunctionDialogMode('temporary');
        setEditingFunctionMaster(record);
        setIsFunctionModalVisible(true);
      }
    } catch (error) {
      // その他のエラー
      console.error('予期しないエラー:', error);
      message.error(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

  // 機能管理モーダルを開く（追加/編集ダイアログから開く場合）
  const handleOpenFunctionModalTemporary = (record: MasterRecord) => {
    console.log('=== Opening Function Modal (Temporary Mode) ===');
    console.log('Record:', record);
    console.log('Mode: temporary');
    
    setFunctionDialogMode('temporary');
    setEditingFunctionMaster(record);
    setIsFunctionModalVisible(true);
  };

  // 機能管理ダイアログの保存
  const handleFunctionDialogOk = async (
    functionName: string, 
    functionWritePermissions: string,
    apiFunctionNames: string,
    mode: 'direct' | 'temporary'
  ) => {
    if (!editingFunctionMaster || !selectedMasterInfo) {
      message.error('エラーが発生しました');
      setIsFunctionModalVisible(false);
      setEditingFunctionMaster(null);
      return;
    }

    console.log('=== handleFunctionDialogOk ===');
    console.log('Mode:', mode);
    console.log('Function Name (display):', functionName);
    console.log('API Function Names:', apiFunctionNames);
    console.log('Write Permissions:', functionWritePermissions);

    try {
      if (mode === 'direct') {
        // パターン1: 一覧から直接開いた場合 → DBに直接更新
        const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
        const roleId = String(editingFunctionMaster[idField]);
        
        console.log('=== Direct Update to DB ===');
        console.log('Role ID:', roleId);
        console.log('API Function Names (no icons):', apiFunctionNames);
        console.log('Display Function Name (with icons):', functionName);
        
        // 機能権限を更新（権限アイコンなしのAPI用データを使用）
        await updateRolePermissions(roleId, apiFunctionNames, functionWritePermissions);
        
        // 機能が選択されていない場合、initial_screen_function_cd をnullにする
        if (!functionName || functionName === '－') {
          await updateRole(roleId, {
            initialScreenFunctionName: null
          });
        }
        
        await fetchRoleMasters();
        message.success('機能を更新しました');
      } else {
        // パターン2,3: 追加/編集ダイアログから開いた場合 → メモリに一時保存
        console.log('=== Temporary Save to Memory ===');
        console.log('Display Function Name (with icons):', functionName);
        console.log('API Function Names (no icons):', apiFunctionNames);
        
        setTempFunctionData({
          functionName,              // 表示用（権限アイコン付き）
          apiFunctionNames,          // API用（権限アイコンなし）
          functionWritePermissions
        });

        // フォームの機能名フィールドを更新
        form.setFieldsValue({
          functionName: functionName,
          functionWritePermissions: functionWritePermissions
        });

        message.success('機能を設定しました（「保存」ボタンでDBに反映されます）');
      }
    } catch (error) {
      console.error('Error updating function permissions:', error);
      message.error(error instanceof Error ? error.message : 'エラーが発生しました');
    }

    setIsFunctionModalVisible(false);
    setEditingFunctionMaster(null);
  };

  // 機能管理ダイアログのキャンセル
  const handleFunctionDialogCancel = () => {
    setIsFunctionModalVisible(false);
    setEditingFunctionMaster(null);
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
          <Button icon={<UploadOutlined />} onClick={handleUpload} disabled={isReadOnly}>
            CSV<br />アップロード
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            CSV<br />ダウンロード
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={isReadOnly}>
            追加
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={handleActivate}
            disabled={isReadOnly || selectedRowKeys.length === 0}
            style={{
              minWidth: 85,
              backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? token.colorSuccess : undefined,
              borderColor: !isReadOnly && selectedRowKeys.length > 0 ? token.colorSuccess : undefined,
              color: !isReadOnly && selectedRowKeys.length > 0 ? token.colorWhite : undefined,
            }}
          >
            アクティブ
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeactivate}
            disabled={isReadOnly || selectedRowKeys.length === 0}
            style={{
              minWidth: 85,
              backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? token.colorWarning : undefined,
              borderColor: !isReadOnly && selectedRowKeys.length > 0 ? token.colorWarning : undefined,
              color: !isReadOnly && selectedRowKeys.length > 0 ? token.colorWhite : undefined,
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
          
          {/* ロール名フィルター */}
          <Col style={{ width: 150 }}>
            <Select
              placeholder="ロール名"
              value={selectedRoleNameFilter || undefined}
              onChange={(value) => setSelectedRoleNameFilter(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={getRoleNameOptions}
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
          onRow={(record) => ({
            style: {
              backgroundColor: record.isActive === false ? '#D3D3D3' : undefined,
            },
          })}
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
          {/* 1. ロールCD */}
          <Form.Item
            name="role"
            label="ロールCD"
            rules={[{ required: true, message: 'ロールCDを入力してください' }]}
          >
            <Input 
              placeholder="ロールCDを入力してください" 
              disabled={!!editingMaster}
            />
          </Form.Item>

          {/* 2. ロール名 */}
          <Form.Item
            name="roleName"
            label="ロール名"
            rules={[{ required: true, message: 'ロール名を入力してください' }]}
          >
            <Input placeholder="ロール名を入力してください" />
          </Form.Item>

          {/* 3. 機能名（読み取り専用、活性状態、クリック可能） */}
          <Form.Item
            name="functionName"
            label="機能名"
          >
            <Input 
              readOnly={true}
              placeholder="－"
              onClick={() => {
                if (editingMaster) {
                  // 編集時：既存のマスタデータを使用（メモリ保存モード）
                  handleOpenFunctionModalTemporary(editingMaster);
                } else {
                  // 新規追加時：ロールCDが未入力でもダイアログを開く（メモリ保存モード）
                  // フォームの値を取得（未入力の場合は空文字列）
                  const tempMaster = {
                    role: form.getFieldValue('role') || '',  // 未入力でもOK
                    roleName: form.getFieldValue('roleName') || '',  // 未入力でもOK
                    functionName: '－',
                    functionWritePermissions: '',
                    functionIds: [],
                    writableFunctionIds: [],
                    isActive: true,
                  };
                  handleOpenFunctionModalTemporary(tempMaster);
                }
              }}
              style={{ 
                cursor: 'pointer',
                backgroundColor: token.colorBgContainer
              }}
            />
          </Form.Item>

          {/* 4. 初期画面機能名（条件付きSelect） */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.functionName !== currentValues.functionName
            }
          >
            {({ getFieldValue }) => {
              const functionNameValue = getFieldValue('functionName');
              const isFunctionDisabled = !functionNameValue || functionNameValue === '－';

              return (
                <Form.Item
                  name="initialScreenFunctionName"
                  label="初期画面機能名"
                >
                  <Select
                    placeholder="選択してください"
                    disabled={isFunctionDisabled}
                    options={functionOptions}
                    allowClear
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          {/* 5. 状態 */}
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

      {/* 機能管理ダイアログ */}
      <FunctionPermissionDialog
        open={isFunctionModalVisible}
        onOk={handleFunctionDialogOk}
        onCancel={handleFunctionDialogCancel}
        mode={functionDialogMode}
        initialFunctionName={editingFunctionMaster?.functionName ? String(editingFunctionMaster.functionName) : ''}
        initialWritePermissions={editingFunctionMaster?.functionWritePermissions ? String(editingFunctionMaster.functionWritePermissions) : ''}
        initialFunctionIds={editingFunctionMaster?.functionIds ? (editingFunctionMaster.functionIds as string[]) : []}
        initialWritableFunctionIds={editingFunctionMaster?.writableFunctionIds ? (editingFunctionMaster.writableFunctionIds as string[]) : []}
      />
    </div>
  );
}

