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
  Alert,
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
import { formatDateTime } from '@/utils/dateFormatter';
import { getMasterDataConfig, getAllMasterDataConfigs } from '@/types/masterDataTypes';
import type { MasterDataType } from '@/types/masterDataTypes';
import * as masterApi from '@/services/masterApiService';
import type { MasterRecord } from '@/services/masterApiService';

const { Text } = Typography;

/**
 * CSVバリデーションエラーの型定義
 */
interface CsvValidationError {
  row: number;
  field: string;
  message: string;
}

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
 * マスタ管理画面のProps
 */
interface MasterManagementMockProps {
  initialMasterId?: string;
}

/**
 * マスタ管理画面のコンポーネント
 */
export default function MasterManagementMock({ initialMasterId }: MasterManagementMockProps) {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();

  // State管理
  const [masters, setMasters] = useState<MasterRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterRecord | null>(null);
  const [originalEditingData, setOriginalEditingData] = useState<MasterRecord | null>(null);
  const [selectedMasterType, setSelectedMasterType] = useState<string>(() => {
    // initialMasterIdが指定されている場合はそれを使用（部署="5"、ロール="4"）
    if (initialMasterId) {
      return initialMasterId;
    }
    // 指定がない場合はCreatorマスタ（masterId='1'）を選択
    return '1';
  });
  const [displayScope, setDisplayScope] = useState<string>('all'); // 表示切替: 'all' | 'own'
  const [fixedFilters, setFixedFilters] = useState<Record<string, string>>({});
  const [form] = Form.useForm();
  
  // masterIdをMasterDataTypeに変換するヘルパー関数
  const convertMasterIdToType = (masterId: string): MasterDataType => {
    switch (masterId) {
      case '3': return 'instrument';
      case '2': return 'vendor';
      case '1': return 'creator';
      default: 
        throw new Error(
          `マスタID ${masterId} はこの画面では管理できません。` +
          `この画面ではCreator（ID: 1）、Vendor（ID: 2）、Instrument（ID: 3）のみ対応しています。`
        );
    }
  };

  // 統一的なマスタ取得関数
  const fetchMasterData = async (masterIdOrType: string | MasterDataType) => {
    try {
      setLoading(true);
      
      // masterIdの場合はMasterDataTypeに変換
      const masterType = typeof masterIdOrType === 'string' && masterIdOrType.match(/^\d+$/)
        ? convertMasterIdToType(masterIdOrType)
        : (masterIdOrType as MasterDataType);
      
      // display_scopeパラメータを追加してAPI呼び出し
      const data = await masterApi.fetchMasters(masterType, {
        displayScope: displayScope as 'all' | 'own',
      });
      setMasters(data);
      
      console.log('Loaded from API:', masterType, data.length, 'records');
    } catch (error) {
      console.error('Fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`マスタの取得に失敗しました: ${errorMessage}`);
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };
  
  // 選択されたマスタ種別の情報を取得
  const selectedMasterInfo = useMemo(() => {
    // masterDataConfig.tsから新しい構造を取得
    const masterType = convertMasterIdToType(selectedMasterType);
    const config = getMasterDataConfig(masterType);
    
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
  }, [selectedMasterType]);

  // マスタ種別の選択肢をmasterDataConfig.tsから生成（Creator、Vendor、Instrumentの3つのみ）
  const masterTypes = useMemo(() => {
    // Creator（'1'）、Vendor（'2'）、Instrument（'3'）の順序で表示
    const allConfigs = getAllMasterDataConfigs();
    const targetOrder: MasterDataType[] = ['creator', 'vendor', 'instrument'];
    
    return targetOrder
      .map(type => allConfigs.find(config => config.type === type))
      .filter((config): config is NonNullable<typeof config> => config !== undefined)
      .map((config) => ({
        value: config.masterId,
        label: config.displayName,
      }));
  }, []);

  // データの読み込み
  useEffect(() => {
    if (!selectedMasterInfo) return;

    // 一覧をクリア
    setMasters([]);
    setFixedFilters({});
    setSearchText('');
    setSelectedRowKeys([]);

    // すべてDB連携マスタなのでAPIから取得
    fetchMasterData(selectedMasterInfo.masterId);
  }, [selectedMasterInfo]);

  // displayScopeが変更されたらデータを再取得
  useEffect(() => {
    if (!selectedMasterInfo) return;
    fetchMasterData(selectedMasterInfo.masterId);
  }, [displayScope]);

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
        const isFunctionId = /function.*id/i.test(key);
        const isFunctionName = /function.*name/i.test(key);
        const isRoleName = /role.*name/i.test(key);
        const isLabEquipmentName = /laborator.*equipment.*(name|display)/i.test(key);
        const columnWidth = isExplanation ? 420 : (isFunctionId ? 460 : (isFunctionName ? 500 : (isRoleName ? 170 : (isLabEquipmentName ? 180 : 150))));
        
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
            // レンダリング内容を生成
            let content: React.ReactNode;
            
            // 日時フィールドの判定（updatedAtなど）
            if (key.includes('updated') || key.includes('Updated')) {
              content = formatDateTime(String(text || ''));
            }
            // 最初の表示項目を強調表示
            else if (index === 1) {
              content = (
                <Text style={{ 
                  fontWeight: token.fontWeightStrong, 
                  color: record.isActive === false ? token.colorTextDisabled : token.colorPrimary
                }}>
                  {String(text || '')}
                </Text>
              );
            }
            // 機能ID列の場合、色分けして表示（ロール管理画面のみ）
            else if (isFunctionId && selectedMasterInfo?.masterId === '4') {
              // 機能IDを"/"で分割
              const functionIds = String(text || '').split('/').map(id => id.trim()).filter(Boolean);
              
              // 書込可の機能IDを取得（カンマ区切り）
              const writePermissionIds = String(record.functionWritePermissions || '').split(',').map(id => id.trim()).filter(Boolean);
              
              // 各機能IDに色を付けてレンダリング
              content = (
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
            else {
              content = String(text || '');
            }
            
            return content;
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
            danger={record.isActive !== false}
            style={{ minWidth: '80px' }}
          >
            {record.isActive !== false ? '非アクティブ' : 'アクティブ'}
          </Button>
        </Flex>
      ),
    });

    return dynamicColumns;
  }, [selectedMasterInfo, token]);

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
    setOriginalEditingData(master);  // 元データを保存
    
    // Creatorマスタの場合、vendorNameとinstrumentNameをJSON形式に変換
    if (selectedMasterInfo?.masterId === '1') {
      const formValues = { ...master };
      
      // vendorNameをJSON形式に変換
      if (master.vendorName && master.vendorId) {
        formValues.vendorName = JSON.stringify({
          vendorId: master.vendorId,
          vendorName: master.vendorName
        });
      }
      
      // instrumentNameをJSON形式に変換
      if (master.instrumentName && master.instrumentId) {
        formValues.instrumentName = JSON.stringify({
          instrumentId: master.instrumentId,
          instrumentName: master.instrumentName
        });
      }
      
      form.setFieldsValue(formValues);
    } else {
      form.setFieldsValue(master);
    }
    
    setIsModalVisible(true);
  };

  // 一括アクティブ化
  const handleActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('アクティブにするマスタを選択してください');
      return;
    }
    
    modal.confirm({
      title: '選択したマスタをアクティブにしますか？',
      content: `${selectedRowKeys.length}件のマスタがアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          // DB連携マスタの場合はAPI経由で更新
          const DB_CONNECTED_MASTERS = ['3', '2', '1'];
          if (selectedMasterInfo && DB_CONNECTED_MASTERS.includes(selectedMasterInfo.masterId)) {
            await masterApi.batchUpdateMasterStatus(
              convertMasterIdToType(selectedMasterInfo.masterId),
              selectedRowKeys.map(String),
              true
            );
            await fetchMasterData(convertMasterIdToType(selectedMasterInfo.masterId));
          } else {
            // その他のマスタ（ローカル処理）
            setMasters(masters.map(m => {
              const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
              return selectedRowKeys.includes(String(m[idField])) ? { ...m, isActive: true } : m;
            }));
          }
          
          setSelectedRowKeys([]);
          message.success(`${selectedRowKeys.length}件のマスタをアクティブにしました`);
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
      message.warning('非アクティブにするマスタを選択してください');
      return;
    }
    modal.confirm({
      title: '選択したマスタを非アクティブにしますか？',
      content: `${selectedRowKeys.length}件のマスタが非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          // DB連携マスタの場合はAPI経由で更新
          const DB_CONNECTED_MASTERS = ['3', '2', '1'];
          if (selectedMasterInfo && DB_CONNECTED_MASTERS.includes(selectedMasterInfo.masterId)) {
            await masterApi.batchUpdateMasterStatus(
              convertMasterIdToType(selectedMasterInfo.masterId),
              selectedRowKeys.map(String),
              false
            );
            await fetchMasterData(convertMasterIdToType(selectedMasterInfo.masterId));
          } else {
            // その他のマスタ（ローカル処理）
            setMasters(masters.map(m => {
              const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
              return selectedRowKeys.includes(String(m[idField])) ? { ...m, isActive: false } : m;
            }));
          }
          
          setSelectedRowKeys([]);
          message.success(`${selectedRowKeys.length}件のマスタを非アクティブにしました`);
        } catch (error) {
          console.error('エラー:', error);
          message.error(error instanceof Error ? error.message : 'エラーが発生しました');
        }
      },
    });
  };

  // 個別のアクティブ/非アクティブ切り替え
  const handleToggleActive = async (record: MasterRecord) => {
    if (!selectedMasterInfo) return;
    
    const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
    const recordId = String(record[idField]);
    
    // マスタ名の取得
    let masterName: string;
    if (selectedMasterInfo.masterId === '0') {
      masterName = String(record.displayName || 'この部署');
    } else {
      const nameField = Object.keys(selectedMasterInfo.itemCategories)[1];
      masterName = String(record[nameField] || 'このマスタ');
    }

    // 現在のステータスに基づいてアクション決定
    const currentStatus = record.isActive !== false;
    const actionText = currentStatus ? '非アクティブ' : 'アクティブ';
    const newStatus = !currentStatus;

    modal.confirm({
      title: `${masterName}を${actionText}にしますか？`,
      content: `このマスタを${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: actionText === '非アクティブ' ? { danger: true } : undefined,
      onOk: async () => {
        try {
          // 統一的なAPI呼び出し
          await masterApi.updateMasterStatus(
            convertMasterIdToType(selectedMasterInfo.masterId),
            recordId,
            newStatus
          );
          
          // データ再取得
          await fetchMasterData(selectedMasterInfo.masterId);
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
    
    // すべてDB連携マスタなのでAPIから再取得
    fetchMasterData(selectedMasterInfo.masterId);
    message.success('データをリロードしました');
  };

  // CSVアップロード
  const handleUpload = () => {
    if (!selectedMasterInfo) return;
    
    // DB連携マスタ（Instrument, Vendor, Creator）のみCSVアップロード可能
    if (!['3', '2', '1'].includes(selectedMasterInfo.masterId)) {
      message.warning('このマスタはCSVアップロードに対応していません');
      return;
    }
    
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // セッショントークンを取得
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        message.error('セッショントークンが取得できません');
        setLoading(false);
        return;
      }
      
      // マスタIDに応じたエンドポイントを決定
      let endpoint = '';
      if (selectedMasterInfo.masterId === '3') {
        endpoint = `${apiUrl}/master/instrument/upload-csv`;
      } else if (selectedMasterInfo.masterId === '2') {
        endpoint = `${apiUrl}/master/vendor/upload-csv`;
      } else if (selectedMasterInfo.masterId === '1') {
        endpoint = `${apiUrl}/master/creator/upload-csv`;
      } else {
        message.error('このマスタはCSVアップロードに対応していません');
        return;
      }
      
      // FormDataを作成
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('=== CSV Upload ===');
      console.log('Endpoint:', endpoint);
      console.log('File:', file.name);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'CSVアップロードに失敗しました');
      }
      
      const result = await response.json();
      console.log('Upload result:', result);
      
      // レスポンスからデータを取得
      const { successCount, failureCount, errors } = result.data;
      
      // エラーがある場合（ロールバック）
      if (errors && errors.length > 0) {
        // エラーメッセージを構築
        const errorMessages = errors.map((err: CsvValidationError) => 
          `${err.row}行目: ${err.message}`
        ).join('\n');
        
        // モーダルでエラー詳細を表示
        modal.error({
          title: 'CSVアップロードエラー',
          content: (
            <div>
              <p>以下のエラーにより、全てロールバックされました。</p>
              <p>エラー内容を確認して、修正後に再度アップロードしてください。</p>
              <pre style={{ 
                maxHeight: '300px', 
                overflow: 'auto', 
                background: '#f5f5f5', 
                padding: '8px',
                whiteSpace: 'pre-wrap',
                fontSize: '12px',
              }}>
                {errorMessages}
              </pre>
              <p style={{ marginTop: '8px', fontWeight: 'bold' }}>
                失敗件数: {failureCount}件
              </p>
            </div>
          ),
          width: 600,
        });
        
        message.error(`CSVアップロードに失敗しました（${failureCount}件のエラー）`);
      } else if (successCount > 0) {
        // 成功の場合
        message.success(`CSVファイルをアップロードしました（${successCount}件登録）`);
        
        // データを再取得
        await fetchMasterData(selectedMasterInfo.masterId);
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      message.error(error instanceof Error ? error.message : 'CSVアップロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // CSVダウンロード
  const handleDownload = async () => {
    if (!selectedMasterInfo) return;
    
    // DB連携マスタ（Instrument, Vendor, Creator）の場合はAPI経由
    if (['3', '2', '1'].includes(selectedMasterInfo.masterId)) {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        // マスタIDに応じたエンドポイントを決定
        let endpoint = '';
        if (selectedMasterInfo.masterId === '3') {
          endpoint = `${apiUrl}/master/instrument/download-csv`;
        } else if (selectedMasterInfo.masterId === '2') {
          endpoint = `${apiUrl}/master/vendor/download-csv`;
        } else if (selectedMasterInfo.masterId === '1') {
          endpoint = `${apiUrl}/master/creator/download-csv`;
        }
        
      // フィルタ条件をクエリパラメータに追加
      const params = new URLSearchParams();
      
      // 表示切替パラメータを追加
      params.append('display_scope', displayScope);
      
      if (searchText.trim()) {
        params.append('search', searchText.trim());
      }
      // 固定フィルター（searchFixed=trueの項目）もクエリパラメータに追加
      Object.entries(fixedFilters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
        
        const queryString = params.toString();
        const fullUrl = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        console.log('=== CSV Download ===');
        console.log('Endpoint:', fullUrl);
        console.log('Filters:', {
          search: searchText,
          displayScope,
          fixedFilters,
        });
        
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
          message.error('セッショントークンが取得できません');
          setLoading(false);
          return;
        }
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
          credentials: 'include',
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`CSVダウンロードに失敗しました: ${response.status} - ${errorText}`);
        }
        
        // Content-Dispositionヘッダーからファイル名を取得
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'download.csv'; // デフォルト
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        console.log('Download filename:', filename);
        
        // レスポンスをBlobとして取得
        const blob = await response.blob();
        
        // ダウンロードリンクを作成
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        message.success('CSVファイルをダウンロードしました');
      } catch (error) {
        console.error('CSV download error:', error);
        message.error(error instanceof Error ? error.message : 'CSVダウンロードに失敗しました');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // その他のマスタ（ローカル処理）
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
      // バリデーションを実行
      await form.validateFields();
      
      // すべてのフィールド値を取得（変更されていないフィールドも含む）
      const values = form.getFieldsValue(true);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // セッショントークンを取得
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        message.error('セッショントークンが取得できません');
        return;
      }
      
      console.log('=== handleModalOk デバッグ ===');
      console.log('選択されたマスタID:', selectedMasterInfo?.masterId);
      console.log('編集中:', editingMaster ? 'はい' : 'いいえ');
      console.log('フォーム値:', values);
      console.log('API URL:', apiUrl);
      
      // Instrument/Vendorマスタの場合はAPI経由で更新
      if (selectedMasterInfo?.masterId === '3') {
        // Instrumentマスタ
        if (editingMaster) {
          // 編集の場合 - PUT
          const response = await fetch(
            `${apiUrl}/master/instrument/${editingMaster.instrumentId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`,
              },
              credentials: 'include',
              body: JSON.stringify({
                instrumentName: values.instrumentName,
                instrumentDescription: values.instrumentDescription,
                instrumentAnnotation: values.instrumentAnnotation,
                isActive: values.isActive,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error('更新に失敗しました');
          }
          
          await fetchMasterData('instrument');
          message.success('マスタ情報を更新しました');
        } else {
          // 新規追加の場合 - POST
          const response = await fetch(`${apiUrl}/master/instrument`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              instrumentId: values.instrumentId,
              instrumentName: values.instrumentName,
              instrumentDescription: values.instrumentDescription,
              instrumentAnnotation: values.instrumentAnnotation,
              isActive: values.isActive !== undefined ? values.isActive : true,
            }),
          });
          
          if (!response.ok) {
            if (response.status === 409) {
              throw new Error('入力されたIDは既に存在しています');
            }
            throw new Error('追加に失敗しました');
          }
          
          await fetchMasterData('instrument');
          message.success('マスタを追加しました');
        }
      } else if (selectedMasterInfo?.masterId === '2') {
        // Vendorマスタ
        if (editingMaster) {
          // 編集の場合 - PUT
          const response = await fetch(
            `${apiUrl}/master/vendor/${editingMaster.vendorId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`,
              },
              credentials: 'include',
              body: JSON.stringify({
                vendorName: values.vendorName,
                vendorDescription: values.vendorDescription,
                vendorAnnotation: values.vendorAnnotation,
                isActive: values.isActive,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error('更新に失敗しました');
          }
          
          await fetchMasterData('vendor');
          message.success('マスタ情報を更新しました');
        } else {
          // 新規追加の場合 - POST
          const response = await fetch(`${apiUrl}/master/vendor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              vendorId: values.vendorId,
              vendorName: values.vendorName,
              vendorDescription: values.vendorDescription,
              vendorAnnotation: values.vendorAnnotation,
              isActive: values.isActive !== undefined ? values.isActive : true,
            }),
          });
          
          if (!response.ok) {
            if (response.status === 409) {
              throw new Error('入力されたIDは既に存在しています');
            }
            throw new Error('追加に失敗しました');
          }
          
          await fetchMasterData('vendor');
          message.success('マスタを追加しました');
        }
      } else if (selectedMasterInfo?.masterId === '1') {
        // Creatorマスタ
        // JSON形式の値を解析
        let vendorData = null;
        let instrumentData = null;
        
        // vendorNameの処理
        if (values.vendorName) {
          // JSON形式かどうかをチェック（'{' で始まるかどうか）
          if (typeof values.vendorName === 'string' && values.vendorName.trim().startsWith('{')) {
            try {
              vendorData = JSON.parse(values.vendorName);
            } catch (e) {
              console.error('vendorNameのJSON解析エラー:', e);
            }
          }
          
          // JSON解析に失敗した場合、またはJSON形式でない場合は元データから取得
          if (!vendorData && editingMaster && originalEditingData && originalEditingData.vendorName) {
            vendorData = {
              vendorId: originalEditingData.vendorId,
              vendorName: originalEditingData.vendorName
            };
          }
        }
        
        // instrumentNameの処理
        if (values.instrumentName) {
          // JSON形式かどうかをチェック（'{' で始まるかどうか）
          if (typeof values.instrumentName === 'string' && values.instrumentName.trim().startsWith('{')) {
            try {
              instrumentData = JSON.parse(values.instrumentName);
            } catch (e) {
              console.error('instrumentNameのJSON解析エラー:', e);
            }
          }
          
          // JSON解析に失敗した場合、またはJSON形式でない場合は元データから取得
          if (!instrumentData && editingMaster && originalEditingData && originalEditingData.instrumentName) {
            instrumentData = {
              instrumentId: originalEditingData.instrumentId,
              instrumentName: originalEditingData.instrumentName
            };
          }
        }
        
        if (editingMaster) {
          // 編集の場合 - PUT
          const response = await fetch(
            `${apiUrl}/master/creator/${editingMaster.creatorId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`,
              },
              credentials: 'include',
              body: JSON.stringify({
                creatorName: values.creatorName,
                creatorDescription: values.creatorDescription,
                creatorAnnotation: values.creatorAnnotation,
                vendorId: vendorData?.vendorId || null,
                vendorName: vendorData?.vendorName || null,
                instrumentId: instrumentData?.instrumentId || null,
                instrumentName: instrumentData?.instrumentName || null,
                isActive: values.isActive,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error('更新に失敗しました');
          }
          
          await fetchMasterData('creator');
          message.success('マスタ情報を更新しました');
        } else {
          // 新規追加の場合 - POST
          const response = await fetch(`${apiUrl}/master/creator`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              creatorId: values.creatorId,
              creatorName: values.creatorName,
              creatorDescription: values.creatorDescription,
              creatorAnnotation: values.creatorAnnotation,
              vendorId: vendorData?.vendorId || null,
              vendorName: vendorData?.vendorName || null,
              instrumentId: instrumentData?.instrumentId || null,
              instrumentName: instrumentData?.instrumentName || null,
              isActive: values.isActive !== undefined ? values.isActive : true,
            }),
          });
          
          if (!response.ok) {
            if (response.status === 409) {
              throw new Error('入力されたIDは既に存在しています');
            }
            throw new Error('追加に失敗しました');
          }
          
          await fetchMasterData('creator');
          message.success('マスタを追加しました');
        }
      } else {
        // その他のマスタ（従来のローカル処理）
        if (editingMaster) {
          // 編集の場合
          const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
          setMasters(masters.map(m => 
            m[idField] === editingMaster[idField] ? { ...m, ...values } : m
          ));
          message.success('マスタ情報を更新しました');
        } else {
          // 新規追加の場合
          const newRecord: MasterRecord = { ...values };
  
          newRecord.isActive = values.isActive !== undefined ? values.isActive : true;
          setMasters([...masters, newRecord]);
          message.success('マスタを追加しました');
        }
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('エラー:', error);
      
      // エラーメッセージを取得
      const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました';
      
      // 409エラー（ID重複）の場合
      if (errorMessage.includes('既に存在しています')) {
        // IDフィールド名を取得
        const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
        
        // エラーメッセージのテキスト
        const errorMsg = '入力されたIDは既に存在しています';
        
        // フォームのIDフィールドにエラーを設定（背景色が薄い赤色になる）
        form.setFields([
          {
            name: idField,
            errors: [errorMsg],
          },
        ]);
        
        // エラーメッセージを表示
        message.error(errorMsg);
        
        // モーダルは閉じない（ユーザーがIDを修正できるようにする）
        return;
      }
      
      // その他のエラー
      message.error(errorMessage);
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

  // Vendor/Instrument選択肢（Creatorマスタ用）
  const [vendorOptions, setVendorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [instrumentOptions, setInstrumentOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Creatorマスタ選択時にVendor/Instrument選択肢を取得
  useEffect(() => {
    if (selectedMasterInfo?.masterId !== '1') return;

    const fetchOptions = async () => {
      try {
        // Vendor一覧を取得（会社IDでフィルタリング）
        const vendors = await masterApi.fetchMasters('vendor', {
          displayScope: 'all',
        });
        setVendorOptions(
          vendors
            .filter((v: MasterRecord) => v.isActive !== false)
            .map((v: MasterRecord) => ({
              value: JSON.stringify({
                vendorId: v.vendorId,
                vendorName: v.vendorName
              }),
              label: String(v.vendorName || ''),
            }))
            .filter(opt => {
              try {
                const data = JSON.parse(opt.value);
                return data.vendorName && data.vendorName.trim() !== '';
              } catch {
                return false;
              }
            })
        );

        // Instrument一覧を取得（会社IDでフィルタリング）
        const instruments = await masterApi.fetchMasters('instrument', {
          displayScope: 'all',
        });
        setInstrumentOptions(
          instruments
            .filter((i: MasterRecord) => i.isActive !== false)
            .map((i: MasterRecord) => ({
              value: JSON.stringify({
                instrumentId: i.instrumentId,
                instrumentName: i.instrumentName
              }),
              label: String(i.instrumentName || ''),
            }))
            .filter(opt => {
              try {
                const data = JSON.parse(opt.value);
                return data.instrumentName && data.instrumentName.trim() !== '';
              } catch {
                return false;
              }
            })
        );
      } catch (error) {
        console.error('選択肢取得エラー:', error);
      }
    };

    fetchOptions();
  }, [selectedMasterInfo]);

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
        {/* 左側：マスタ選択と表示切替（initialMasterIdが指定されていない場合のみ表示） */}
        {!initialMasterId && (
          <Flex gap="middle" align="center">
            <Text strong style={{ fontSize: token.fontSizeLG }}>マスタ選択：</Text>
            <Select
              style={{ width: 300 }}
              value={selectedMasterType}
              onChange={setSelectedMasterType}
              options={masterTypes}
            />
            <Text strong style={{ fontSize: token.fontSizeLG, marginLeft: 16 }}>表示切替：</Text>
            <Select
              style={{ width: 200 }}
              value={displayScope}
              onChange={setDisplayScope}
              options={[
                { value: 'all', label: '全体' },
                { value: 'own', label: '自組織' },
              ]}
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

        {/* Creatorマスタの場合のみ注意書きを表示 */}
        {selectedMasterInfo?.masterId === '1' && (
          <Alert
            title={<strong>Creatorに紐づくVendorまたはInstrumentに不備がある場合、該当レコードは強調表示されます。</strong>}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          key={selectedMasterType}
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
          rowClassName={(record) => {
            // Creatorマスタ（masterId="1"）の場合、VendorとInstrumentの状態チェック
            if (selectedMasterInfo?.masterId === '1') {
              const vendorName = record.vendorName as string | undefined;
              const instrumentName = record.instrumentName as string | undefined;
              const vendorIsActive = record.vendorIsActive as boolean | null | undefined;
              const instrumentIsActive = record.instrumentIsActive as boolean | null | undefined;
              
              // ①Vendor名称 or Instrument名称が空白の場合
              const isVendorEmpty = !vendorName || vendorName.trim() === '';
              const isInstrumentEmpty = !instrumentName || instrumentName.trim() === '';
              
              // ②Vendor名称 or Instrument名称に紐づくマスタが非アクティブの場合
              const isVendorInactive = vendorName && vendorName.trim() !== '' && vendorIsActive === false;
              const isInstrumentInactive = instrumentName && instrumentName.trim() !== '' && instrumentIsActive === false;
              
              // ①か②のどちらかに該当すれば警告行として赤背景
              if (isVendorEmpty || isInstrumentEmpty || isVendorInactive || isInstrumentInactive) {
                return 'warning-row';
              }
            }
            
            // 通常のアクティブ/非アクティブ判定
            return record.isActive === false ? 'inactive-row' : 'active-row';
          }}
        />
      </div>

      {/* マスタ追加/編集モーダル */}
      <Modal
        title={
          selectedMasterInfo?.masterId === '0' 
            ? ''
            : (editingMaster ? 'マスタ編集' : 'マスタ追加')
        }
        // title={
        //   selectedMasterInfo?.masterId === '2' 
        //     ? (editingMaster ? 'マスタ編集' : 'マスタ追加')
        //     : ''
        // }
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
            
            // ダイアログでは、追加時はaddable、編集時はupdateがtrueのフィールドのみ表示
            // （両方falseの場合は表示しない、例: updatedAt）
            const shouldShowInDialog = editingMaster ? category.update : category.addable;
            if (!shouldShowInDialog) return null;
            
            // IDフィールド（最初のフィールド）の判定
            const isIdField = index === 0;
            
            // 活性/非活性の判定
            let isDisabled: boolean;
            if (isIdField) {
              // IDフィールドの場合: 編集時は非活性、追加時は活性
              isDisabled = !!editingMaster;
            } else {
              // その他のフィールドの場合: 従来のロジック
              isDisabled = editingMaster ? !category.update : !category.addable;
            }
            
            // 必須項目の判定（IDフィールドは追加時に必須）
            const isRequired = isIdField ? !editingMaster : (category.addable && !editingMaster);

            // Creatorマスタ（masterId="1"）の場合、vendorNameとinstrumentNameはSelectを使用（選択のみ）
            if (selectedMasterInfo.masterId === '1') {
              if (key === 'vendorName') {
                return (
                  <Form.Item
                    key={key}
                    name={key}
                    label={category.headerName}
                    rules={isRequired ? [{ required: true, message: `${category.headerName}を選択してください` }] : []}
                  >
                    <Select
                      options={vendorOptions}
                      placeholder={`${category.headerName}を選択してください`}
                      disabled={isDisabled}
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                );
              }
              
              if (key === 'instrumentName') {
                return (
                  <Form.Item
                    key={key}
                    name={key}
                    label={category.headerName}
                    rules={isRequired ? [{ required: true, message: `${category.headerName}を選択してください` }] : []}
                  >
                    <Select
                      options={instrumentOptions}
                      placeholder={`${category.headerName}を選択してください`}
                      disabled={isDisabled}
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                );
              }
            }

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
          
          {/* 状態フィールドを表示 */}
          {(
            <Form.Item name="isActive" label="状態">
              <Select
                options={[
                  { value: true, label: 'アクティブ' },
                  { value: false, label: '非アクティブ' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <style jsx global>{`
        /* ID重複エラー時の背景色（薄い赤色） */
        .ant-form-item-has-error .ant-input {
          background-color: #ffcccc !important;
        }
        .ant-form-item-has-error .ant-input:focus {
          background-color: #ffcccc !important;
        }
        
        .warning-row td {
          background-color: #ffe6e6 !important;
        }
        .warning-row:hover td {
          background-color: #ffcccc !important;
        }
        .inactive-row td {
          background-color: #d3d3d3 !important;
        }
        .inactive-row:hover td {
          background-color: #c0c0c0 !important;
        }
        .active-row td {
          background-color: #fff !important;
        }
        .active-row:hover td {
          background-color: #f5f5f5 !important;
        }
        
        /* 書込可チェックボックスの色（チェック時：緑） */
        .write-permission-checked .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #52c41a !important;
          border-color: #52c41a !important;
        }
        .write-permission-checked .ant-checkbox-checked:hover .ant-checkbox-inner {
          background-color: #73d13d !important;
          border-color: #73d13d !important;
        }
        
        /* 書込可チェックボックスの色（未チェック時：青） */
        .write-permission-unchecked .ant-checkbox-inner {
          border-color: #1890ff !important;
        }
        .write-permission-unchecked .ant-checkbox:hover .ant-checkbox-inner {
          border-color: #40a9ff !important;
        }
        
        /* 書込可チェックボックスの色（非活性時：グレー） */
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
