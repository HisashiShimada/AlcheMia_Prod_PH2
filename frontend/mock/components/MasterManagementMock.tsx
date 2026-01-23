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
  Tooltip,
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
import Papa from 'papaparse';
import rawMasterTypesData from '../data/master-management-master.json';
import rawOrganizationData from '../data/master-management-organization.json';
import rawDepartmentData from '../data/master-management-department.json';
import rawUsersData from '../data/master-management-users.json';
import rawRoleData from '../data/master-management-role.json';
import rawLaboratoryEquipmentData from '../data/master-management-laboratory-equipment.json';
import rawLaboratoryEquipmentTypeData from '../data/master-management-laboratory-equipment-type.json';
import rawLaboratoryEquipmentVendorData from '../data/master-management-laboratory-equipment-vendor.json';
import rawCreatorData from '../data/master-management-creator.json';
import rawOwnerData from '../data/master-management-owner.json';

const { Text } = Typography;

// 日時フォーマット関数（コンポーネント外に定義）
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

// JSONデータを型付きで取得
const masterTypesData = rawMasterTypesData as MasterTypeData[];
const organizationData = rawOrganizationData as MasterRecord[];
const departmentData = rawDepartmentData as MasterRecord[];
const usersData = rawUsersData as MasterRecord[];
const roleData = rawRoleData as MasterRecord[];
const laboratoryEquipmentData = rawLaboratoryEquipmentData as MasterRecord[];
const laboratoryEquipmentTypeData = rawLaboratoryEquipmentTypeData as MasterRecord[];
const laboratoryEquipmentVendorData = rawLaboratoryEquipmentVendorData as MasterRecord[];
const creatorData = rawCreatorData as MasterRecord[];
const ownerData = rawOwnerData as MasterRecord[];

// JSONデータのマッピング
const masterDataMap: Record<string, MasterRecord[]> = {
  'master-management-organization.json': organizationData,
  'master-management-department.json': departmentData,
  'master-management-users.json': usersData,
  'master-management-role.json': roleData,
  'master-management-laboratory-equipment.json': laboratoryEquipmentData,
  'master-management-laboratory-equipment-type.json': laboratoryEquipmentTypeData,
  'master-management-laboratory-equipment-vendor.json': laboratoryEquipmentVendorData,
  'master-management-creator.json': creatorData,
  'master-management-owner.json': ownerData,
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
export default function MasterManagementMock({ initialMasterId }: MasterManagementMockProps) {
  const { token } = theme.useToken();

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
    // 指定がない場合はCreatorマスタ（masterId='8'）を選択
    return '8';
  });
  const [displayScope, setDisplayScope] = useState<string>('all'); // 表示切替: 'all' | 'own'
  const [fixedFilters, setFixedFilters] = useState<Record<string, string>>({});
  const [form] = Form.useForm();
  
  // CreatorマスタをAPIから取得する関数
  const fetchCreatorMasters = async () => {
    try {
      setLoading(true);
      
      // APIエンドポイント
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = `${apiUrl}/api/v1/master/creator`;
      
      // ヘッダー設定（組織IDを含める）
      const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'; // TODO: 実際の組織IDを取得
      
      console.log('=== Fetching Creator Masters ===');
      console.log('API URL:', apiUrl);
      console.log('Endpoint:', endpoint);
      console.log('Organization ID:', organizationId);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': organizationId,
        },
        credentials: 'include', // Cookieを含める
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success && Array.isArray(result.data)) {
        // APIレスポンスをフロントエンド形式に変換
        const convertedData = result.data.map((item: any) => ({
          masterId: '8', // Creatorマスタ
          creatorId: item.creatorId,
          creatorName: item.creatorName,
          creatorDescription: item.creatorDescription,
          creatorAnnotation: item.creatorAnnotation,
          isActive: item.isActive,
          vendorName: item.vendorName,
          vendorIsActive: item.vendorIsActive,
          instrumentName: item.instrumentName,
          instrumentIsActive: item.instrumentIsActive,
          updatedAt: item.updatedAt,
        }));
        
        setMasters(convertedData);
        console.log('Loaded from API:', convertedData.length, 'records');
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('API fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Creatorマスタの取得に失敗しました: ${errorMessage}`);
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };

  // InstrumentマスタをAPIから取得する関数
  const fetchInstrumentMasters = async () => {
    try {
      setLoading(true);
      
      // APIエンドポイント
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = `${apiUrl}/api/v1/master/instrument`;
      
      // ヘッダー設定（組織IDを含める）
      const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'; // TODO: 実際の組織IDを取得
      
      console.log('=== Fetching Instrument Masters ===');
      console.log('API URL:', apiUrl);
      console.log('Endpoint:', endpoint);
      console.log('Organization ID:', organizationId);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': organizationId,
        },
        credentials: 'include', // Cookieを含める
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
        // APIレスポンスをフロントエンド形式に変換
        const convertedData = result.data.map((item: any) => ({
          masterId: '5', // Instrumentマスタ
          laboratorEquipmentId: item.instrumentId,
          laboratorEquipmentName: item.instrumentName,
          laboratorEquipmentExplan: item.instrumentDescription,
          laboratorEquipmentAnnotation: item.instrumentAnnotation,
          isActive: item.isActive,
          updatedAt: item.updatedAt,
        }));
        
        setMasters(convertedData);
        console.log('Loaded from API:', convertedData.length, 'records');
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('API fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Instrumentマスタの取得に失敗しました: ${errorMessage}`);
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };

  // VendorマスタをAPIから取得する関数
  const fetchVendorMasters = async () => {
    try {
      setLoading(true);
      
      // APIエンドポイント
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = `${apiUrl}/api/v1/master/vendor`;
      
      // ヘッダー設定（組織IDを含める）
      const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'; // TODO: 実際の組織IDを取得
      
      console.log('=== Fetching Vendor Masters ===');
      console.log('API URL:', apiUrl);
      console.log('Endpoint:', endpoint);
      console.log('Organization ID:', organizationId);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': organizationId,
        },
        credentials: 'include', // Cookieを含める
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
        // APIレスポンスをフロントエンド形式に変換
        const convertedData = result.data.map((item: any) => ({
          masterId: '7', // Vendorマスタ
          laboratorEquipmentVendorId: item.vendorId,
          laboratorEquipmentVendorName: item.vendorName,
          laboratorEquipmentVendorExplan: item.vendorDescription,
          laboratorEquipmentVendorAnnotation: item.vendorAnnotation,
          isActive: item.isActive,
          updatedAt: item.updatedAt,
        }));
        
        setMasters(convertedData);
        console.log('Loaded from API:', convertedData.length, 'records');
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('API fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Vendorマスタの取得に失敗しました: ${errorMessage}`);
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };

  // 部署マスタをAPIから取得する関数
  const fetchDepartmentMasters = async () => {
    try {
      setLoading(true);
      
      // APIエンドポイント
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = `${apiUrl}/api/v1/master/department`;
      
      // ヘッダー設定（組織IDを含める）
      const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'; // TODO: 実際の組織IDを取得
      
      console.log('=== Fetching Department Masters ===');
      console.log('API URL:', apiUrl);
      console.log('Endpoint:', endpoint);
      console.log('Organization ID:', organizationId);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': organizationId,
        },
        credentials: 'include', // Cookieを含める
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
        // APIレスポンスをフロントエンド形式に変換
        const convertedData = result.data.map((item: any) => ({
          masterId: '2', // 部署マスタ
          departmentId: item.departmentId,  // APIレスポンスのフィールド名に合わせる
          organizationId: item.organizationId,
          displayName: item.displayName,  // APIレスポンスのフィールド名に合わせる
          isActive: item.isActive,
          updatedAt: item.updatedAt,
        }));
        
        setMasters(convertedData);
        console.log('Loaded from API:', convertedData.length, 'records');
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('API fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`部署マスタの取得に失敗しました: ${errorMessage}`);
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };

  // ロールマスタをAPIから取得する関数
  const fetchRoleMasters = async () => {
    try {
      setLoading(true);
      
      // APIエンドポイント
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = `${apiUrl}/api/v1/master/role`;
      
      // ヘッダー設定（組織IDを含める）
      const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'; // TODO: 実際の組織IDを取得
      
      console.log('=== Fetching Role Masters ===');
      console.log('API URL:', apiUrl);
      console.log('Endpoint:', endpoint);
      console.log('Organization ID:', organizationId);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': organizationId,
        },
        credentials: 'include', // Cookieを含める
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
        // APIレスポンスをフロントエンド形式に変換
        const convertedData = result.data.map((item: any) => ({
          masterId: '4', // ロールマスタ
          role: item.roleId,
          roleName: item.roleName,
          functionName: item.functionName,
          functionWritePermissions: item.functionWritePermissions,
          isActive: item.isActive,
          updatedAt: item.updatedAt,
        }));
        
        setMasters(convertedData);
        console.log('Loaded from API:', convertedData.length, 'records');
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('API fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`ロールマスタの取得に失敗しました: ${errorMessage}`);
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };

  // 選択されたマスタ種別の情報を取得
  const selectedMasterInfo = useMemo(() => {
    return masterTypesData.find(
      m => m.masterId === selectedMasterType
    );
  }, [selectedMasterType]);

  // マスタ種別の選択肢をJSONファイルから生成（ロール管理は除外）
  const masterTypes = useMemo(() => {
    return masterTypesData
      .filter((master) => master.isActive && master.masterId !== '4') // ロール管理を除外
      .map((master) => ({
        value: master.masterId,
        label: master.role ? `${master.displayName}（${master.role}）` : master.displayName,
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

    // DB連携マスタの場合はAPIから取得
    if (selectedMasterInfo.masterId === '8') {
      // Creatorマスタ
      fetchCreatorMasters();
      return;
    } else if (selectedMasterInfo.masterId === '5') {
      // Instrumentマスタ
      fetchInstrumentMasters();
      return;
    } else if (selectedMasterInfo.masterId === '7') {
      // Vendorマスタ
      fetchVendorMasters();
      return;
    } else if (selectedMasterInfo.masterId === '2') {
      // 部署マスタ
      fetchDepartmentMasters();
      return;
    } else if (selectedMasterInfo.masterId === '4') {
      // ロールマスタ
      fetchRoleMasters();
      return;
    }

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
      
      // 表示切替フィルター（自組織の場合、IDの末尾2桁が偶数のみ）
      if (displayScope === 'own') {
        const idString = String(idValue);
        // IDの末尾2桁を取得
        const lastTwoDigits = idString.slice(-2);
        // 数値に変換して偶数チェック
        const lastTwoDigitsNum = parseInt(lastTwoDigits, 10);
        // 数値として解析できて、かつ偶数でない場合は除外
        if (!isNaN(lastTwoDigitsNum) && lastTwoDigitsNum % 2 !== 0) {
          return false;
        }
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
  }, [masters, searchText, fixedFilters, fuzzySearchFields, selectedMasterInfo, displayScope]);

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
    form.setFieldsValue(master);
    setIsModalVisible(true);
  };

  // 一括アクティブ化
  const handleActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('アクティブにするマスタを選択してください');
      return;
    }
    
    console.log('=== 一括アクティブ化デバッグ ===');
    console.log('選択されたキー:', selectedRowKeys);
    console.log('マスタID:', selectedMasterInfo?.masterId);
    console.log('全マスタ:', masters);
    
    Modal.confirm({
      title: '選択したマスタをアクティブにしますか？',
      content: `${selectedRowKeys.length}件のマスタがアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}';
          
          // DB連携マスタの場合はAPI経由で更新
          if (selectedMasterInfo?.masterId === '5') {
            // Instrumentマスタ - 各レコードをAPIで更新
            console.log('Instrumentマスタの一括更新開始');
            for (const key of selectedRowKeys) {
              console.log('処理中のキー:', key);
              const record = masters.find(m => String(m.laboratorEquipmentId) === String(key));
              console.log('見つかったレコード:', record);
              if (record) {
                const response = await fetch(
                  `${apiUrl}/api/v1/master/instrument/${record.laboratorEquipmentId}/status`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Organization-Id': organizationId,
                    },
                    body: JSON.stringify({ isActive: true }),
                  }
                );
                console.log('API応答:', response.status);
                if (!response.ok) {
                  throw new Error(`API Error: ${response.status}`);
                }
              }
            }
            await fetchInstrumentMasters();
          } else if (selectedMasterInfo?.masterId === '7') {
            // Vendorマスタ - 各レコードをAPIで更新
            console.log('Vendorマスタの一括更新開始');
            for (const key of selectedRowKeys) {
              console.log('処理中のキー:', key);
              const record = masters.find(m => String(m.laboratorEquipmentVendorId) === String(key));
              console.log('見つかったレコード:', record);
              if (record) {
                const response = await fetch(
                  `${apiUrl}/api/v1/master/vendor/${record.laboratorEquipmentVendorId}/status`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Organization-Id': organizationId,
                    },
                    body: JSON.stringify({ isActive: true }),
                  }
                );
                console.log('API応答:', response.status);
                if (!response.ok) {
                  throw new Error(`API Error: ${response.status}`);
                }
              }
            }
            await fetchVendorMasters();
          } else if (selectedMasterInfo?.masterId === '8') {
            // Creatorマスタ - 各レコードをAPIで更新
            console.log('Creatorマスタの一括更新開始');
            for (const key of selectedRowKeys) {
              console.log('処理中のキー:', key);
              const record = masters.find(m => String(m.creatorId) === String(key));
              console.log('見つかったレコード:', record);
              if (record) {
                const response = await fetch(
                  `${apiUrl}/api/v1/master/creator/${record.creatorId}/status`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Organization-Id': organizationId,
                    },
                    body: JSON.stringify({ isActive: true }),
                  }
                );
                console.log('API応答:', response.status);
                if (!response.ok) {
                  throw new Error(`API Error: ${response.status}`);
                }
              }
            }
            await fetchCreatorMasters();
          } else if (selectedMasterInfo?.masterId === '2') {
            // 部署マスタ - 各レコードをAPIで更新
            console.log('部署マスタの一括更新開始');
            for (const key of selectedRowKeys) {
              console.log('処理中のキー:', key);
              const record = masters.find(m => String(m.departmentId) === String(key));
              console.log('見つかったレコード:', record);
              if (record) {
                const response = await fetch(
                  `${apiUrl}/api/v1/master/department/${record.departmentId}/status`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Organization-Id': organizationId,
                    },
                    body: JSON.stringify({ isActive: true }),
                  }
                );
                console.log('API応答:', response.status);
                if (!response.ok) {
                  throw new Error(`API Error: ${response.status}`);
                }
              }
            }
            await fetchDepartmentMasters();
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
    Modal.confirm({
      title: '選択したマスタを非アクティブにしますか？',
      content: `${selectedRowKeys.length}件のマスタが非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}';
          
          // DB連携マスタの場合はAPI経由で更新
          if (selectedMasterInfo?.masterId === '5') {
            // Instrumentマスタ - 各レコードをAPIで更新
            for (const key of selectedRowKeys) {
              const record = masters.find(m => String(m.laboratorEquipmentId) === String(key));
              if (record) {
                await fetch(
                  `${apiUrl}/api/v1/master/instrument/${record.laboratorEquipmentId}/status`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Organization-Id': organizationId,
                    },
                    body: JSON.stringify({ isActive: false }),
                  }
                );
              }
            }
            await fetchInstrumentMasters();
          } else if (selectedMasterInfo?.masterId === '7') {
            // Vendorマスタ - 各レコードをAPIで更新
            for (const key of selectedRowKeys) {
              const record = masters.find(m => String(m.laboratorEquipmentVendorId) === String(key));
              if (record) {
                await fetch(
                  `${apiUrl}/api/v1/master/vendor/${record.laboratorEquipmentVendorId}/status`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Organization-Id': organizationId,
                    },
                    body: JSON.stringify({ isActive: false }),
                  }
                );
              }
            }
            await fetchVendorMasters();
          } else if (selectedMasterInfo?.masterId === '8') {
            // Creatorマスタ - 各レコードをAPIで更新
            for (const key of selectedRowKeys) {
              const record = masters.find(m => String(m.creatorId) === String(key));
              if (record) {
                await fetch(
                  `${apiUrl}/api/v1/master/creator/${record.creatorId}/status`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Organization-Id': organizationId,
                    },
                    body: JSON.stringify({ isActive: false }),
                  }
                );
              }
            }
            await fetchCreatorMasters();
          } else if (selectedMasterInfo?.masterId === '2') {
            // 部署マスタ - 各レコードをAPIで更新
            for (const key of selectedRowKeys) {
              const record = masters.find(m => String(m.departmentId) === String(key));
              if (record) {
                await fetch(
                  `${apiUrl}/api/v1/master/department/${record.departmentId}/status`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Organization-Id': organizationId,
                    },
                    body: JSON.stringify({ isActive: false }),
                  }
                );
              }
            }
            await fetchDepartmentMasters();
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
    const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
    
    // マスタ名の取得（部署管理の場合はdisplayNameを使用）
    let masterName: string;
    if (selectedMasterInfo?.masterId === '2') {
      // 部署管理の場合
      masterName = String(record.displayName || 'この部署');
    } else {
      // その他のマスタの場合
      const nameField = Object.keys(selectedMasterInfo?.itemCategories || {})[1];
      masterName = String(record[nameField] || 'このマスタ');
    }

    // 現在のステータスに基づいてアクション決定
    // isActive=false（非活性）→ アクティブ化
    // isActive=true（活性）→ 非アクティブ化
    const currentStatus = record.isActive !== false; // undefinedやtrueの場合はアクティブとみなす
    const actionText = currentStatus ? '非アクティブ' : 'アクティブ';
    const newStatus = !currentStatus;

    Modal.confirm({
      title: `${masterName}を${actionText}にしますか？`,
      content: `このマスタを${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: actionText === '非アクティブ' ? { danger: true } : undefined,
      onOk: async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}';
          
          // Instrument/Vendor/Creatorマスタの場合はAPI経由で更新
          if (selectedMasterInfo?.masterId === '5') {
            // Instrumentマスタ
            const response = await fetch(
              `${apiUrl}/api/v1/master/instrument/${record.laboratorEquipmentId}/status`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Organization-Id': organizationId,
                },
                body: JSON.stringify({ isActive: newStatus }),
              }
            );
            
            if (!response.ok) {
              throw new Error('ステータス更新に失敗しました');
            }
            
            await fetchInstrumentMasters();
            message.success(`${masterName}を${actionText}にしました`);
          } else if (selectedMasterInfo?.masterId === '7') {
            // Vendorマスタ
            const response = await fetch(
              `${apiUrl}/api/v1/master/vendor/${record.laboratorEquipmentVendorId}/status`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Organization-Id': organizationId,
                },
                body: JSON.stringify({ isActive: newStatus }),
              }
            );
            
            if (!response.ok) {
              throw new Error('ステータス更新に失敗しました');
            }
            
            await fetchVendorMasters();
            message.success(`${masterName}を${actionText}にしました`);
          } else if (selectedMasterInfo?.masterId === '8') {
            // Creatorマスタ
            const response = await fetch(
              `${apiUrl}/api/v1/master/creator/${record.creatorId}/status`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Organization-Id': organizationId,
                },
                body: JSON.stringify({ isActive: newStatus }),
              }
            );
            
            if (!response.ok) {
              throw new Error('ステータス更新に失敗しました');
            }
            
            await fetchCreatorMasters();
            message.success(`${masterName}を${actionText}にしました`);
          } else if (selectedMasterInfo?.masterId === '2') {
            // 部署マスタ
            const response = await fetch(
              `${apiUrl}/api/v1/master/department/${record.departmentId}/status`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Organization-Id': organizationId,
                },
                body: JSON.stringify({ isActive: newStatus }),
              }
            );
            
            if (!response.ok) {
              throw new Error('ステータス更新に失敗しました');
            }
            
            await fetchDepartmentMasters();
            message.success(`${masterName}を${actionText}にしました`);
          } else {
            // その他のマスタ（従来のローカル処理）
            setMasters(masters.map(m => 
              m[idField] === record[idField] ? { ...m, isActive: newStatus } : m
            ));
            message.success(`${masterName}を${actionText}にしました`);
          }
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
    
    // DB連携マスタの場合はAPIから再取得
    if (selectedMasterInfo.masterId === '8') {
      // Creatorマスタ
      fetchCreatorMasters();
      return;
    } else if (selectedMasterInfo.masterId === '5') {
      // Instrumentマスタ
      fetchInstrumentMasters();
      return;
    } else if (selectedMasterInfo.masterId === '7') {
      // Vendorマスタ
      fetchVendorMasters();
      return;
    } else if (selectedMasterInfo.masterId === '2') {
      // 部署マスタ
      fetchDepartmentMasters();
      return;
    }
    
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
    if (!selectedMasterInfo) return;
    
    // DB連携マスタ（Department, Instrument, Vendor, Creator）のみCSVアップロード可能
    if (!['2', '5', '7', '8'].includes(selectedMasterInfo.masterId)) {
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
      const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}';
      
      // マスタIDに応じたエンドポイントを決定
      let endpoint = '';
      if (selectedMasterInfo.masterId === '5') {
        endpoint = `${apiUrl}/api/v1/master/instrument/upload-csv`;
      } else if (selectedMasterInfo.masterId === '7') {
        endpoint = `${apiUrl}/api/v1/master/vendor/upload-csv`;
      } else if (selectedMasterInfo.masterId === '8') {
        endpoint = `${apiUrl}/api/v1/master/creator/upload-csv`;
      } else if (selectedMasterInfo.masterId === '2') {
        endpoint = `${apiUrl}/api/v1/master/department/upload-csv`;
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
          'X-Organization-Id': organizationId,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'CSVアップロードに失敗しました');
      }
      
      const result = await response.json();
      console.log('Upload result:', result);
      
      message.success('CSVファイルをアップロードしました');
      
      // データを再取得
      if (selectedMasterInfo.masterId === '5') {
        await fetchInstrumentMasters();
      } else if (selectedMasterInfo.masterId === '7') {
        await fetchVendorMasters();
      } else if (selectedMasterInfo.masterId === '8') {
        await fetchCreatorMasters();
      } else if (selectedMasterInfo.masterId === '2') {
        await fetchDepartmentMasters();
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
    
    // DB連携マスタ（Department, Instrument, Vendor, Creator）の場合はAPI経由
    if (['2', '5', '7', '8'].includes(selectedMasterInfo.masterId)) {
      try {
        setLoading(true);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}';
        
        // マスタIDに応じたエンドポイントを決定
        let endpoint = '';
        let filename = '';
        if (selectedMasterInfo.masterId === '5') {
          endpoint = `${apiUrl}/api/v1/master/instrument/download-csv`;
          filename = 'instruments.csv';
        } else if (selectedMasterInfo.masterId === '7') {
          endpoint = `${apiUrl}/api/v1/master/vendor/download-csv`;
          filename = 'vendors.csv';
        } else if (selectedMasterInfo.masterId === '8') {
          endpoint = `${apiUrl}/api/v1/master/creator/download-csv`;
          filename = 'creators.csv';
        } else if (selectedMasterInfo.masterId === '2') {
          endpoint = `${apiUrl}/api/v1/master/department/download-csv`;
          filename = 'departments.csv';
        }
        
        // フィルタ条件をクエリパラメータに追加
        const params = new URLSearchParams();
        if (searchText.trim()) {
          params.append('search', searchText.trim());
        }
        if (displayScope && displayScope !== 'all') {
          params.append('display_scope', displayScope);
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
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'X-Organization-Id': organizationId,
            'Authorization': 'Bearer dummy-token-for-development', // 開発用ダミートークン
          },
          credentials: 'include', // Cookieを含める
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`CSVダウンロードに失敗しました: ${response.status} - ${errorText}`);
        }
        
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
      const values = await form.validateFields();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const organizationId = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}';
      
      console.log('=== handleModalOk デバッグ ===');
      console.log('選択されたマスタID:', selectedMasterInfo?.masterId);
      console.log('編集中:', editingMaster ? 'はい' : 'いいえ');
      console.log('フォーム値:', values);
      console.log('API URL:', apiUrl);
      console.log('Organization ID:', organizationId);
      
      // Instrument/Vendorマスタの場合はAPI経由で更新
      if (selectedMasterInfo?.masterId === '5') {
        // Instrumentマスタ
        if (editingMaster) {
          // 編集の場合 - PUT
          const response = await fetch(
            `${apiUrl}/api/v1/master/instrument/${editingMaster.laboratorEquipmentId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-Organization-Id': organizationId,
              },
              body: JSON.stringify({
                instrumentName: values.laboratorEquipmentName,
                instrumentDescription: values.laboratorEquipmentExplan,
                instrumentAnnotation: values.laboratorEquipmentAnnotation,
                isActive: values.isActive,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error('更新に失敗しました');
          }
          
          await fetchInstrumentMasters();
          message.success('マスタ情報を更新しました');
        } else {
          // 新規追加の場合 - POST
          const response = await fetch(`${apiUrl}/api/v1/master/instrument`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Organization-Id': organizationId,
            },
            body: JSON.stringify({
              instrumentId: values.laboratorEquipmentId,
              instrumentName: values.laboratorEquipmentName,
              instrumentDescription: values.laboratorEquipmentExplan,
              instrumentAnnotation: values.laboratorEquipmentAnnotation,
              isActive: values.isActive !== undefined ? values.isActive : true,
            }),
          });
          
          if (!response.ok) {
            if (response.status === 409) {
              throw new Error('入力されたIDは既に存在しています');
            }
            throw new Error('追加に失敗しました');
          }
          
          await fetchInstrumentMasters();
          message.success('マスタを追加しました');
        }
      } else if (selectedMasterInfo?.masterId === '7') {
        // Vendorマスタ
        if (editingMaster) {
          // 編集の場合 - PUT
          const response = await fetch(
            `${apiUrl}/api/v1/master/vendor/${editingMaster.laboratorEquipmentVendorId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-Organization-Id': organizationId,
              },
              body: JSON.stringify({
                vendorName: values.laboratorEquipmentVendorName,
                vendorDescription: values.laboratorEquipmentVendorExplan,
                vendorAnnotation: values.laboratorEquipmentVendorAnnotation,
                isActive: values.isActive,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error('更新に失敗しました');
          }
          
          await fetchVendorMasters();
          message.success('マスタ情報を更新しました');
        } else {
          // 新規追加の場合 - POST
          const response = await fetch(`${apiUrl}/api/v1/master/vendor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Organization-Id': organizationId,
            },
            body: JSON.stringify({
              vendorId: values.laboratorEquipmentVendorId,
              vendorName: values.laboratorEquipmentVendorName,
              vendorDescription: values.laboratorEquipmentVendorExplan,
              vendorAnnotation: values.laboratorEquipmentVendorAnnotation,
              isActive: values.isActive !== undefined ? values.isActive : true,
            }),
          });
          
          if (!response.ok) {
            if (response.status === 409) {
              throw new Error('入力されたIDは既に存在しています');
            }
            throw new Error('追加に失敗しました');
          }
          
          await fetchVendorMasters();
          message.success('マスタを追加しました');
        }
      } else if (selectedMasterInfo?.masterId === '8') {
        // Creatorマスタ
        if (editingMaster) {
          // 編集の場合 - PUT
          const response = await fetch(
            `${apiUrl}/api/v1/master/creator/${editingMaster.creatorId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-Organization-Id': organizationId,
              },
              body: JSON.stringify({
                creatorName: values.creatorName,
                creatorDescription: values.creatorDescription,
                creatorAnnotation: values.creatorAnnotation,
                vendorName: values.vendorName,
                instrumentName: values.instrumentName,
                isActive: values.isActive,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error('更新に失敗しました');
          }
          
          await fetchCreatorMasters();
          message.success('マスタ情報を更新しました');
        } else {
          // 新規追加の場合 - POST
          const response = await fetch(`${apiUrl}/api/v1/master/creator`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Organization-Id': organizationId,
            },
            body: JSON.stringify({
              creatorId: values.creatorId,
              creatorName: values.creatorName,
              creatorDescription: values.creatorDescription,
              creatorAnnotation: values.creatorAnnotation,
              vendorName: values.vendorName,
              instrumentName: values.instrumentName,
              isActive: values.isActive !== undefined ? values.isActive : true,
            }),
          });
          
          if (!response.ok) {
            if (response.status === 409) {
              throw new Error('入力されたIDは既に存在しています');
            }
            throw new Error('追加に失敗しました');
          }
          
          await fetchCreatorMasters();
          message.success('マスタを追加しました');
        }
      } else if (selectedMasterInfo?.masterId === '2') {
        // 部署マスタ
        if (editingMaster) {
          // 編集の場合 - PUT
          const response = await fetch(
            `${apiUrl}/api/v1/master/department/${editingMaster.departmentId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-Organization-Id': organizationId,
              },
              body: JSON.stringify({
                departmentName: values.displayName,
                isActive: values.isActive,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error('更新に失敗しました');
          }
          
          await fetchDepartmentMasters();
          message.success('マスタ情報を更新しました');
        } else {
          // 新規追加の場合 - POST
          const response = await fetch(`${apiUrl}/api/v1/master/department`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Organization-Id': organizationId,
            },
            body: JSON.stringify({
              departmentCd: values.departmentId,
              departmentName: values.displayName,
              isActive: values.isActive !== undefined ? values.isActive : true,
            }),
          });
          
          if (!response.ok) {
            if (response.status === 409) {
              throw new Error('入力されたIDは既に存在しています');
            }
            throw new Error('追加に失敗しました');
          }
          
          await fetchDepartmentMasters();
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
          
          // ロール管理画面の場合
          if (selectedMasterInfo?.masterId === '4') {
            // フォームから入力されたロールIDをそのまま使用
            newRecord.masterId = '4';
            newRecord.isActive = true;
            
            // 機能ID、機能名、書込可能機能IDを必ず含める
            newRecord.functionId = values.functionId || '';
            newRecord.functionName = values.functionName || '';
            newRecord.functionWritePermissions = values.functionWritePermissions || '';
          } else {
            // その他のマスタの場合はisActiveをデフォルトでtrueに設定
            newRecord.isActive = values.isActive !== undefined ? values.isActive : true;
          }
          
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
        
        // エラーメッセージのテキスト（部署管理の場合はCD、それ以外はID）
        const fieldLabel = selectedMasterInfo?.masterId === '2' ? 'CD' : 'ID';
        const errorMsg = `入力された${fieldLabel}は既に存在しています`;
        
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

  // Vendor名称の選択肢を生成（Creatorマスタ用）
  const vendorNameOptions = useMemo(() => {
    if (selectedMasterInfo?.masterId !== '8') return [];
    
    return laboratoryEquipmentVendorData
      .map(vendor => ({
        value: String(vendor.laboratorEquipmentVendorName || ''),
        label: String(vendor.laboratorEquipmentVendorName || ''),
      }))
      .filter(option => option.value.trim() !== '');
  }, [selectedMasterInfo]);

  // Instrument名称の選択肢を生成（Creatorマスタ用）
  const instrumentNameOptions = useMemo(() => {
    if (selectedMasterInfo?.masterId !== '8') return [];
    
    return laboratoryEquipmentData
      .map(equipment => ({
        value: String(equipment.laboratorEquipmentName || ''),
        label: String(equipment.laboratorEquipmentName || ''),
      }))
      .filter(option => option.value.trim() !== '');
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
        {selectedMasterInfo?.masterId === '8' && (
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
            // Creatorマスタ（masterId="8"）の場合、VendorとInstrumentの状態チェック
            if (selectedMasterInfo?.masterId === '8') {
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
            return record.isActive === false ? 'active-row' : 'inactive-row';
          }}
        />
      </div>

      {/* マスタ追加/編集モーダル */}
      <Modal
        title={
          selectedMasterInfo?.masterId === '4' 
            ? (editingMaster ? 'ロール編集' : 'ロール追加')
            : selectedMasterInfo?.masterId === '2'
            ? (editingMaster ? '部署編集' : '部署追加')
            : (editingMaster ? 'マスタ編集' : 'マスタ追加')
        }
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
            
            // ロール管理画面（masterId="4"）の場合、機能ID、機能名、書込可能機能IDを除外
            if (selectedMasterInfo.masterId === '4') {
              if (key === 'functionId' || key === 'functionName' || key === 'functionWritePermissions') {
                return null;
              }
            }
            
            // ロール管理画面の場合の特別処理
            if (selectedMasterInfo.masterId === '4') {
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
            }
            
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

            // Creatorマスタ（masterId="8"）の場合、vendorNameとinstrumentNameはSelectを使用（選択のみ）
            if (selectedMasterInfo.masterId === '8') {
              if (key === 'vendorName') {
                return (
                  <Form.Item
                    key={key}
                    name={key}
                    label={category.headerName}
                    rules={isRequired ? [{ required: true, message: `${category.headerName}を選択してください` }] : []}
                  >
                    <Select
                      options={vendorNameOptions}
                      placeholder={`${category.headerName}を選択してください`}
                      disabled={isDisabled}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
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
                      options={instrumentNameOptions}
                      placeholder={`${category.headerName}を選択してください`}
                      disabled={isDisabled}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
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
